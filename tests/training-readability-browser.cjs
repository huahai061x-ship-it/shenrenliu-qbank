const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(process.env.TRAINING_TEST_OUTPUT||'../../outputs/training-20261111');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
 const results=[],errors=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
  await ctx.route('https://readability.test/**',r=>{const n=new URL(r.request().url()).pathname,f=path.resolve('dist','.'+(n==='/'?'/index.html':n));return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  const ready=()=>p.waitForFunction(()=>window.BANK_RUNTIME?.app);
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const shot=async name=>{await settle();await p.screenshot({path:path.join(out,name+'.png')});};
  const fit=async label=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
  await p.goto('https://readability.test/?banks=forming_forging_2026');await ready();
  for(const width of [320,390,430,768,1366,1707,2560]){
   await p.setViewportSize({width,height:width>1800?1440:900});
   await p.evaluate(()=>navHome(true));await fit('home '+width);await shot('home-'+width);
   await p.evaluate(()=>startStudy('sequence'));await fit('practice '+width);
   const fonts=await p.evaluate(()=>({stem:getComputedStyle(document.querySelector('.q-stem')).fontSize,option:getComputedStyle(document.querySelector('.option')).fontSize}));
   if(width>1000){assert.equal(fonts.stem,'26px');assert.equal(fonts.option,'20px');}
   if(width<=600)assert(parseFloat(fonts.option)<=17,'unchanged mobile font');
   await shot('practice-'+width);
   if(width>=1280){
    assert(await p.locator('.page-turn.previous').isDisabled());
    const bounds=await p.evaluate(()=>({a:document.querySelector('.study-layout').getBoundingClientRect().toJSON(),l:document.querySelector('.page-turn.previous').getBoundingClientRect().toJSON(),r:document.querySelector('.page-turn.next').getBoundingClientRect().toJSON()}));
    assert(bounds.l.right<bounds.a.left&&bounds.r.left>bounds.a.right,'rails only use margins');
    await p.locator('.page-turn.next').click();assert.match(await p.locator('.question-position').innerText(),/^2 /);
    await p.locator('.page-turn.previous').click();assert.match(await p.locator('.question-position').innerText(),/^1 /);
    await p.evaluate(()=>{const d=document.createElement('dialog');d.id='railTest';document.body.append(d);d.showModal();desktopPageTurn(1)});
    assert.match(await p.locator('.question-position').innerText(),/^1 /);assert(!await p.locator('.page-turn.next').isVisible());
    await p.evaluate(()=>document.querySelector('#railTest').remove());
    await p.evaluate(()=>jumpQ(BANK_RUNTIME.app.getSession().items.length-1));assert(await p.locator('.page-turn.next').isDisabled());
   }else assert(!await p.locator('.desktop-page-turns').isVisible());
   results.push({width,fonts,overflow:false});
  }
  await p.setViewportSize({width:1366,height:900});
  await p.evaluate(()=>{navHome(true);const C=STUDY_PLAN_CORE,d=C.today(Date.now()),q=QUESTION_BANK,first=q.find(x=>x.type==='single'&&x.analysis?.status==='needs_source'),list=[first,...q.filter(x=>x.id!==first.id).slice(0,89)];const plan=C.create({id:'plan_readability',title:'训练流程验收',keys:list.map(C.questionKey),start:d,end:C.add(d,13),dailyNew:100,now:Date.now()});BANK_RUNTIME.app.getStore().learningPlans={[plan.id]:plan};__V22_TEST__.flush();STUDY_PLANS.detail(plan.id)});
  assert.equal(await p.locator('[aria-label="每轮题量"]').inputValue(),'30');
  for(const n of [20,30,40,50]){
   await p.locator('[aria-label="每轮题量"]').selectOption(String(n));await p.getByRole('button',{name:/开始今天的学习/}).click();
   assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getSession().items.length),n);
   assert(await p.locator('.option').first().isVisible(),'plan options initially visible');
   await p.evaluate(()=>STUDY_PLANS.detail('plan_readability'));
  }
  await p.reload();await ready();await p.evaluate(()=>STUDY_PLANS.detail('plan_readability'));
  assert.equal(await p.locator('[aria-label="每轮题量"]').inputValue(),'50','preference survives refresh');
  await p.getByRole('button',{name:/开始今天的学习/}).click();
  await p.locator('.plan-options-toggle').click();assert.equal(await p.locator('.option').count(),0);
  await p.locator('.plan-options-toggle').click();assert(await p.locator('.option').first().isVisible());
  const firstId=await p.evaluate(()=>BANK_RUNTIME.app.getSession().items[0].q.id);
  await p.evaluate(()=>{const i=BANK_RUNTIME.app.getSession().items[0];chooseOption(i.optionOrder.indexOf(i.q.answers[0]))});
  await p.getByRole('button',{name:'提交答案',exact:true}).click();
  assert.match(await p.locator('.immediate-feedback').innerText(),/回答正确.*按原答案判定/);
  assert.equal(await p.locator('.plan-recall').count(),0);assert.equal(await p.getByText('核对后理解：',{exact:true}).count(),0);
  assert.equal(await p.locator('.mastery-control').count(),1);await shot('disputed-correct-desktop');
  assert(await p.evaluate(id=>{const s=BANK_RUNTIME.app.getStore(),plan=s.learningPlans.plan_readability;return s.learning[id].attempts===1&&Object.keys(plan.events).length===1&&!STUDY_PLAN_CORE.tasks(plan,STUDY_PLAN_CORE.today(Date.now()),Date.now()).some(t=>t.key===STUDY_PLAN_CORE.questionKey(QUESTION_BANK.find(q=>q.id===id)))},firstId));
  await p.evaluate(()=>STUDY_PLANS.detail('plan_readability'));assert(await p.getByRole('button',{name:/继续今日计划/}).isVisible());await shot('plan-desktop');
  await p.getByRole('button',{name:/继续今日计划/}).click();assert(await p.evaluate(id=>BANK_RUNTIME.app.getSession().items.every(i=>i.q.id!==id),firstId));
  await p.getByRole('button',{name:'直接看答案',exact:true}).click();
  await p.locator('.mastery-control select').selectOption('mastered');
  const eventCount=await p.evaluate(()=>Object.keys(BANK_RUNTIME.app.getStore().learningPlans.plan_readability.events).length);assert.equal(eventCount,2);
  await p.locator('.mastery-control select').selectOption('fuzzy');assert.equal(await p.evaluate(()=>Object.keys(BANK_RUNTIME.app.getStore().learningPlans.plan_readability.events).length),eventCount);
  await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();await p.reload();await ready();await p.locator('.hero-start').click();
  assert(await p.locator('.option').first().isVisible());
  for(const width of [320,390,430,768]){await p.setViewportSize({width,height:900});await p.evaluate(()=>STUDY_PLANS.detail('plan_readability'));await fit('plan '+width);await shot('plan-'+width);}
  results.push('20/30/40/50 batches persist; options expand/collapse; disputed correct answer schedules normally; same-day next batch excludes it; single mastery control records assisted recall once; pause/reload safe');
  // Every existing pending-source question across both new banks and HOS uses the same grading path.
  for(const bank of ['forming_forging_2026','forming_casting_2026','hos_2026']){
   await p.goto('https://readability.test/?banks='+bank);await ready();
   const report=await p.evaluate(()=>{navHome(true);startStudy('sequence');const session=BANK_RUNTIME.app.getSession(),pending=session.items.map((i,n)=>({i,n})).filter(({i})=>(i.q.analysis||window.HOS_ANALYSIS?.[i.q.sourceQuestionId||i.q.id])?.status==='needs_source');let passed=0;for(const {i,n} of pending){jumpQ(n);setAnswer(i.renderType==='multiple'?[...i.q.answers]:i.q.answers[0]);checkStudy();if(!i.checked||!i.correct||!i.attemptRecorded)throw Error('ungraded '+i.q.id);passed++;}return {bank:session.items[0].q.bankId,pending:pending.length,passed}});
   assert(report.pending>0);results.push(report);
   await p.evaluate(()=>{navHome(true);renderRealExamSetup();beginRealExam()});
   await p.evaluate(()=>{const s=BANK_RUNTIME.app.getSession();for(const i of s.items)i.answer=i.renderType==='multiple'?[...i.q.answers]:i.q.answers[0];submitExam(true)});
   assert(await p.locator('.result-content').isVisible(),'exam with disputed questions can submit');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
