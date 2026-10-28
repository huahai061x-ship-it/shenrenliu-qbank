import {mkdir, writeFile, appendFile} from 'node:fs/promises';
import path from 'node:path';
import {verifyProduction, renderSummary} from './verify-production-core.mjs';

const output = path.resolve(process.env.VERIFY_OUTPUT || 'verification');
await mkdir(output, {recursive: true});
async function save(report) {
  await writeFile(path.join(output, 'production-verification.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(output, 'summary.md'), renderSummary(report));
}
const report = await verifyProduction({
  expected: process.env.EXPECTED_BUILD || process.env.GITHUB_SHA,
  siteURL: process.env.SITE_URL || 'https://huahai061x-ship-it.github.io/shenrenliu-qbank/',
  scope: process.env.VERIFY_SCOPE || 'all',
  log: entry => console.log(JSON.stringify(entry)),
  save,
});
const summary = renderSummary(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
for (const failure of report.failures) console.error(failure);
if (report.failures.length) process.exitCode = 1;
else {
  if (report.mainland.hadRetries || report.deployment.hadRetries) {
    console.log('::warning::部分检查经重试恢复，首轮失败已保留；不能据此宣称线路持续稳定。');
  }
  console.log(`PASS ${report.scope} 发布检查；大陆网络状态：${report.mainland.status}`);
}
