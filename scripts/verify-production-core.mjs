export const providers = [4134, 4837, 9808];
const recovery = 'https://huahai061x-ship-it.github.io/ShenRenLiu/latest.html';
const agents = {
  desktop: 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36',
  quark: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36 Quark/7.4.5.681',
  wechat: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.60',
  qq: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36 QQ/9.1.30 MQQBrowser/6.2',
};
const labels = {
  content_mismatch: '内容或发布版本不符', http_error: '页面 HTTP 错误',
  connection_error: '目标连接/TLS 超时或失败', probe_unavailable: '所需探测节点不可用',
  probe_error: '探测节点执行失败', service_error: '探测服务请求失败',
  polling_timeout: '探测服务未在期限内完成', configuration_error: '校验配置错误',
};
class CheckError extends Error {
  constructor(kind, message, status = null) { super(message); this.kind = kind; this.status = status; }
}
const describe = error => ({kind: error.kind || 'service_error', message: error.message, status: error.status || null});

export async function verifyProduction({expected, siteURL, scope = 'all', fetchFn = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  log = () => {}, save = async () => {}, attempts = 3, pollLimit = 25} = {}) {
  const report = {schemaVersion: 2, expected, base: siteURL, scope, checkedAt: new Date(now()).toISOString(),
    deployment: {status: 'not_checked', hadRetries: false}, runnerChecks: [],
    mainland: {status: 'not_checked', hadRetries: false, measurements: [], routes: []}, failures: []};
  let base;
  try {
    if (!expected || !/^[a-zA-Z0-9._-]{1,100}$/.test(expected)) throw Error('EXPECTED_BUILD 必须是合法发布版本');
    if (!['all', 'deployment', 'mainland'].includes(scope)) throw Error('VERIFY_SCOPE 必须是 all、deployment 或 mainland');
    base = new URL(siteURL);
    if (base.protocol !== 'https:' || base.search || base.hash) throw Error('SITE_URL 必须是无查询参数的 HTTPS 网站目录');
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    report.base = base.href;
  } catch (error) {
    report.configurationError = describe(new CheckError('configuration_error', error.message));
    report.failures.push('校验配置错误：' + error.message);
    await save(report);
    return report;
  }
  const release = {file: 'release.json', kind: 'release', name: '发布批次'};
  const fixed = {file: `releases/${expected}.html`, kind: 'page', name: '版本固定页面'};
  const app = {file: `assets/${expected}/app.js`, kind: 'asset', name: '脚本批次'};
  const latest = {file: 'latest.html', kind: 'latest', name: '最新入口'};
  const rescue = {file: recovery, kind: 'recovery', name: '旧缓存独立入口'};
  const routes = [release, latest, rescue, fixed, app];

  function matches(text, route) {
    if (route.kind === 'release') {
      try {
        const value = JSON.parse(text);
        return value.schemaVersion === 1 && value.version === expected &&
          value.page === fixed.file && value.assetBase === `assets/${expected}/`;
      } catch { return false; }
    }
    if (route.kind === 'page') return text.includes(`name="build-version" content="${expected}"`);
    if (route.kind === 'asset') return text.startsWith(`/* ShenRenLiu build: ${expected} */`);
    return text.includes(route.kind === 'latest' ? 'data-latest-entry' : 'data-mobile-recovery');
  }
  async function request(url, options = {}, service = false) {
    const {timeoutMs = 30000, ...requestOptions} = options;
    try { return await fetchFn(url, {...requestOptions, signal: AbortSignal.timeout(timeoutMs)}); }
    catch (error) { throw new CheckError(service ? 'service_error' : 'connection_error', error.message); }
  }
  async function runnerCheck(route, agent = agents.desktop) {
    const entry = {name: route.name, file: route.file, attempts: [], matched: false};
    report.runnerChecks.push(entry);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const url = new URL(route.file, base);
      url.searchParams.set('_verify', String(now()));
      try {
        const response = await request(url, {cache: 'no-store', headers: {'User-Agent': agent, 'Cache-Control': 'no-cache'}});
        if (response.status !== 200) throw new CheckError('http_error', `HTTP ${response.status}`, response.status);
        const text = await response.text();
        if (!matches(text, route)) throw new CheckError('content_mismatch', '返回内容或发布版本不符');
        entry.attempts.push({url: url.href, status: 200, matched: true});
        Object.assign(entry, {url: url.href, status: 200, matched: true});
        await save(report);
        return text;
      } catch (error) {
        entry.attempts.push({url: url.href, error: describe(error)});
        await save(report);
        if (attempt + 1 < attempts) { report.deployment.hadRetries = true; await sleep(3000 * (attempt + 1)); }
      }
    }
    const error = entry.attempts.at(-1).error;
    entry.error = error;
    report.failures.push(`网站检查失败：${route.name} [${error.kind}] ${error.message}`);
  }

  if (scope !== 'mainland') {
    report.deployment.status = 'in_progress';
    await save(report);
    const firstFailure = report.failures.length;
    for (const [name, agent] of Object.entries(agents)) await runnerCheck({...latest, name: name + ' 最新入口'}, agent);
    for (const route of [rescue, release, {file: 'index.html', kind: 'page', name: '网站首页'}, app]) await runnerCheck(route);
    const html = await runnerCheck(fixed);
    // Resolve references using the same resource root as the pinned page.
    if (html) {
      const root = new URL('../', new URL(fixed.file, base));
      if (!html.includes('<base data-release-root href="../">')) {
        report.failures.push('网站检查失败：固定页面缺少正确的资源根路径');
      } else {
        const refs = new Set([...html.matchAll(/\b(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g)].map(m => m[1]));
        if (!refs.size) report.failures.push('网站检查失败：固定页面没有引用 JS/CSS');
        for (const ref of refs) {
          const target = new URL(ref, root);
          if (!target.href.startsWith(new URL(`assets/${expected}/`, base).href)) {
            report.failures.push('网站检查失败：页面资源未绑定本次版本：' + target.href);
            continue;
          }
          if (target.href === new URL(app.file, base).href) continue;
          await runnerCheck({name: '页面资源 ' + ref, file: target.href, kind: 'asset'});
        }
      }
    }
    report.deployment.status = report.failures.length > firstFailure ? 'failed' :
      report.deployment.hadRetries ? 'passed_with_retries' : 'passed';
  }

  async function measurement(route, locations, entry) {
    const url = new URL(route.file, base);
    const body = {type: 'http', target: url.hostname, locations, timeout: 20,
      measurementOptions: {protocol: 'HTTPS', request: {method: 'GET', path: url.pathname,
        query: '_verify=' + now(), headers: {'Cache-Control': 'no-cache'}}}};
    const response = await request('https://api.globalping.io/v1/measurements', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), timeoutMs: 20000,
    }, true);
    const created = await response.json();
    if (response.status !== 202) {
      const message = created.error?.message || '探测服务未受理';
      const kind = response.status === 422 && /no matching.*probes available/i.test(message) ? 'probe_unavailable' : 'service_error';
      throw new CheckError(kind, `HTTP ${response.status} ${message}`, response.status);
    }
    if (!created.id) throw new CheckError('service_error', '探测服务未返回测量 ID');
    entry.id = created.id;
    entry.url = 'https://globalping.io?measurement=' + encodeURIComponent(created.id);
    let result;
    const deadline = now() + 50000;
    for (let i = 0; i < pollLimit; i++) {
      await sleep(2000);
      const remaining = deadline - now();
      if (remaining <= 0) break;
      const poll = await request('https://api.globalping.io/v1/measurements/' + encodeURIComponent(created.id),
        {timeoutMs: Math.min(remaining, 10000)}, true);
      if (poll.status !== 200) throw new CheckError('service_error', `轮询 HTTP ${poll.status}`, poll.status);
      result = await poll.json();
      if (result.status === 'finished') break;
      if (result.status !== 'in-progress') throw new CheckError('service_error', '未知测量状态：' + result.status);
    }
    // Partial results are evidence, never a pass for an unfinished measurement.
    entry.samples = (result?.results || []).map(item => {
      const probe = item.probe || {}, value = item.result || {};
      let kind = null;
      if (value.status !== 'finished') kind = value.failureSource === 'target' ? 'connection_error' : 'probe_error';
      else if (value.statusCode !== 200) kind = 'http_error';
      else if (!matches(value.rawBody || '', route)) kind = 'content_mismatch';
      return {country: probe.country, city: probe.city, asn: probe.asn, network: probe.network,
        status: value.statusCode || null, probeStatus: value.status, failureSource: value.failureSource || null,
        totalMs: value.timings?.total ?? null, error: value.error || (kind ? value.rawOutput : null) || null,
        kind, matched: result.status === 'finished' && !kind};
    });
    if (result?.status !== 'finished') throw new CheckError('polling_timeout', '测量轮询已到期限，保留未完成样本');
  }

  if (scope !== 'deployment') {
    report.mainland.status = 'in_progress';
    await save(report);
    let seed;
    for (const route of routes) {
      const entries = [], routeReport = {file: route.file, providers: []};
      report.mainland.routes.push(routeReport);
      for (let attempt = 0; attempt < attempts; attempt++) {
        const missing = providers.filter(asn => !entries.some(m => m.samples.some(s => s.country === 'CN' && s.asn === asn && s.matched)));
        if (!missing.length) break;
        if (attempt) { report.mainland.hadRetries = true; await sleep(3000 * attempt); }
        const locations = attempt === 0 && seed ? seed : missing.map(asn => ({country: 'CN', asn, limit: 1}));
        const entry = {file: route.file, target: new URL(route.file, base).href, attempt: attempt + 1,
          requestedProviders: missing, locations, samples: []};
        entries.push(entry);
        report.mainland.measurements.push(entry);
        try { await measurement(route, locations, entry); }
        catch (error) { entry.error = describe(error); }
        log(entry);
        await save(report);
        if (!seed && !entry.error && providers.every(asn => entry.samples.some(s => s.country === 'CN' && s.asn === asn))) seed = entry.id;
      }
      for (const asn of providers) {
        const samples = entries.flatMap(m => m.samples.filter(s => s.country === 'CN' && s.asn === asn));
        const matched = samples.some(s => s.matched);
        const kinds = [...new Set([...samples.filter(s => s.kind).map(s => s.kind),
          ...entries.filter(m => m.requestedProviders.includes(asn) && m.error).map(m => m.error.kind)])];
        if (!matched && !kinds.length) kinds.push('probe_unavailable');
        routeReport.providers.push({asn, matched, kinds});
        if (!matched) report.failures.push(`大陆核验未通过：${route.file} AS${asn} [${kinds.join(', ')}]`);
      }
    }
    const missing = report.mainland.routes.flatMap(route => route.providers.filter(p => !p.matched));
    report.mainland.status = !missing.length ? report.mainland.hadRetries ? 'passed_with_retries' : 'passed' :
      missing.some(p => p.kinds.some(k => ['connection_error', 'http_error', 'content_mismatch'].includes(k))) ? 'failed' : 'not_verified';
  }
  await save(report);
  return report;
}

