const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(process.env.PLAN_TEST_ROOT||'dist');
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1))||'index.html';
  const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const base='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined,args:['--disable-gpu','--disable-dev-shm-usage','--no-sandbox']});
  try{
    for(const width of [390,1024,1366]){
      const ctx=await browser.newContext({viewport:{width,height:900},hasTouch:width<1100,serviceWorkers:'block',timezoneId:'America/Los_Angeles'});
      const errors=[],p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
      await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
      await p.goto(base+'?banks=hos_2026');await p.waitForFunction(()=>window.BANK_RUNTIME?.app);
      await p.getByRole('button',{name:'定制我的计划'}).click();await p.getByRole('button',{name:'新建学习计划'}).click();
      const [firstCount,bothCount]=await p.evaluate(()=>{
        const ids=['hos_2026','sinotruk_culture_2025_official'],all=BANK_RUNTIME.allQuestions;
        return [all.filter(q=>q.bankId===ids[0]).length,all.filter(q=>ids.includes(q.bankId)).length];
      });
      const selected=async()=>Number((await p.locator('#planSelectionCount').innerText()).match(/已选 (\d+) 题/)[1]);
      assert(firstCount>30&&bothCount>firstCount&&bothCount>280);assert.equal(await selected(),firstCount);
      await p.locator('[data-plan-bank="sinotruk_culture_2025_official"]').check();assert.equal(await selected(),bothCount);
      await p.getByText('细选题目或按分类调整',{exact:true}).click();await p.locator('[data-plan-key]').first().waitFor();assert.equal(await p.locator('[data-plan-key]').count(),30);
      await p.locator('#planPages').getByText('下一页').click();await p.locator('[data-plan-key]').first().uncheck();
      assert.equal(await selected(),bothCount-1);await p.locator('[data-plan-key]').first().check();
      await p.locator('#planPeriod').selectOption('7');await p.getByRole('button',{name:'生成每日安排预览'}).click();assert.equal(await p.locator('.plan-day').count(),7);
      await p.locator('#planPeriod').selectOption('custom');assert(await p.locator('#planEnd').isEditable());
      await p.locator('#planPeriod').selectOption('14');await p.locator('#planPace').selectOption('20');assert((await p.locator('#planPaceInfo').innerText()).includes('至少有 '+(bothCount-280)+' 道'));
      await p.getByRole('button',{name:'生成每日安排预览'}).click();assert.equal(await p.locator('.plan-day').count(),14);assert.equal(await p.locator('.plan-day li').count(),0);
      await p.locator('.plan-day summary').first().click();await p.locator('.plan-day li').first().waitFor();assert.equal(await p.locator('.plan-day li').count(),20);
      await p.getByRole('button',{name:'确认保存这个计划'}).click();assert.equal(await p.evaluate(()=>Object.values(__V22_TEST__.getStore().learningPlans)[0].keys.length),bothCount);
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.getByRole('button',{name:/开始今天的学习/}).click();
      await p.getByRole('button',{name:'直接看答案',exact:true}).click();await p.getByRole('button',{name:'还没记住',exact:true}).click();
      assert.equal(await p.evaluate(()=>Object.values(Object.values(__V22_TEST__.getStore().learningPlans)[0].events)[0].rating),'again');
      await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();assert(await p.evaluate(()=>__V22_TEST__.getStore().recentSessions.length>0));
      await p.getByRole('button',{name:'放弃此进度',exact:true}).first().click();await p.locator('[data-discard-cancel]').click();
      await p.getByRole('button',{name:'放弃此进度',exact:true}).first().click();await p.locator('[data-discard-confirm]').click();
      await p.getByRole('button',{name:/定制|查看我的计划/}).first().click();await p.getByRole('button',{name:'查看每日安排'}).click();
      assert(await p.getByText(/刚才忘记的题/).isVisible());await p.reload();await p.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
      assert.equal(await p.evaluate(()=>Object.keys(Object.values(__V22_TEST__.getStore().learningPlans)[0].events).length),1);
      await p.evaluate(()=>openSettings());await p.locator('#settingsModal button').filter({hasText:'关闭'}).click();assert(await p.locator('#settingsModal').evaluate(e=>e.classList.contains('hidden')));
      assert.deepEqual(errors,[]);await ctx.close();console.log('PASS '+width+'px 两个公开题库整库选择、分页细选、周期切换、14天预览、跨库启动、忘题计划、暂存和刷新恢复');
    }
  }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);server.closeAllConnections();server.close();process.exitCode=1});
