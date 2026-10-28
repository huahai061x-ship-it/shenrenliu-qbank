import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyProduction, renderSummary, providers} from '../scripts/verify-production-core.mjs';

const expected = 'abc123', siteURL = 'https://example.org/qbank/';
const config = {expected, siteURL, sleep: async () => {}, pollLimit: 2};
const json = (value, status = 200) => new Response(JSON.stringify(value), {status});
const page = '<head><base data-release-root href="../"><meta name="build-version" content="abc123">' +
  '<link href="assets/abc123/styles.css" rel="stylesheet"><script src="assets/abc123/app.js"></script>' +
  '<script src="assets/abc123/backup-core.js"></script></head>';
function body(file) {
  if (file.endsWith('release.json')) return JSON.stringify({schemaVersion: 1, version: expected,
    page: `releases/${expected}.html`, assetBase: `assets/${expected}/`});
  if (file === '/ShenRenLiu/latest.html') return '<body data-mobile-recovery>';
  if (file.endsWith('latest.html')) return '<body data-latest-entry>';
  if (file.endsWith('.html')) return page;
  return '/* ShenRenLiu build: abc123 */\ncontent';
}
function harness({post, sample, http, poll} = {}) {
  const calls = [], counts = new Map(), measurements = new Map();
  const fetchFn = async (url, options = {}) => {
    url = new URL(url); calls.push({url: url.href, options});
    if (url.hostname !== 'api.globalping.io') {
      return http?.(url, options) || new Response(body(url.pathname));
    }
    if (options.method === 'POST') {
      const request = JSON.parse(options.body), file = request.measurementOptions.request.path;
      const attempt = (counts.get(file) || 0) + 1; counts.set(file, attempt);
      const override = post?.({file, attempt, request});
      if (override) return override;
      const id = String(measurements.size + 1);
      let selected = typeof request.locations === 'string' ? measurements.get(request.locations).selected :
        request.locations.map(l => l.asn);
      measurements.set(id, {file, selected, attempt});
      return json({id}, 202);
    }
    const id = url.pathname.split('/').at(-1), measurement = measurements.get(id);
    const results = measurement.selected.map(asn => ({probe: {country: 'CN', city: 'test', asn, network: 'test'},
      result: {status: 'finished', statusCode: 200, rawBody: body(measurement.file),
        ...sample?.({...measurement, asn})}}));
    return poll?.({id, measurement, results}) || json({status: 'finished', results});
  };
  return {fetchFn, calls, counts};
}
async function run(overrides, options = {}) {
  const mock = harness(overrides);
  return {report: await verifyProduction({...config, fetchFn: mock.fetchFn, ...options}), ...mock};
}

test('all: exact release, page resources and all three mainland providers pass', async () => {
  const {report, calls} = await run();
  assert.deepEqual(report.failures, []);
  assert.equal(report.deployment.status, 'passed');
  assert.equal(report.mainland.status, 'passed');
  assert.equal(report.mainland.routes.length, 5);
  assert.equal(report.mainland.measurements.length, 5);
  assert(calls.some(c => new URL(c.url).pathname === '/qbank/assets/abc123/backup-core.js'));
  assert(calls.some(c => new URL(c.url).pathname === '/qbank/assets/abc123/styles.css'));
  for (const route of report.mainland.routes) assert.deepEqual(route.providers.map(p => p.asn), providers);
});

test('historical failure: TLS then 422 then successful fresh probe recovers without losing evidence', async () => {
  const {report, calls} = await run({
    sample: ({file, attempt, asn}) => file.endsWith('/abc123.html') && attempt === 1 && asn === 4134 ?
      {status: 'failed', statusCode: null, failureSource: 'target', error: 'TLS handshake timeout'} : {},
    post: ({file, attempt}) => file.endsWith('/abc123.html') && attempt === 2 ?
      json({error: {message: 'No matching IPv4 probes available.'}}, 422) : null,
  });
  assert.deepEqual(report.failures, []);
  assert.equal(report.mainland.status, 'passed_with_retries');
  const entries = report.mainland.measurements.filter(m => m.file.endsWith('/abc123.html'));
  assert.equal(entries.length, 3);
  assert.equal(entries[0].samples[0].kind, 'connection_error');
  assert.equal(entries[1].error.kind, 'probe_unavailable');
  assert.deepEqual(entries[2].requestedProviders, [4134]);
  const retries = calls.filter(c => c.options.method === 'POST').map(c => JSON.parse(c.options.body));
  assert.deepEqual(retries.find(c => c.measurementOptions.request.path.endsWith('/abc123.html') && Array.isArray(c.locations))?.locations,
    [{country: 'CN', asn: 4134, limit: 1}]);
});

test('persistent telecom timeout fails only that route, and remaining routes still run', async () => {
  const {report} = await run({sample: ({file, asn}) => file === '/qbank/latest.html' && asn === 4134 ?
    {status: 'failed', statusCode: null, failureSource: 'target', error: 'TCP timeout'} : {}}, {scope: 'mainland'});
  assert.equal(report.mainland.status, 'failed');
  assert.equal(report.deployment.status, 'not_checked');
  assert.equal(report.failures.length, 1);
  assert.match(report.failures[0], /latest.html AS4134 \[connection_error\]/);
  assert.equal(report.mainland.routes.at(-1).providers.every(p => p.matched), true);
});

