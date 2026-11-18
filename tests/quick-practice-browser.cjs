const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve('dist');
const origin = 'https://review.test';
const widths = [320, 390, 430, 768, 1366];

async function screenshot(page, name) {
  if (!process.env.FORMING_SCREENSHOTS) return;
  await fs.mkdir(process.env.FORMING_SCREENSHOTS,{recursive:true});
  await page.screenshot({path:path.join(process.env.FORMING_SCREENSHOTS,name+'.png')});
}

async function contrast(locator) {
  const ratio = await locator.first().evaluate(element => {
    const ctx = document.createElement('canvas').getContext('2d');
    const rgb = color => {
      ctx.clearRect(0,0,1,1);
      ctx.fillStyle=color;
      ctx.fillRect(0,0,1,1);
      return Array.from(ctx.getImageData(0,0,1,1).data);
    };
    const luminance = pixel => {
      const [r,g,b] = pixel.map(x => x/255).map(x => x<=0.04045 ? x/12.92 : ((x+0.055)/1.055)**2.4);
      return 0.2126*r+0.7152*g+0.0722*b;
    };
    const layers = [];
    for(let e=element;e;e=e.parentElement)layers.push(rgb(getComputedStyle(e).backgroundColor));
    const bg = layers.reverse().reduce((base,pixel) => base.map((v,i)=>v*(1-pixel[3]/255)+pixel[i]*pixel[3]/255), [255,255,255]);
    const l1=luminance(rgb(getComputedStyle(element).color)),l2=luminance(bg);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  });
  assert(ratio>=4.5, locator+' contrast '+ratio);
  return Number(ratio.toFixed(2));
}

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
  try {
    const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('shenrenliu_device_mode_v1','guest'));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url()), file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(url.origin!==origin||!file.startsWith(root+path.sep))return route.abort();
      try {await route.fulfill({path:file});} catch {await route.fulfill({status:404,body:''});}
    });
    const ready=()=>page.waitForFunction(()=>window.BANK_RUNTIME?.app);
    await page.goto(origin+'/?banks=forming_forging_2026');await ready();
    await page.evaluate(()=>openSettings());
    await page.locator('#themeSetting').selectOption('dark');
    await page.evaluate(()=>saveSettings());
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    const ratios={};
    for(const width of widths){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>navHome(true));
      const button=page.getByRole('button',{name:'我的计划直通车',exact:true});
      const full=await button.evaluate(e=>{const p=e.parentElement,s=getComputedStyle(p);return Math.abs(e.offsetWidth-(p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)))<3});
      assert(full,'plan button width '+width);
      assert.equal(await page.locator('#main').getByRole('heading',{name:/今日复习|考前冲刺/,includeHidden:true}).count(),0);
      await screenshot(page,'dark-home-'+width);
      await button.click();
      assert(await page.getByRole('heading',{name:'定制计划'}).isVisible());
      ratios.plan=await contrast(page.locator('.plan-batch-control select'));
      await page.evaluate(()=>renderWrongBook());
      ratios.wrongHeading=await contrast(page.locator('.setup-grid button.mode-card h3'));
      ratios.wrongCount=await contrast(page.locator('.setup-grid button.mode-card p'));
      ratios.primary=await contrast(page.locator('#main button.btn.primary'));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await screenshot(page,'dark-wrong-'+width);
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{
      const q=QUESTION_BANK.find(q=>q.type==='single');
      startStudy('sequence',[q]);setAnswer(q.options.find(o=>!q.answers.includes(o)));checkStudy();showExplanation();
    });
    ratios.correctFeedback=await contrast(page.locator('.option.correct .option-result'));
    ratios.wrongFeedback=await contrast(page.locator('.option.wrong .option-result'));
    await screenshot(page,'dark-graded-options');
    await page.evaluate(()=>{navHome(true);renderRealExamSetup();beginRealExam()});
    assert.equal(await page.locator('.pre-confidence').count(),0);
    ratios.question=await contrast(page.locator('.option'));
    ratios.type=await contrast(page.locator('.question-card .tag'));
    await screenshot(page,'dark-exam');
    const ids=await page.evaluate(()=>{
      const s=BANK_RUNTIME.app.getSession();
      s.items.forEach((i,n)=>{
        if(n%2===0)i.answer=i.renderType==='multiple'?[...i.q.answers]:i.q.answers[0];
        else {const miss=i.q.options.find(o=>!i.q.answers.includes(o));
          i.answer=i.renderType==='multiple'?(miss?[miss]:i.q.answers.slice(0,1)):miss;}
      });
      submitExam(true);
      return s.items.map(i=>i.q.id);
    });
    const eggs=page.locator('#eggModal');
    await eggs.waitFor({state:'visible'});await eggs.getByRole('button',{name:'关闭',exact:true}).click();
    const group=page.locator('.result-group').filter({has:page.locator('summary').filter({hasText:/^答对 ·/})});
    await group.locator(':scope > summary').click();
    assert.equal(await group.locator('.review-item').count(),25);
    const id=ids[24], row=page.locator('[data-result-row="group-'+id+'"]');
    await row.locator('details summary').click();
    const guess=row.locator('.guessed-answer');
    const baseline=await page.evaluate(id=>{const s=BANK_RUNTIME.app.getStore();return [s.history[0].score,s.aggregateStats.totalAnswers,s.wrong[id]?.wrongTotal||0]},id);
    assert.equal(baseline[0],50);
    await guess.click();
    assert(await guess.isDisabled());
    await page.evaluate(id=>markGuessedAnswer(id),id);
    assert.deepEqual(await page.evaluate(id=>{const s=BANK_RUNTIME.app.getStore(),w=s.wrong[id];return [w.wrongTotal,w.guessedPapers.length,s.history[0].score,s.aggregateStats.totalAnswers]},id),[baseline[2],1,baseline[0],baseline[1]]);
    const redo=row.getByRole('button',{name:'重练这题'});
    for(const back of ['button','browser']){
      await redo.scrollIntoViewIfNeeded();
      const y=await row.evaluate(e=>e.getBoundingClientRect().top);
      await redo.click();
      await page.locator('.question-card').waitFor();
      if(back==='button')await page.getByRole('button',{name:'返回来源',exact:true}).first().click();
      else await page.evaluate(()=>history.back());
      await row.waitFor({state:'visible'});
      await page.waitForFunction(({selector,y})=>Math.abs(document.querySelector(selector).getBoundingClientRect().top-y)<4,{selector:'[data-result-row="group-'+id+'"]',y},{timeout:4000});
      assert(await row.locator('details').evaluate(e=>e.open));
      await page.waitForTimeout(130);
      assert(await eggs.isHidden());
    }
    await screenshot(page,'dark-result');
    await page.getByRole('button',{name:'回看本次答卷',exact:true}).click();
    const cards=page.locator('.graded-card');
    assert.deepEqual(await cards.evaluateAll(rows=>rows.map(row=>Number(row.dataset.paperQuestion))),ids);
    assert.equal(await cards.locator('.graded-reason p').count(),50);
    assert.equal(await cards.locator('.guessed-answer').count(),25);
    assert.equal(await page.locator('.graded-options button,.graded-card input').count(),0);
    const rightCard=cards.nth(2);
    const chosen=await page.evaluate(()=>BANK_RUNTIME.app.getSession().items[2].answer);
    assert((await rightCard.locator('.graded-right').allTextContents()).some(t=>t.includes(Array.isArray(chosen)?chosen[0]:chosen)));
    await rightCard.locator('.graded-explanation summary').click();
    await rightCard.locator('.graded-explanation .explanation').waitFor({state:'visible',timeout:5000});
    assert.match(await cards.nth(1).locator('.graded-card-head').innerText(),/答错/);
    await rightCard.locator('.guessed-answer').click();
    const retryIds=ids.filter((qid,i)=>i%2===1||qid===id||i===2);
    await screenshot(page,'dark-graded-paper');
    await page.getByRole('button',{name:'返回成绩',exact:true}).click();
    assert(await row.locator('details').evaluate(e=>e.open));
    await page.getByRole('button',{name:'重做错题',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>i.q.id)),retryIds);
    assert(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items.every(i=>i.answer==null)));
    assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getStore().history[0].score),50);
    await page.evaluate(()=>navHome(true));
    await page.reload();await ready();
    await page.evaluate(()=>reviewHistoryPaper(0));
    await page.locator('.question-card').waitFor();
    await page.evaluate(()=>jumpQ(24));
    assert(await page.locator('.question-card .guessed-answer').isDisabled());
    await page.evaluate(()=>{navHome(true);renderWrongBook()});
    const guessed=page.locator('.setup-grid button').filter({hasText:'蒙对待巩固'});
    assert.match(await guessed.innerText(),/2题/);
    await page.evaluate(()=>openSettings());
    await page.locator('#themeSetting').selectOption('light');await page.evaluate(()=>saveSettings());
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.goto(origin+'/?banks=hos_2026,sinotruk_culture_2025_official,forming_forging_2026,forming_casting_2026');await ready();
    for(const width of widths){
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await screenshot(page,'mixed-home-'+width);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS 计划入口，五个宽度的暗色首页和错题本，两种返回方式复位，完整复盘，蒙对持久化，弹窗仅一次。对比度',JSON.stringify(ratios));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
