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
    for (const [id, name, pending, width] of [
      ['forming_forging_2026', '锻造知识', 47, 390],
      ['forming_casting_2026', '铸造知识', 16, 1366]
    ]) {
      const context = await browser.newContext({viewport:{width,height:900}, serviceWorkers:'block'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const ready=()=>page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
      if(width===390){
        const legacy=['sinotruk_culture_2025_official','forming_forging_2026'];
        await context.addInitScript(ids=>localStorage.setItem('shenrenliu_qbank_selection_v1',JSON.stringify(ids)),legacy);
        const oldURL=new URL(base);oldURL.searchParams.set('banks',legacy.join(','));
        await page.goto(oldURL.href);
      }else await page.goto(base);
      await ready();
      assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.scopeBankIds()),['forming_forging_2026']);
      assert.equal(await page.locator('[data-forming-module]').count(),0);
      await page.locator('.hero-bank-picker').click();
      const choices=page.locator('#bankDialog [data-bank-id]');
      assert.equal(await choices.count(),4);
      for(const box of await choices.all())await box.setChecked((await box.getAttribute('data-bank-id'))===id);
      await page.getByRole('button',{name:'应用所选范围'}).click();
      await page.waitForURL(url=>url.searchParams.get('banks')===id);await ready();
      await page.goto(base);await ready();
      assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.scopeBankIds()),[id]);
      await page.getByRole('button',{name:'定制我的计划'}).click();
      await page.getByRole('button',{name:'新建学习计划'}).click();
      assert.deepEqual(await page.locator('[data-plan-bank]:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.planBank)), [id]);
      assert.equal(await page.locator('#planSelectionCount').innerText(),'已选 460 题 · 含 '+pending+' 道待核验题');
      await page.getByRole('button',{name:'生成每日安排预览'}).click();
      assert.equal(await page.locator('.plan-day').count(),14);
      const question=await page.evaluate(()=>QUESTION_BANK.find(q=>q.analysis?.status==='needs_source'));
      await page.getByText('细选题目或按分类调整',{exact:true}).click();
      await page.getByRole('button',{name:'移出筛选结果'}).click();
      await page.locator('#planSearch').fill(String(question.sourceQuestionId));
      const row=page.locator('[data-plan-key="'+id+':'+question.sourceQuestionId+'"]');
      assert((await row.locator('..').innerText()).includes('待核验'));
      await row.check();await page.getByRole('button',{name:'生成每日安排预览'}).click();
      await page.getByRole('button',{name:'确认保存这个计划'}).click();
      await page.getByRole('button',{name:/开始今天的学习/}).click();
      assert((await page.locator('.q-stem').innerText()).includes(question.stem.slice(0,6)));
      assert((await page.locator('#main').innerText()).includes('待核验'));
      await page.getByRole('button',{name:'直接看答案',exact:true}).click();
      assert((await page.locator('#main').innerText()).includes('原题参考答案')||(await page.locator('#main').innerText()).includes('原表'));
      await page.goto(base);await ready();
      await page.evaluate(()=>renderRealExamSetup());
      await page.getByRole('heading',{name:name+'模拟考试',exact:true}).waitFor();
      await page.getByRole('button',{name:'开始模拟',exact:true}).click();
      const paper = await page.evaluate(()=>__V22_TEST__.getSession().items.map(item=>({bank:item.q.bankId,type:item.renderType,status:item.q.analysis.status})));
      assert(paper.every(item=>item.bank===id && item.status==='ready'));
      for (const [type,count] of [['single',30],['multiple',7],['judge',13]]) assert.equal(paper.filter(item=>item.type===type).length,count);
      assert.equal(paper.length,50);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log('PASS', name, '首页默认与切换、整库460题、待核验题进入实际计划、单库30/7/13考试');
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.closeAllConnections();server.close();});