test('persistent 422 does not skip later routes or turn missing samples green', async () => {
  const {report} = await run({post: ({file}) => file.endsWith('release.json') ?
    json({error: {message: 'No matching IPv4 probes available.'}}, 422) : null});
  assert.equal(report.deployment.status, 'passed');
  assert.equal(report.mainland.status, 'not_verified');
  assert.equal(report.failures.length, 3);
  assert.equal(report.mainland.measurements.filter(m => m.error).length, 3);
  assert.equal(report.mainland.routes.at(-1).providers.every(p => p.matched), true);
});

test('poll failure retains measurement link and continues other routes', async () => {
  const {report} = await run({poll: ({measurement}) => measurement.file.endsWith('latest.html') ? json({}, 503) : null}, {scope: 'mainland'});
  assert.equal(report.mainland.status, 'not_verified');
  assert(report.mainland.measurements.find(m => m.error)?.url);
  assert.equal(report.mainland.routes.at(-1).providers.every(p => p.matched), true);
});

test('unfinished measurement with apparently correct partial results never passes', async () => {
  const {report} = await run({poll: ({results}) => json({status: 'in-progress', results})}, {scope: 'mainland'});
  assert.equal(report.mainland.status, 'not_verified');
  assert.equal(report.failures.length, 15);
  assert(report.mainland.measurements.every(m => m.error.kind === 'polling_timeout'));
  assert(report.mainland.measurements.every(m => m.samples.every(s => !s.matched)));
});

test('wrong ASN or non-CN sample cannot substitute for the required carrier', async () => {
  const {report} = await run({poll: ({results}) => {
    results[0].probe.country = 'US';
    return json({status: 'finished', results});
  }}, {scope: 'mainland'});
  assert(report.failures.length > 0);
  assert.equal(report.mainland.status, 'not_verified');
});

test('HTTP 404 and wrong content are separately classified, not connection errors', async () => {
  const {report} = await run({sample: ({file, asn}) => file.endsWith('release.json') ?
    asn === 4134 ? {statusCode: 404} : {rawBody: '{"version":"old","note":"abc123"}'} : {}}, {scope: 'mainland'});
  assert.equal(report.mainland.status, 'failed');
  const carriers = report.mainland.routes[0].providers;
  assert.deepEqual(carriers[0].kinds, ['http_error']);
  assert.deepEqual(carriers[1].kinds, ['content_mismatch']);
});

test('deployment scope checks all resource paths and never contacts Globalping', async () => {
  const {report, calls} = await run({http: url => url.pathname.endsWith('/styles.css') ? new Response('not found', {status: 404}) : null},
    {scope: 'deployment', siteURL: 'https://example.org/qbank'});
  assert.equal(report.base, siteURL);
  assert.equal(report.deployment.status, 'failed');
  assert.equal(report.mainland.status, 'not_checked');
  assert(report.failures.some(f => f.includes('styles.css') && f.includes('http_error')));
  assert(!calls.some(c => c.url.includes('api.globalping.io')));
});

test('deployment rejects unversioned asset references and incorrect release metadata', async () => {
  const {report} = await run({http: url => url.pathname.endsWith('/release.json') ?
    new Response('{"version":"old","note":"abc123"}') : url.pathname.endsWith('/abc123.html') ?
    new Response(page.replace('assets/abc123/backup-core.js', '../backup-core.js')) : null}, {scope: 'deployment'});
  assert.equal(report.deployment.status, 'failed');
  assert(report.failures.some(f => f.includes('content_mismatch')));
  assert(report.failures.some(f => f.includes('页面资源未绑定')));
});

test('configuration errors make no network calls and summary keeps real line breaks', async () => {
  const {report, calls} = await run({}, {expected: ''});
  assert.equal(calls.length, 0);
  assert.equal(report.configurationError.kind, 'configuration_error');
  assert(report.failures.length > 0);
  assert(renderSummary(report).includes('\n\n'));
  assert(!renderSummary(report).includes('\\n'));
});

test('evidence is saved during execution and finalized after all routes', async () => {
  const snapshots = [];
  const {report} = await run({}, {scope: 'mainland', save: async value => snapshots.push(structuredClone(value))});
  assert.equal(snapshots[0].mainland.status, 'in_progress');
  assert(snapshots.some(s => s.mainland.measurements.length === 1));
  assert.deepEqual(snapshots.at(-1), report);
});

test('polling deadline bounds slow responses and keeps unfinished samples unverified', async () => {
  let time = 0;
  const {report, calls} = await run({poll: ({results}) => json({status: 'in-progress', results})},
    {scope: 'mainland', now: () => time, sleep: async () => { time += 30000; }, pollLimit: 25});
  assert.equal(report.mainland.status, 'not_verified');
  assert.equal(calls.filter(c => new URL(c.url).hostname === 'api.globalping.io' && !c.options.method).length, 15);
  assert(report.mainland.measurements.every(m => m.error.kind === 'polling_timeout'));
});

test('CLI writes evidence and exits nonzero on invalid scope', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'qbank-verify-'));
  try {
    const child = spawnSync(process.execPath, ['scripts/verify-production.mjs'], {encoding: 'utf8',
      env: {...process.env, EXPECTED_BUILD: expected, VERIFY_SCOPE: 'invalid', VERIFY_OUTPUT: output}});
    assert.equal(child.status, 1);
    const report = JSON.parse(await readFile(path.join(output, 'production-verification.json'), 'utf8'));
    assert.equal(report.configurationError.kind, 'configuration_error');
    assert((await readFile(path.join(output, 'summary.md'), 'utf8')).includes('校验配置错误'));
  } finally { await rm(output, {recursive: true, force: true}); }
});
