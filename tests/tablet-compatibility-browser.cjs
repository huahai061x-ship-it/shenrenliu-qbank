const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve('../../outputs/tablet-compat-20261114/after');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});const results=[],errors=[];
 async function create({fault='',width=1280,touch=true,old=false,seed=null}={}){
  const c=await browser.newContext({viewport:{width,height:900},hasTouch:touch,isMobile:false,serviceWorkers:'block',acceptDownloads:true});
  await c.addInitScript(({old,seed,fault})=>{
   localStorage.setItem('shenrenliu_device_mode_v1','guest');
   if(seed&&!localStorage.getItem('seeded')){localStorage.setItem('shenrenliu_qbank_workspace_v1',seed);localStorage.setItem('seeded','1');}
   if(old){window.structuredClone=undefined;Object.hasOwn=undefined;Array.prototype.at=undefined;String.prototype.replaceAll=undefined;crypto.randomUUID=undefined;}
   // Shorten only the production watchdog deadlines; resource requests still really remain pending.
   if(fault.includes('hang')){const set=window.setTimeout;window.setTimeout=(fn,ms,...args)=>set(fn,ms===15000||ms===25000?700:ms,...args);}
  },{old,seed,fault});
  await c.route('https://tablet.test/**',r=>{
   const u=new URL(r.request().url()),file=path.resolve('dist','.'+(u.pathname==='/'?'/index.html':u.pathname));
   if(fault==='bank-hang'&&u.pathname.endsWith('/forming_forging_2026.js'))return;
   if(fault==='other-bank-hang'&&u.pathname.endsWith('/forming_casting_2026.js'))return;
   if(fault==='static-hang'&&u.pathname.endsWith('/cloud-sync.js'))return;
   if(fault==='app-error'&&u.pathname.endsWith('/app.js'))return r.fulfill({contentType:'text/javascript',body:'throw new TypeError("simulated startup incompatibility")'});
   return fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:''});
  });
  const p=await c.newPage();p.on('pageerror',e=>{if(fault==='app-error'||fault==='read-error')return;errors.push(e.message)});p.on('dialog',d=>d.accept());
  await p.goto('https://tablet.test/?banks=forming_forging_2026',{waitUntil:'commit'});
  if(!fault)await p.locator('.home-content').waitFor();
  return p;
 }
 try{
  const p=await create({old:true});
  assert.deepEqual(await p.evaluate(()=>QBANK_COMPAT.features),{structuredClone:false,hasOwn:false,arrayAt:false,randomUUID:false});
  const cloned=await p.evaluate(async()=>{
   const buffer=new Uint8Array([7,8,9]),value={answer:undefined,date:new Date(42),image:new Blob(['image'],{type:'image/png'}),buffer,map:new Map([['q',7]])};value.self=value;
   const next=QBANK_COMPAT.cloneData(value);next.buffer[0]=5;
   return {cycle:next.self===next,undef:'answer' in next&&next.answer===undefined,date:next.date.getTime(),image:await next.image.text(),independent:buffer[0]===7,map:next.map.get('q'),uuid:QBANK_COMPAT.uuid()};
  });
  assert.equal(cloned.cycle,true);assert.equal(cloned.undef,true);assert.equal(cloned.independent,true);assert.equal(cloned.date,42);assert.equal(cloned.image,'image');assert.equal(cloned.map,7);assert.match(cloned.uuid,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  for(const mode of ['sequence','random','single','multiple','judge','plan','exam']){
   const start=await p.evaluate(mode=>{
    navHome(true);const s=BANK_RUNTIME.app.getStore();
    if(mode==='plan'){
     const C=STUDY_PLAN_CORE,questions=QUESTION_BANK.slice(0,8);const plan=C.create({id:'plan_tablet_compat',title:'平板兼容回归',keys:questions.map(C.questionKey),start:C.today(),end:C.add(C.today(),2),dailyNew:8});
     s.learningPlans[plan.id]=plan;STUDY_PLANS.start(plan.id);
    }else if(mode==='exam'){renderRealExamSetup();beginRealExam();}
    else if(['single','multiple','judge'].includes(mode)){renderSpecialSetup('recite',mode);startSpecialRecite('all');}
    else startStudy(mode);
    const session=BANK_RUNTIME.app.getSession();if(!session)throw Error('No session '+mode);
    const item=session.items[0];chooseOption(0);if(mode!=='exam')showAnswer();
    const ok=retryLocalSave();return {ok,id:session.paperId,answer:item.answer,correct:item.q.answers,kind:session.kind};
   },mode);
   assert.equal(start.ok,true,mode+' saves with missing modern APIs');
   assert.equal(await p.locator('.page-turn.next').isVisible(),false,'touch tablet does not receive desktop side controls');
   if(mode!=='exam')assert(await p.locator('.option.correct').count()>0,mode+' reveals answer');
   await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
   await p.locator('.home-content').waitFor();await p.reload();await p.locator('.home-content').waitFor();
   const restored=await p.evaluate(id=>{resumeSavedActivity(id);const session=BANK_RUNTIME.app.getSession();return {id:session.paperId,answer:session.items[0].answer}},start.id);
   assert.equal(restored.id,start.id);assert.deepEqual(restored.answer,start.answer);
   if(mode!=='exam')assert(await p.locator('.option.correct').count()>0,mode+' restored reveal');
   await p.screenshot({path:path.join(out,'tablet-'+mode+'.png')});
   await p.evaluate(()=>pauseAndSave());results.push(mode+': old APIs, touch, save, reload, restore');
  }
  const original=await p.evaluate(()=>localStorage.getItem(BANK_CORE.KEY));
  // Real persistence rejection must remain a failure, never be presented as a saved progress point.
  await p.evaluate(()=>{
   startStudy('sequence');chooseOption(1);window.oldSet=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===BANK_CORE.KEY)throw new DOMException('quota','QuotaExceededError');return oldSet.call(this,k,v)};
   pausePractice();
  });
  await p.locator('#deviceStorageDialog[open]').waitFor();assert(await p.locator('.question-card').isVisible());
  assert.match(await p.locator('[data-reason]').innerText(),/空间不足/);
  assert.match(await p.locator('[data-diagnostic]').inputValue(),/QuotaExceededError/);
  await p.locator('[data-retry]').click();assert.match(await p.locator('#deviceStorageDialog [role=status]').innerText(),/仍未保存/);
  await p.evaluate(()=>Storage.prototype.setItem=oldSet);await p.locator('[data-retry]').click();assert.match(await p.locator('#deviceStorageDialog [role=status]').innerText(),/保存已恢复/);
  await p.locator('#deviceStorageDialog [data-close]').click();
  await p.evaluate(()=>LOCAL_MODE.storageError(new TypeError('simulated'),'生成练习恢复点'));
  await p.locator('#deviceStorageDialog[open]').waitFor();assert.doesNotMatch(await p.locator('[data-reason]').innerText(),/空间不足/);
  await p.locator('#deviceStorageDialog summary').click();await p.screenshot({path:path.join(out,'tablet-diagnostic.png'),animations:'disabled'});
  results.push('quota and compatibility errors differentiated; retry confirms full progress save');
  const partial=await create({fault:'other-bank-hang',seed:original});await partial.locator('.home-content').waitFor();
  assert.deepEqual(await partial.evaluate(()=>BANK_RUNTIME.scopeBankIds()),['forming_forging_2026']);
  assert(await partial.evaluate(()=>BANK_RUNTIME.app.getStore().recentSessions.length>0));
  results.push('unselected bank timeout does not block selected bank or discard saved progress');await partial.context().close();
  for(const fault of ['bank-hang','static-hang','app-error','read-error']){
   const seed=fault==='read-error'?JSON.stringify({...JSON.parse(original),data:{schemaVersion:999}}):original;
   const q=await create({fault,seed});await q.getByRole('heading',{name:'题库还没有打开成功'}).waitFor();
   assert(await q.getByRole('button',{name:'导出已有学习记录'}).isVisible());
   assert.equal(await q.evaluate(()=>localStorage.getItem('shenrenliu_qbank_workspace_v1')),seed,'startup failure preserves exact original bytes');
   const download=q.waitForEvent('download');await q.getByRole('button',{name:'导出已有学习记录'}).click();
   const saved=await (await download).path();assert.equal(fs.readFileSync(saved,'utf8'),seed);
   await q.screenshot({path:path.join(out,fault+'.png')});results.push(fault+': visible recovery and exact raw backup');await q.context().close();
  }
  for(const [width,touch] of [[320,true],[390,true],[430,true],[768,true],[1366,false]]){
   const q=await create({width,touch,old:touch});await q.evaluate(()=>startStudy('sequence'));
   assert.equal(await q.locator('.page-turn.next').isVisible(),!touch);
   assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(touch){await q.locator('.option').first().tap();await q.getByRole('button',{name:'直接看答案',exact:true}).tap();assert(await q.locator('.option.correct').count()>0);}
   await q.screenshot({path:path.join(out,'viewport-'+width+'.png')});await q.context().close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,results}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