export function renderSummary(report) {
  const lines = ['## 上线后版本与大陆网络核验', '', `发布批次：${report.expected || '未提供'}`,
    `网站：${report.base}`, `检查范围：${report.scope}`, '',
    `网站版本及资源：${report.deployment.status}`, `大陆三网样本：${report.mainland.status}`, '',
    '### 网站 HTTP 检查', '', ...report.runnerChecks.map(c => `- ${c.name}：${c.matched ? '通过' : '失败'}（${c.attempts.length} 次）`), '',
    '### 大陆探测证据', ''];
  for (const entry of report.mainland.measurements) {
    lines.push(`- ${entry.file} / 第 ${entry.attempt} 次${entry.url ? ` / [探测结果](${entry.url})` : ''}`);
    if (entry.error) lines.push(`  - ${labels[entry.error.kind] || entry.error.kind}：${entry.error.message}`);
    for (const s of entry.samples) lines.push(`  - ${s.city}/AS${s.asn}：${s.matched ? '内容匹配' : labels[s.kind] || '未验证'}；HTTP ${s.status ?? '无响应'}${s.error ? '；' + s.error : ''}`);
  }
  lines.push('', '### 最终结果', '', ...(report.failures.length ? report.failures.map(f => '- ' + f) : ['- 所选范围检查通过。']), '',
    '经重试恢复的失败仍保留在报告中；缺少所需运营商样本不能判定通过。',
    'HTTP 与 User-Agent 检查不替代浏览器执行或夸克、微信、QQ 真机测试；节点样本不代表中国大陆全部线路。', '');
  return lines.join('\n');
}
