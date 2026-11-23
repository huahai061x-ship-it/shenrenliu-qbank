const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const origin='https://session-controls.test',root=path.resolve('dist');
async function run(browser,width,bank){
 const ctx=await browser.newContext({viewport:{width,height:880},hasTouch:width<1000,isMobile:width<600,serviceWorkers:'block'});
 try{
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6500);
  await page.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
  await page.route('**/*',async route=>{const url=new URL(route.request().url()),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(url.origin!==origin||!file.startsWith(root+path.sep))return route.abort();
   try{await route.fulfill({path:file})}catch{await route.fulfill({status:404,body:''})}});
  await page.goto(origin+'/?banks=forming_'+bank+'_2026');await page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
  const button=(name)=>page.getByRole('button',{name,exact:true}),main=page.locator('#main');
  const back=async()=>{await page.evaluate(()=>history.back());};
  await page.locator('.topbar button').filter({hasText:'设置'}).click();await page.waitForTimeout(60);await back();
  await page.waitForFunction(()=>document.querySelector('#settingsModal').classList.contains('hidden'));
  await page.locator('#luluHomeButton').click();await main.getByRole('button',{name:'进入'}).first().click();await back();
  await page.getByRole('heading',{name:'噜噜的学习小屋'}).waitFor();await back();await page.locator('.plan-express').waitFor();
  const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const modes=page.locator('.more-modes');
  if(!await modes.evaluate(el=>el.open))await modes.locator('summary').click();
  const sequence=main.locator('.mode-card').filter({has:page.getByRole('heading',{name:'顺序背题',exact:true})}).getByRole('button');
  const random=main.locator('.mode-card').filter({has:page.getByRole('heading',{name:'乱序背题',exact:true})}).getByRole('button');
  const position=el=>el.evaluate(b=>{let top=0;for(let n=b;n;n=n.offsetParent)top+=n.offsetTop;return top-window.scrollY});
  // Playwright can scroll again while bringing the button into its final click position.
  async function enterAndMeasure(entry){
   const clicked=entry.evaluate(b=>new Promise(resolve=>{
    b.addEventListener('click',()=>{
     let top=0;for(let n=b;n;n=n.offsetParent)top+=n.offsetTop;
     resolve(top-window.scrollY);
    },{capture:true,once:true});
   }));
   const [offset]=await Promise.all([clicked,entry.click()]);
   return offset;
  }
  async function expectReturn(entry,expected,label){
   await entry.waitFor();await frame();const actual=await position(entry);
   if(Math.abs(actual-expected)>3){
    const details=await entry.evaluate(b=>({scroll:scrollY,limit:document.documentElement.scrollHeight-innerHeight,
      action:b.getAttribute('onclick'),remembered:homePosition,fonts:document.fonts.status}));
    assert.fail(label+' at '+width+'px: before='+expected+', after='+actual+' '+JSON.stringify(details));
   }
  }
  await sequence.evaluate(b=>b.scrollIntoView({block:'center',behavior:'instant'}));await frame();
  const from=await position(sequence);
  await sequence.click();await button('返回').click();await expectReturn(sequence,from,'返回按钮应恢复顺序背题入口');
  const beforeBack=await position(sequence);await sequence.click();await back();await expectReturn(sequence,beforeBack,'浏览器返回应恢复顺序背题入口');
  for(const entry of [sequence,random]){
   await entry.evaluate(b=>b.scrollIntoView({block:'center',behavior:'instant'}));await frame();
   const before=await enterAndMeasure(entry);
   await page.locator('#practiceCount').fill('5');await button('开始背题').click();
   await page.locator('#practiceScopeDialog .primary').click();
   const prefs=page.locator('.question-preferences'),answerMode=prefs.locator('.recite-controls select');
   await prefs.locator('summary').click();await answerMode.selectOption('manual');
   await button('查看本题答案').click();assert(await page.locator('.structured-explanation').first().isVisible());
   await button('隐藏本题答案').click();assert.equal(await page.locator('.structured-explanation').count(),0);
   await answerMode.selectOption('always');assert(await page.locator('.structured-explanation').first().isVisible());
   await answerMode.selectOption('manual');await button('暂停保存，回首页').click();await expectReturn(entry,before,'新增继续进度后仍应回到原入口');
  }
  await page.evaluate(()=>renderPracticeSetup());await page.locator('#practiceCount').fill('17');await button('开始背题').click();await page.locator('#practiceScopeDialog .primary').click();
  assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.length),17);
  await page.evaluate(()=>navHome(true));
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('sr_draw_round_v1/'))localStorage.removeItem(k)});await page.reload();await page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
  const cycle=await page.evaluate(()=>{const used=new Set();let last=[],tenth=[];
   for(let i=0;i<11;i++){startPracticeBatch(46);last=BANK_RUNTIME.app.getSession().items.map(i=>i.q.id);if(i===9)tenth=last;if(i<10)last.forEach(id=>used.add(id))}
   return [used.size,last.filter(id=>tenth.includes(id)).length];});assert.deepEqual(cycle,[460,0]);
  await page.evaluate(()=>{navHome(true);renderRealExamSetup();beginRealExam()});
  assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.reduce((total,i)=>(total[i.renderType]=(total[i.renderType]||0)+1,total),{})),{single:30,judge:10,multiple:10});
  if(width>600){
   await button('向右收起答题卡').click();assert(await page.locator('#answerPanel').isHidden());
   await page.evaluate(()=>jumpQ(1));assert(await page.locator('#answerPanel').isHidden());await button('展开答题卡').click();assert(await page.locator('#answerPanel').isVisible());
  }else{
   assert(await page.locator('.desktop-sheet-toggle').isHidden());await page.locator('.quick-nav .index-btn').click();
   await page.waitForTimeout(50);await back();await page.waitForFunction(()=>!document.querySelector('#answerPanel').classList.contains('open'));
  }
  await page.evaluate(()=>{const s=BANK_RUNTIME.app.getSession();s.items.forEach(i=>{i.answer=i.renderType==='multiple'?[...i.q.answers]:i.q.answers[0]});submitExam(true);closeEasterEgg();navHome(true);renderRealExamSetup()});
  await button('考试历史').click();await button('编辑').click();await page.locator('#editPaperDialog [name=title]').fill('第一轮模拟');await page.locator('#editPaperDialog [name=note]').fill('复习热处理');await button('保存').click();
  await page.reload();await page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);await page.evaluate(()=>{renderRealExamSetup();openExamHistory('real')});
  assert(await main.getByText('复习热处理',{exact:true}).isVisible());assert(await main.getByRole('heading',{name:/第一轮模拟/}).isVisible());
  page.once('dialog',d=>d.accept());await button('删除').click();await page.reload();await page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
  assert.deepEqual(await page.evaluate(()=>{const s=BANK_RUNTIME.app.getStore();return [s.history.length,s.aggregateStats.totalExams]}),[0,1]);
  const debt=await page.evaluate(()=>{const q=QUESTION_BANK.find(q=>q.type==='single'),rows=[];
   for(const answer of [false,false,true,true]){startStudy('sequence',[q]);setAnswer(answer?q.answers[0]:q.options.find(o=>!q.answers.includes(o)));checkStudy();rows.push(BANK_RUNTIME.app.getStore().wrong[q.id].count);closeEasterEgg()}
   return rows;});assert.deepEqual(debt,[1,2,1,0]);
  assert.deepEqual(errors,[]);
  console.log('PASS',width,bank,'分层返回、轮换、17题、组卷、答题卡、编辑和删除持久化、错题抵消');
 }finally{await ctx.close()}
}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});try{for(const [w,b] of [[390,'forging'],[768,'casting'],[1366,'forging']])await run(browser,w,b)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
