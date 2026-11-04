const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(process.env.PAIRED_TEST_ROOT || '.');
const origin = 'https://training.test';
const browserPath = process.env.CHROME_BIN;

(async () => {
  const browser = await chromium.launch({executablePath:browserPath});
  try {
    const context = await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const file = path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(url.origin!==origin || !file.startsWith(root+path.sep))return route.abort();
      await route.fulfill({path:file}).catch(()=>route.fulfill({status:404,body:''}));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.waitForFunction(()=>!!window.BANK_RUNTIME?.app);
    const go = async bank => {
      await page.goto(origin+'/?banks='+bank);
      await ready();
    };
    const list = () => page.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(item=>item.q.sourceQuestionId));
    const start = async (size,scope='all') => page.evaluate(({size,scope})=>{
      // Preserve the input order for a deterministic five-question sample.
      const random=Math.random;
      try {
        Math.random=()=>0.999999;
        if(size)startPracticeBatch(size,scope);
        else startStudy('random',null,scope);
      }finally{Math.random=random}
    },{size,scope});
    const wrong = async () => page.evaluate(()=>{
      const item=BANK_RUNTIME.app.getSession().items.find(i=>i.q.stem===document.querySelector('.q-stem').textContent);
      const index=item.optionOrder.findIndex(opt=>!item.q.answers.includes(opt));
      chooseOption(index);checkStudy();
    });

    await go('forming_forging_2026');
    await start(5);
    assert.deepEqual(await list(),[1,2,3,4,5]);
    await page.evaluate(()=>jumpQ(1));await wrong();
    assert.deepEqual(await list(),[1,2,3,4,114]);
    await page.evaluate(()=>setStudyScope('all'));
    assert.deepEqual(await list(),[1,2,3,4,114]);
    await page.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
    await page.reload();await ready();
    await page.getByRole('button',{name:'继续上次练习',exact:true}).first().click();
    assert.deepEqual(await list(),[1,2,3,4,114]);
    await page.evaluate(()=>jumpQ(4));
    assert.match(await page.locator('.question-card').innerText(),/换个角度.*#2/);
    const follow=await page.evaluate(()=>{const i=BANK_RUNTIME.app.getSession().items[4];return [i.renderType,i.q.type,i.q.answers,i.answer,i.q.stem]});
    assert.deepEqual(follow.slice(0,4),['single','single',['综合力学性能'],null]);
    assert.equal(await page.locator('.q-stem').innerText(),follow[4]);

    await start(5);
    await page.evaluate(()=>{jumpQ(1);const item=BANK_RUNTIME.app.getSession().items[1];chooseOption(item.optionOrder.indexOf(item.q.answers[0]));checkStudy()});
    assert.deepEqual(await list(),[1,2,3,4,5]);
    await start(5);
    await page.evaluate(()=>{jumpQ(1);showAnswer();checkStudy()});
    assert.deepEqual(await list(),[1,2,3,4,5]);
    // Previously visited slots and a pair excluded by the mastery filter stay untouched.
    await start(5);await page.evaluate(()=>{jumpQ(4);jumpQ(1)});await wrong();
    assert.deepEqual(await list(),[1,2,3,4,5]);
    await page.evaluate(()=>setMastery(QUESTION_BANK.find(q=>q.sourceQuestionId===114).id,'mastered'));
    await start(5,'unmastered');await page.evaluate(()=>jumpQ(1));await wrong();
    assert.deepEqual(await list(),[1,2,3,4,5]);
    await page.evaluate(()=>startStudy('sequence'));await page.evaluate(()=>jumpQ(1));await wrong();
    assert.equal((await list())[4],5);

    // A full casting queue moves the existing partner and retains every original question.
    await go('forming_casting_2026');await start();
    await page.evaluate(()=>{jumpQ(41);setConfidence('hesitant');const item=BANK_RUNTIME.app.getSession().items[41];chooseOption(item.optionOrder.indexOf(item.q.answers[0]));checkStudy()});
    const casting=await list();
    assert.equal(casting[44],392);assert.equal(new Set(casting).size,460);
    const judge=await page.evaluate(()=>BANK_RUNTIME.app.getSession().items[44].renderType);
    assert.equal(judge,'judge');
    await page.evaluate(()=>{renderRealExamSetup();beginRealExam()});
    const exam=await page.evaluate(()=>BANK_RUNTIME.app.getSession().items);
    assert.equal(exam.length,50);
    assert(exam.every(i=>i.renderType===i.q.type&&!i.relatedFrom));

    await go('forming_forging_2026');
    await page.evaluate(()=>{reviewOne(QUESTION_BANK.find(q=>q.sourceQuestionId===86).id);showAnswer()});
    const details=page.locator('details').filter({has:page.locator('summary').filter({hasText:'对照两道原题'})});
    await details.locator('summary').click();
    const text=await details.innerText();
    assert.match(text,/#86/);assert.match(text,/#88/);
    assert.match(text,/300-400/);assert.match(text,/200---300/);
    // A user-imported bank can supply legacy fill material, but new papers still use its original tests.
    const culture=require('../banks/sinotruk-culture-official.json');
    const question=structuredClone(culture.questions[0]);delete question.contentGroup;
    const oldFill=structuredClone(culture.pedagogy.fillBank[1]);delete oldFill.gradeSpec;
    const objective={meta:{id:'custom_objective',name:'导入选择题'},questions:[question],pedagogy:{fillBank:{1:oldFill}}};
    const native=structuredClone(require('../banks/sinotruk-culture.json').questions[0]);native.id=2;
    const mixed={meta:{id:'custom_mixed',name:'导入多种题型'},questions:[question,native],pedagogy:objective.pedagogy};
    await page.evaluate(banks=>localStorage.setItem('shenrenliu_qbank_custom_banks_v1',JSON.stringify(banks)),[objective,mixed]);
    const makePaper=async()=>{
      await page.evaluate(()=>renderRealExamSetup());
      await page.getByRole('button',{name:'开始模拟',exact:true}).click();
      return page.evaluate(()=>BANK_RUNTIME.app.getSession().items.map(i=>[i.q.bankId,i.q.type,i.renderType]));
    };
    await go('custom_objective');
    const smallPaper=await makePaper();
    assert.deepEqual(smallPaper,[['custom_objective','single','single']]);
    await page.evaluate(()=>{const item=BANK_RUNTIME.app.getSession().items[0];item.renderType='fill';item.presentationSnapshot=null});
    await page.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
    await page.reload();await ready();
    await page.getByRole('button',{name:/继续.*考试/}).last().click();
    assert.equal(await page.evaluate(()=>BANK_RUNTIME.app.getSession().items[0].renderType),'fill');
    await go('custom_objective');
    await page.evaluate(()=>renderSpecialSetup('exam'));
    assert.equal(await page.locator('.special-type-grid button').filter({hasText:'填空'}).count(),0);
    await go('custom_mixed');
    assert.deepEqual(await makePaper(),[['custom_mixed','single','single'],['custom_mixed','fill','fill']]);
    await go('custom_mixed,forming_forging_2026');
    const multiBank=await makePaper();assert.equal(multiBank.length,50);
    assert(multiBank.every(([,original,render])=>original===render));
    assert(multiBank.some(([bank,,render])=>bank==='custom_mixed'&&render==='fill'));
    await go('sinotruk_culture_2025_official');
    await page.evaluate(()=>{renderRealExamSetup();beginRealExam()});
    const originalCulture=await page.evaluate(()=>BANK_RUNTIME.app.getSession().items);
    assert.equal(originalCulture.length,45);
    assert.equal(originalCulture.filter(i=>i.renderType==='fill'&&i.q.type!=='fill').length,10);
    console.log('PASS 导入纯选择题单库可开卷、专项不改编、单库及跨库保留原生填空、旧题型与已有授权试卷恢复');
    assert.deepEqual(errors,[]);
    console.log('PASS 同考点原题间隔两题出现、恢复保序、保持题量与作答状态、过滤已掌握、考试原题型、两份冲突原文可对照');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
