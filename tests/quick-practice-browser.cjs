const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),out=path.resolve(process.env.QUICK_TEST_OUTPUT||'../../outputs/hero-ten-20261107/browser');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});const errors=[],results=[];try{
 const ctx=await browser.newContext({serviceWorkers:'block'}),p=await ctx.newPage(),base=process.env.LIVE_URL||'https://quick.test/',root=path.resolve('dist');
 if(!process.env.LIVE_URL)await ctx.route(base+'**',r=>{const n=new URL(r.request().url()).pathname,f=path.resolve(root,'.'+(n==='/'?'/index.html':n));return f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
 p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?banks=forming_forging_2026');await p.waitForFunction(()=>window.BANK_RUNTIME?.app);
 for(const width of [320,390,430,768,1024,1366,1920]){
  await p.setViewportSize({width,height:900});await p.locator('.lulu-button img').evaluate(e=>e.decode());
  const layout=await p.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,center:r.y+r.height/2}};return {overflow:document.documentElement.scrollWidth>innerWidth,topic:box('.home-topic-trigger'),start:box('.hero-start'),copy:box('.hero-copy'),mascot:box('.lulu-mascot')}});
  assert(!layout.overflow);assert(layout.topic.h>=(width<=600?48:52));assert(layout.start.h>=(width<=600?50:56));assert(Math.abs(layout.copy.center-layout.mascot.center)<1);assert(layout.start.y+layout.start.h<=900);
  await p.locator('.hero-main').screenshot({path:path.join(out,'home-'+width+'.png')});results.push({width,layout});
 }
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'先练 10 题',exact:true}).click();
 const first=await p.evaluate(()=>{const s=BANK_RUNTIME.app.getSession();return {paperId:s.paperId,ids:s.items.map(i=>i.q.id),types:s.items.map(i=>i.renderType),original:s.items.every(i=>i.renderType===i.q.type),topics:s.items.map(i=>i.q.contentGroup)}});
 assert.equal(first.ids.length,10);assert.equal(new Set(first.types).size,3);assert.equal(new Set(first.topics).size,5);assert(first.original);
 await p.locator('.option').first().click();await p.getByRole('button',{name:'下一题',exact:true}).click();await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();await p.reload();await p.waitForFunction(()=>window.BANK_RUNTIME?.app);await p.getByRole('button',{name:'继续练习 · 第 2 题',exact:true}).click();
 assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getSession().paperId),first.paperId);assert.deepEqual(await p.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>i.q.id)),first.ids);
 await p.evaluate(()=>{for(let i=0;i<10;i++)jumpQ(i);finishPracticeHome()});await p.reload();await p.waitForFunction(()=>window.BANK_RUNTIME?.app);await p.getByRole('button',{name:'先练 10 题',exact:true}).click();
 const second=await p.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>i.q.id));assert(second.every(id=>!first.ids.includes(id)));
 await p.evaluate(()=>{for(let i=0;i<10;i++)jumpQ(i);finishPracticeHome();openContentTopicPicker()});await p.locator('.content-topic-options button').nth(1).click();await p.locator('.hero-start').click();assert.equal(await p.evaluate(()=>new Set(BANK_RUNTIME.app.getSession().items.map(i=>i.q.contentGroup)).size),1);
 await p.evaluate(()=>{finishPracticeHome();BANK_RUNTIME.app.getStore().settings.theme='dark';navHome(true)});assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');
 await p.locator('.hero-main').screenshot({path:path.join(out,'home-dark-390.png')});
 await p.goto(base+'?banks=hos_2026,sinotruk_culture_2025_official,forming_forging_2026,forming_casting_2026');await p.waitForFunction(()=>window.BANK_RUNTIME?.app);
 for(const width of [390,768,1366]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('.hero-main').screenshot({path:path.join(out,'mixed-'+width+'.png')});}
 await p.locator('.hero-start').click();assert.equal(await p.evaluate(()=>new Set(BANK_RUNTIME.app.getSession().items.map(i=>i.q.bankId)).size),4);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,first,second,errors,resume:true,filtered:true,mixed:true},null,2));console.log(JSON.stringify({widths:results.map(r=>r.width),firstTopics:new Set(first.topics).size,firstTypes:new Set(first.types).size,nextBatchOverlap:0,resume:true,filtered:true,mixed:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
