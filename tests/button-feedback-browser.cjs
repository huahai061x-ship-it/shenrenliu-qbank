const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve('dist'), origin='https://interaction.test';

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url()), file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(url.origin!==origin||!file.startsWith(root+path.sep))return route.abort();
      try {await route.fulfill({path:file});} catch {await route.fulfill({status:404,body:''});}
    });
    const ready=()=>page.waitForFunction(()=>window.BANK_RUNTIME?.app);
    await page.goto(origin+'/?banks=forming_forging_2026');await ready();
    const plan=page.locator('.plan-express');
    await plan.scrollIntoViewIfNeeded();
    const box=await plan.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    assert(await plan.evaluate(e=>e.hasAttribute('data-pressing')&&getComputedStyle(e).filter!=='none'));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-45}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert(await plan.evaluate(e=>!e.hasAttribute('data-pressing')));
    await page.emulateMedia({reducedMotion:'reduce'});
    await plan.focus();await page.keyboard.down('Space');
    assert(await plan.evaluate(e=>e.hasAttribute('data-pressing')&&getComputedStyle(e).scale==='none'));
    await page.keyboard.up('Space');await page.getByRole('heading',{name:'新建学习计划'}).waitFor();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{navHome(true);renderRealExamSetup();beginRealExam()});
    let option=page.locator('.option').first();await option.tap();
    assert.equal(await option.getAttribute('aria-pressed'),'true');
    const result=await page.evaluate(()=>{
      const app=BANK_RUNTIME.app,s=app.getSession();
      const index=s.items.findIndex(i=>i.renderType==='multiple'&&i.q.options.length>=3);
      if(index<0)throw Error('本卷缺少多选题');
      jumpQ(index);
      window.examWrites=0;
      const persist=BANK_RUNTIME.persistStore;
      BANK_RUNTIME.persistStore=function(...args){window.examWrites++;return persist.apply(this,args)};
      const opts=Array.from(document.querySelectorAll('.options .option')),item=s.items[index],order=item.optionOrder;
      let times=[];
      for(const n of [0,1,0,2]){
        const start=performance.now();opts[n].click();times.push(performance.now()-start);
      }
      return {index,paper:s.paperId,selected:opts.map(b=>b.getAttribute('aria-pressed')),answers:[order[1],order[2]],actual:item.answer,same:opts[0]===document.querySelector('.option'),writes:window.examWrites,times};
    });
    assert.deepEqual(result.actual,result.answers);
    assert.deepEqual(result.selected.slice(0,3),['false','true','true']);
    assert(result.same);assert.equal(result.writes,0);
    await page.waitForFunction(()=>window.examWrites>=1);
    assert.equal(await page.evaluate(()=>window.examWrites),1);
    assert.deepEqual(await page.evaluate(i=>BANK_RUNTIME.app.getStore().lastSession.answers[i],result.index),result.answers);
    const immediate=await page.evaluate(i=>{
      document.querySelectorAll('.option')[1].click();
      window.dispatchEvent(new Event('pagehide'));
      return BANK_RUNTIME.app.getStore().lastSession.answers[i];
    },result.index);
    assert.deepEqual(immediate,[result.answers[1]]);
    // Reload from the same event turn as a last-minute change.
    await Promise.all([page.waitForNavigation(),page.evaluate(()=>{
      document.querySelectorAll('.option')[1].click();location.reload();
    })]);
    await ready();await page.evaluate(id=>resumeSavedActivity(id),result.paper);
    assert.deepEqual(await page.evaluate(i=>BANK_RUNTIME.app.getSession().items[i].answer,result.index),[result.answers[1],result.answers[0]]);
    await page.evaluate(()=>{
      const s=BANK_RUNTIME.app.getSession(),n=s.items.findIndex(i=>i.renderType==='single');
      jumpQ(n);
      const opts=document.querySelectorAll('.option');opts[0].click();opts[1].click();
      if(opts[0].getAttribute('aria-pressed')!=='false'||opts[1].getAttribute('aria-pressed')!=='true')throw Error('单选改选');
      submitExam(true);submitExam(true);
    });
    await page.waitForTimeout(550);
    const record=await page.evaluate(()=>{const s=BANK_RUNTIME.app.getStore();return [s.history.length,s.lastSession]});
    assert.deepEqual(record,[1,null]);assert.deepEqual(errors,[]);
    if(process.env.FORMING_SCREENSHOTS)await fs.writeFile(path.join(process.env.FORMING_SCREENSHOTS,'exam-tap-timings.json'),JSON.stringify(result.times));
    console.log('PASS 真触摸按下、滑动取消、键盘与减少动效。考试多选四次点选同步整卷写入 0 次，合并后 1 次。立即刷新、切后台和重复交卷通过。单次点击处理耗时（Chrome，毫秒）',result.times);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
