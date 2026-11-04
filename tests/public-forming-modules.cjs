// Exercise the same entry points available to a first-time, signed-out visitor.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve('dist');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return response.writeHead(404).end();
  const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json'};
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.LIVE_URL || 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || undefined});
  try {
    for (const [id, name, eligible, width] of [
      ['forming_forging_2026', '锻造知识', 413, 390],
      ['forming_casting_2026', '铸造知识', 444, 1366]
    ]) {
      const context = await browser.newContext({viewport:{width,height:900}, serviceWorkers:'block'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const module = page.locator('[data-forming-module="' + id + '"]');
      await page.goto(base);
      await module.waitFor();
      assert.equal(await page.locator('[data-forming-module]').count(), 2);
      assert((await module.innerText()).includes('460 题'));
      await page.locator('.hero-bank-picker').click();
      assert.equal(await page.locator('#bankDialog [data-bank-id]').count(), 4);
      await page.locator('#bankDialog').getByRole('button',{name:'取消',exact:true}).click();
      await module.getByRole('button',{name:'定制计划'}).click();
      await page.locator('#planForm').waitFor();
      assert.deepEqual(await page.locator('[data-plan-bank]:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.planBank)), [id]);
      assert((await page.locator('#planSelectionCount').innerText()).includes('已选 ' + eligible + ' 题'));
      await page.getByRole('button',{name:'生成每日安排预览'}).click();
      assert.equal(await page.locator('.plan-day').count(),14);
      await page.getByRole('button',{name:'返回首页',exact:true}).click();
      await module.getByRole('button',{name:'刷题练习'}).click();
      await page.waitForFunction(()=>window.BANK_RUNTIME?.app && !document.querySelector('[data-forming-module]'));
      assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.scopeBankIds()), [id]);
      await page.goto(base);
      await module.getByRole('button',{name:'模拟考试'}).click();
      await page.getByRole('heading',{name:name+'模拟考试',exact:true}).waitFor();
      await page.getByRole('button',{name:'开始模拟',exact:true}).click();
      const paper = await page.evaluate(()=>__V22_TEST__.getSession().items.map(item=>({bank:item.q.bankId,type:item.renderType,status:item.q.analysis.status})));
      assert(paper.every(item=>item.bank===id && item.status==='ready'));
      for (const [type,count] of [['single',33],['multiple',4],['judge',13]]) assert.equal(paper.filter(item=>item.type===type).length,count);
      assert.equal(paper.length,50);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log('PASS', name, '独立入口、460题、计划默认单库和14天预览、单库50题考试');
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.closeAllConnections();server.close();});
