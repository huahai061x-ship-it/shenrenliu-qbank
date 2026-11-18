const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve('dist');
const origin = 'https://editions.test';

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN});
  try {
    const page = await browser.newPage({serviceWorkers:'block'});
    await page.addInitScript(() => localStorage.setItem('shenrenliu_device_mode_v1','guest'));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const file = path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(url.origin!==origin || !file.startsWith(root+path.sep))return route.abort();
      try { await route.fulfill({path:file}); }
      catch { await route.fulfill({status:404,body:''}); }
    });
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    const ready = () => page.waitForFunction(()=>window.BANK_RUNTIME?.app);
    for(const [bank,changed] of [['casting',25],['forging',54]]){
      await page.goto(origin+'/?banks=forming_'+bank+'_2026'); await ready();
      const count=await page.evaluate(()=>{
        const revised=QUESTION_BANK.filter(q=>q.previousEdition);
        for(const q of revised){
          startStudy('sequence',[q]);
          const item=BANK_RUNTIME.app.getSession().items[0];
          setAnswer(q.type==='multiple'?[...q.answers]:q.answers[0]);
          checkStudy();
          if(!item.checked || !item.correct)throw Error('新版判分失败 '+q.originalLabel);
        }
        return revised.length;
      });
      assert.equal(count,changed);
    }
    const oldPaper=await page.evaluate(()=>{
      navHome(true);renderRealExamSetup();beginRealExam();
      const s=BANK_RUNTIME.app.getSession();
      const current=QUESTION_BANK.find(q=>q.sourceQuestionId===337);
      const q={...current,...current.previousEdition};
      const item={...s.items[0],q,renderType:q.type,optionOrder:[...q.options].reverse(),presentationSnapshot:null,answer:[...q.answers]};
      s.items=[item]; const id=s.paperId;
      pauseAndSave();
      return id;
    });
    await page.reload(); await ready();
    await page.evaluate(id=>resumeSavedActivity(id),oldPaper);
    assert.deepEqual(await page.evaluate(()=>{
      const i=BANK_RUNTIME.app.getSession().items[0];return [i.renderType,i.answer,i.q.answers];
    }),['multiple',['脱碳','错移'],['脱碳','错移']]);
    await page.evaluate(()=>submitExam(true));
    const history=await page.evaluate(()=>BANK_RUNTIME.app.getStore().history[0]);
    assert.equal(history.score,100);assert.ok(!history.paperDamaged);
    await page.reload();await ready();
    await page.evaluate(()=>reviewHistoryPaper(0));
    assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items[0].q.type),'multiple');
    await page.evaluate(()=>setReviewMode('original'));
    assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items[0].q.type),'single');
    for(const width of [320,390,430,768,1366]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>{const q=QUESTION_BANK.find(x=>x.sourceQuestionId===337);reviewOne(q.id);showExplanation();});
      assert(await page.getByText(/普通氧化性气氛下/).first().isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(process.env.FORMING_SCREENSHOTS){
        await fs.mkdir(process.env.FORMING_SCREENSHOTS,{recursive:true});
        await page.screenshot({path:path.join(process.env.FORMING_SCREENSHOTS,'forging-337-'+width+'.png')});
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS 两库全部79道修订原题实际提交，旧多选暂停续考、原分复盘、新版单选和五种屏宽');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
