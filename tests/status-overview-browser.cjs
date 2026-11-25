const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve('dist');
const origin = 'https://overview.test';

async function verify(){
 const browser = await chromium.launch({executablePath:process.env.CHROME_BIN});
 try {
  const page = await browser.newPage({serviceWorkers:'block'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(url.origin!==origin||!file.startsWith(root+path.sep))return route.abort();
   try {await route.fulfill({path:file});} catch {await route.fulfill({status:404,body:''});}
  });
  async function open(banks){
   await page.goto(origin+'/?banks='+banks);
   await page.waitForFunction(()=>window.BANK_RUNTIME?.app);
  }
  const card=key=>page.locator('[data-status-key="'+key+'"]');
  const count=key=>card(key).locator('strong').innerText().then(Number);
  const home=()=>page.getByRole('button',{name:'返回首页',exact:true}).click();
  const rows=page.locator('.overview-rows li');
  await open('forming_forging_2026');
  assert.equal(await count('all'),460);
  for(const key of ['seen','wrong','fav','due']){
   await card(key).click();
   assert.match(await page.locator('#main h2').innerText(),/ · 0 题$/);
   assert.equal(await rows.count(),0);
   await home();
  }
  const ids=await page.evaluate(()=>{
   const s=BANK_RUNTIME.app.getStore(),now=Date.now();
   const [a,b,c]=QUESTION_BANK.slice(0,3),other=BANK_RUNTIME.allQuestions.find(q=>q.bankId!==a.bankId);
   for(const [i,q] of [a,b,c,other].entries()){
    s.seen[q.id]=now-90000+i;
    s.learning[q.id]={attempts:1,correct:1,last:now-90000,due:i===2?now+86400000:now-60000*(1+i)};
   }
   s.wrong[a.id]={count:1,wrongTotal:1};
   s.favorites.push(b.id,other.id);
   navHome(true);
   return [a.id,b.id,c.id];
  });
  const expected={all:460,seen:3,unseen:457,wrong:1,fav:1,due:2};
  for(const [key,n] of Object.entries(expected)){
   assert.equal(await count(key),n);
   await card(key).click();
   assert.match(await page.locator('#main h2').innerText(),new RegExp(' · '+n+' 题$'));
   assert.equal(await rows.count(),Math.min(n,20));
   if(key==='due'){
    assert.deepEqual(await rows.locator('button').evaluateAll(btns=>btns.map(b=>Number(b.getAttribute('onclick').match(/\d+/)[0]))),[ids[1],ids[0]]);
    await page.getByText('复习时间怎么算？',{exact:true}).click();
    assert(await page.getByText(/1、2、4、8、16、30 天/).isVisible());
   }
   await home();
  }
  assert.equal(await count('seen'),3);
  await card('unseen').click();
  await page.getByRole('button',{name:'下一页',exact:true}).click();
  await rows.first().getByRole('button').click();
  await page.getByRole('button',{name:'返回来源',exact:true}).click();
  assert.match(await page.locator('#main h2').innerText(),/未覆盖 · 456 题/);
  assert.match(await page.locator('.search-pager').innerText(),/2 \/ 23/);
  await home();
  assert.equal(await count('seen'),4);
  await page.evaluate(()=>{startStudy('sequence')});
  await page.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
  const recent=page.locator('.home-resume');
  await recent.hover();
  for(const motion of ['reduce','no-preference']){
   await page.emulateMedia({reducedMotion:motion});
   assert.equal(await recent.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  }
  await recent.click();assert(await page.locator('.recent-activities').isVisible());await page.keyboard.press('Escape');
  assert.equal(await page.locator('.home-bank-note').count(),0);
  assert.equal(await page.locator('.home-updates > *').count(),1);
  assert.equal(await page.locator('#homeReleaseNote').count(),1);
  await open('forming_forging_2026,forming_casting_2026');
  assert.equal(await count('all'),920);
  for(const width of [320,390,430,768,1366]){
   await page.setViewportSize({width,height:844});
   const plan=page.locator('.plan-express');
   const type=await plan.evaluate(b=>{const css=getComputedStyle(b);return [parseFloat(css.fontSize),parseFloat(css.letterSpacing),b.scrollWidth<=b.clientWidth];});
   assert(type[0]>=(width<=600?17:20)&&type[1]>=(width<=600?2:4)&&type[2]);
   if(process.env.FORMING_SCREENSHOTS){
    await fs.mkdir(process.env.FORMING_SCREENSHOTS,{recursive:true});
    await plan.screenshot({path:path.join(process.env.FORMING_SCREENSHOTS,'plan-entry-'+width+'.png')});
   }
   await card('all').scrollIntoViewIfNeeded();
   assert(await page.locator('[data-status-key]').evaluateAll(btns=>btns.length===6&&btns.every(b=>b.getBoundingClientRect().height>=44)));
   const shots=process.env.FORMING_SCREENSHOTS;
   if(shots){await fs.mkdir(shots,{recursive:true});await page.screenshot({path:path.join(shots,'overview-'+width+'.png')});}
   await card('all').click();
   assert.equal(await rows.count(),20);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(shots)await page.screenshot({path:path.join(shots,'overview-list-'+width+'.png')});
   await home();
  }
  await open('forming_forging_2026');
  await page.locator('.home-topic-trigger').click();
  const target=await page.evaluate(()=>{const meta=BANK_RUNTIME.ctx.metas.get('forming_forging_2026'),group=meta.contentGroups[0];return {id:group.id,count:QUESTION_BANK.filter(q=>q.contentGroup===group.id).length};});
  await page.locator('[data-content-topic="'+target.id+'"]').click();
  assert.equal(await count('all'),target.count);
  await card('all').click();assert.match(await page.locator('#main h2').innerText(),new RegExp(' · '+target.count+' 题$'));
  assert.deepEqual(errors,[]);
  console.log('PASS overview counts, scoped rows, read-only browsing, pagination, study return, due order, hover, footer and five viewport sizes');
 } finally {await browser.close();}
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
