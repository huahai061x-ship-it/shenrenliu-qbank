const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve('dist'),origin='https://history.test';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
 try{
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
  await page.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url()),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
   if(u.origin!==origin||!f.startsWith(root+path.sep))return r.abort();
   try{await r.fulfill({path:f})}catch{await r.fulfill({status:404,body:''})}
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>window.BANK_RUNTIME?.app);
  const history=()=>page.getByRole('button',{name:'考试历史',exact:true}).first();
  await page.goto(origin+'/?banks=forming_forging_2026');await ready();
  for(const mode of ['real','special','favorites','wrong']){
   await page.evaluate(mode=>{
    navHome(true);
    if(mode==='real')renderRealExamSetup();else if(mode==='special')renderSpecialSetup('exam','multiple');else renderCollectionExamSetup(mode==='favorites'?'fav':'wrong');
   },mode);
   await history().click();assert(await page.getByRole('heading',{name:'考试历史'}).isVisible());
  }
  const data=await page.evaluate(()=>{
   navHome(true);renderRealExamSetup();beginRealExam();const s=BANK_RUNTIME.app.getSession();
   s.items.forEach((i,n)=>{
    const o=i.q.options.find(o=>!i.q.answers.includes(o));
    i.answer=n===1?(i.renderType==='multiple'?[o||i.q.options[0]]:o):n===2?null:i.renderType==='multiple'?[...i.q.answers]:i.q.answers[0];
   });
   submitExam(true);const r=BANK_RUNTIME.app.getStore().history[0];
   return {ids:r.ids,score:r.score,note:r.paperNotes[16].why,answers:r.userAnswers,paper:r.paperId};
  });
  await page.evaluate(()=>{closeEasterEgg();reviewCurrentSession()});
  await page.locator('#graded-16 .guessed-answer').click();
  await page.locator('#graded-16 .graded-explanation summary').click();
  await page.locator('#graded-16').evaluate(e=>e.scrollIntoView());
  await page.waitForTimeout(220);
  await page.reload();await ready();
  await page.evaluate(()=>{openLuluRoom();openLuluPage('history')});
  assert.equal(await page.locator('.history-list li').count(),1);
  assert(await page.locator('.history-list').evaluate(e=>e.compareDocumentPosition(document.querySelector('.history-stats-title'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert(await page.getByRole('button',{name:'返回噜噜小屋'}).isVisible());
  await page.getByRole('button',{name:'继续复盘',exact:true}).click();
  assert.equal(await page.locator('.graded-card').count(),50);
  const card=page.locator('#graded-16');
  assert(await card.locator('.guessed-answer').isDisabled());
  assert(await card.locator('details').evaluate(e=>e.open));
  assert.equal(await card.locator('.graded-reason p').textContent(),data.note);
  await page.waitForFunction(()=>{const r=document.getElementById('graded-16').getBoundingClientRect();return r.bottom>0&&r.top<innerHeight});
  assert.deepEqual(await page.locator('.graded-card').evaluateAll(rows=>rows.map(r=>Number(r.dataset.paperQuestion))),data.ids);
  assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>i.answer)),data.answers);
  await page.getByRole('button',{name:'返回成绩',exact:true}).click();
  assert.equal(await page.locator('.score-ring b').textContent(),data.score+'分');
  await page.getByRole('button',{name:'重做错题',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>i.q.id)),[data.ids[1],data.ids[16]]);
  assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getStore().history.length),1);
  await page.evaluate(()=>{navHome(true);renderRealExamSetup()});await history().click();
  assert.equal(await page.getByRole('button',{name:'继续复盘'}).count(),1);
  await page.evaluate(()=>renderHistory());
  if(process.env.FORMING_SCREENSHOTS)await page.screenshot({path:path.join(process.env.FORMING_SCREENSHOTS,'learning-history-mobile.png')});
  assert.deepEqual(errors,[]);console.log('PASS 各类考试历史入口、首页与噜噜小屋试卷优先、刷新恢复第17题和展开解析、原答案/成绩/蒙对/待练及历史重做。');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
