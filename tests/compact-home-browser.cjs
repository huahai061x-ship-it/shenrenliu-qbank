const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve('dist'),out=path.resolve(process.env.HOME_TEST_OUTPUT||'../../outputs/home-compact-20261107');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
 const results=[],errors=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'}),p=await ctx.newPage();
  const base=process.env.LIVE_URL||'https://training.test/';
  if(!process.env.LIVE_URL)await ctx.route(base+'**',route=>{
   const pathname=new URL(route.request().url()).pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   return file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  const ready=()=>p.waitForFunction(()=>window.BANK_RUNTIME?.app);
  const open=async(query='')=>{await p.goto(base+query);await ready();};
  const choose=p.locator('#contentTopicDialog'),bank=p.locator('#bankDialog');
  for(const width of [320,390,768,1366]){
   await p.setViewportSize({width,height:844});await open();
   await p.locator('#cloudAccountButton').waitFor({state:'visible'});
   const metrics=await p.evaluate(()=>({width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,exam:document.querySelector('.core-mode-grid .btn').getBoundingClientRect().toJSON(),topicPanel:!!document.querySelector('#main .content-topics'),syncButtons:document.querySelectorAll('#main [onclick="CLOUD_SYNC.open()"]').length,footerLast:document.querySelector('.home-content').lastElementChild.matches('.home-updates')}));
   assert(!metrics.overflow);assert(!metrics.topicPanel);assert.equal(metrics.syncButtons,0);assert(metrics.footerLast);assert(metrics.exam.bottom<844,JSON.stringify(metrics));
   await p.screenshot({path:path.join(out,'home-'+width+'.png'),fullPage:true});results.push(metrics);
  }
  await p.setViewportSize({width:390,height:844});await open();
  await p.locator('.core-mode-grid .btn').first().click();await p.locator('#realExamRule').waitFor();
  await p.getByRole('button',{name:'开始模拟',exact:true}).click();
  assert.equal(await p.evaluate(()=>__V22_TEST__.getSession().items.length),50);
  const paper=await p.evaluate(()=>__V22_TEST__.getSession().paperId);
  await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
  assert.equal(await p.locator('.recent-activities').getAttribute('open'),null);
  await p.locator('.hero-start').click();assert.equal(await p.evaluate(()=>__V22_TEST__.getSession().paperId),paper);
  await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
  await p.locator('.recent-activities>summary').click();assert(await p.getByRole('button',{name:'继续上次考试',exact:true}).isVisible());
  await p.locator('.hero-bank-picker').click();await bank.getByRole('button',{name:'应用所选范围'}).click();
  await choose.waitFor({state:'visible'});await ready();
  assert.equal(new URL(p.url()).searchParams.has('chooseContent'),false);
  const target=await p.evaluate(()=>{const m=BANK_RUNTIME.ctx.metas.get('forming_forging_2026'),g=m.contentGroups[0];return {id:g.id,name:g.name,count:BANK_RUNTIME.ctx.allQuestions.filter(q=>q.bankId===m.id&&q.contentGroup===g.id).length};});
  await p.screenshot({path:path.join(out,'category-390.png')});
  await choose.locator('[data-content-topic="'+target.id+'"]').click();
  assert(await p.locator('.home-topic-trigger').innerText().then(x=>x.includes(target.name)));
  assert.equal(await p.locator('.status-overview strong').first().innerText(),String(target.count));
  await p.evaluate(()=>startStudy('sequence'));
  assert(await p.evaluate(id=>__V22_TEST__.getSession().items.every(i=>i.q.contentGroup===id),target.id));
  await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
  await p.locator('.core-mode-grid .btn').first().click();await p.getByRole('button',{name:'开始模拟',exact:true}).click();assert(await p.evaluate(id=>{const items=__V22_TEST__.getSession().items;return items.length>0&&items.length<=50&&items.every(i=>i.q.contentGroup===id)},target.id));await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
  await p.reload();await ready();assert.equal(await choose.isVisible(),false);assert((await p.locator('.home-topic-trigger').innerText()).includes(target.name));
  await p.locator('.home-topic-trigger').click();await p.keyboard.press('Escape');assert.equal(await choose.isVisible(),false);
  assert((await p.locator('.home-topic-trigger').innerText()).includes(target.name));
  // A failed preference write keeps the dialog and previously selected range.
  await p.locator('.home-topic-trigger').click();
  await p.evaluate(()=>{window.restoreStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota test')}});
  await choose.locator('[data-content-topic="all"]').click();assert(await choose.isVisible());
  await p.evaluate(()=>{Storage.prototype.setItem=window.restoreStorageWrite;delete window.restoreStorageWrite});
  await choose.locator('[data-content-topic="all"]').click();assert.equal(await p.locator('.status-overview strong').first().innerText(),'460');
  // Changing a bank through the UI always offers content choice, including no-group/mixed scopes.
  for(const ids of [['forming_casting_2026'],['hos_2026'],['forming_forging_2026','forming_casting_2026']]){
   await p.locator('.hero-bank-picker').click();
   for(const input of await bank.locator('[data-bank-id]').all())await input.setChecked(ids.includes(await input.getAttribute('data-bank-id')));
   await bank.getByRole('button',{name:'应用所选范围'}).click();await choose.waitFor({state:'visible'});
   assert.deepEqual((await p.evaluate(()=>BANK_RUNTIME.scopeBankIds())).sort(),ids.slice().sort());
   if(ids.length>1)assert.equal(await choose.locator('[data-content-topic]').count(),1);
   await choose.locator('[data-content-topic="all"]').click();
  }
  // The single top account entry still opens synchronization; backup remains in settings.
  await p.locator('#cloudAccountButton').click();
  assert(await p.getByRole('heading',{name:'学习账号与同步'}).isVisible());
  await p.locator('#cloudAccountDialog').getByRole('button',{name:'关闭',exact:true}).click();await p.evaluate(()=>openSettings());await p.getByRole('button',{name:'备份与恢复',exact:true}).click();assert(await p.locator('#backupDialog').isVisible());
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,flows:['first-screen exam','same-paper resume','collapsed progress management','bank then content dialog','category persistence','Escape retains scope','storage failure retains scope','single and mixed bank switching','top account entry'],errors},null,2));
  console.log(JSON.stringify({results,errors},null,2));await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
