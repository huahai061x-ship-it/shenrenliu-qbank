const assert=require('node:assert/strict');
const {boot}=require('./scripts/test-app-harness.cjs');

let x=boot(),core=x.w.ULTRA_CORE,candidates=x.w.ULTRA_CANDIDATES;
assert.equal(candidates.length,17);
assert.equal(candidates.filter(c=>c.kind==='multi_blank').length,7);
assert.equal(candidates.filter(c=>c.autoGrade===false).length,10);
assert(candidates.every(c=>c.sourceReview.startsWith('已对照原图人工抽查')));
for(const c of candidates){
  assert(c.sourceQuestionIds.every(id=>x.w.QUESTION_BANK.some(q=>q.id===id)));
  assert(c.sourceImages.every(page=>Number.isInteger(page)&&page>=1&&page<=111));
  if(c.kind==='multi_blank'){
    const spec=core.candidateSpec(c);
    assert(spec&&spec.sourceChecked);
    assert.equal(spec.blanks.length,(spec.stem.match(/______/g)||[]).length);
    assert(core.grade(spec,spec.blanks.map(b=>b.canonical)).wholeCorrect);
    assert(!core.grade(spec,spec.blanks.map(()=>'')).wholeCorrect);
    assert(!core.grade(spec,spec.blanks.map(b=>b.canonical+'错')).wholeCorrect);
  }
}
const m133=core.candidateSpec(candidates.find(c=>c.candidateId==='M-133'));
const canonical=m133.blanks.map(b=>b.canonical);
assert(core.grade(m133,[canonical[2],canonical[0],canonical[1]]).wholeCorrect,'无序题换位应全对');
assert.deepEqual(JSON.parse(JSON.stringify(core.grade(m133,[canonical[0],canonical[0],canonical[1]]))).correctBlanks,2,'重复词不得重复匹配');
const m132=core.candidateSpec(candidates.find(c=>c.candidateId==='M-132'));
assert(!core.grade(m132,m132.blanks.map(b=>b.canonical).reverse()).wholeCorrect,'固定角色的空位不得换位');
assert(!core.grade(m132,['',m132.blanks[1].canonical]).wholeCorrect);
assert(core.grade(m132,['',m132.blanks[1].canonical]).blankResults[1].correct);
assert(!core.grade(m132,[m132.blanks[0].canonical+'kg',m132.blanks[1].canonical]).wholeCorrect,'单位、字词差异不能模糊判对');

const multiSeen=new Set();
for(let run=0;run<20;run++){
  x=boot();x.w.beginRealExam('real');
  const s=x.t.getSession();assert.equal(s.title,'真实模拟 Ultra');
  assert.equal(s.items.length,45);
  for(const [type,n] of [['single',15],['multiple',10],['judge',10],['fill',10]])assert.equal(s.items.filter(i=>i.renderType===type).length,n);
  assert.equal(new Set(s.items.map(i=>i.q.id)).size,45);
  const multi=s.items.filter(i=>i.presentationSnapshot?.blankConfig?.gradeSpec);
  assert.equal(multi.length,4);
  multi.forEach(i=>multiSeen.add(i.q.id));
  assert.equal(s.items.filter(i=>i.renderType==='fill'&&!i.presentationSnapshot?.blankConfig?.gradeSpec).length,6);
}
assert(multiSeen.size>=4);

x=boot();x.w.beginRealExam('real');
let session=x.t.getSession(),pos=session.items.findIndex(i=>i.presentationSnapshot?.blankConfig?.gradeSpec);
assert(pos>=0);x.w.jumpQ(pos);
let item=session.items[pos],spec=item.presentationSnapshot.blankConfig.gradeSpec;
x.w.setBlankAnswer(0,spec.blanks[0].canonical);
assert.equal(item.answer[0],spec.blanks[0].canonical);
x.t.saveSession();
assert.equal(x.t.getStore().lastSession.answers[pos][0],spec.blanks[0].canonical);
let y=boot(JSON.parse(x.store.shenrenliu_qbank_v1));y.w.resumeLastSession();
let recovered=y.t.getSession().items[pos];
assert.deepEqual(JSON.parse(JSON.stringify(recovered.answer)),JSON.parse(JSON.stringify(item.answer)));
assert.deepEqual(JSON.parse(JSON.stringify(recovered.presentationSnapshot.blankConfig.gradeSpec)),JSON.parse(JSON.stringify(spec)));
assert(!y.t.answerCorrect(recovered,recovered.answer));
y.w.submitExam(true);
let rec=y.t.getStore().history[0];
assert.equal(rec.count,45);
assert.equal(rec.questionTimes[pos].answered,false,'只填部分空不算已答完');
assert.equal(rec.blankResults[pos].length,spec.blanks.length);
assert.equal(rec.blankResults[pos].filter(r=>r.correct).length,1);
assert.equal(rec.correct,0);
let historic=boot(JSON.parse(y.store.shenrenliu_qbank_v1)).t.getStore().history[0];
assert.deepEqual(JSON.parse(JSON.stringify(historic.blankResults[pos])),JSON.parse(JSON.stringify(rec.blankResults[pos])));
assert(historic.presentationSnapshots[pos].blankConfig.gradeSpec);

x=boot();x.w.renderOpenQuestion('R-110');
assert(!x.main.innerHTML.includes('<b>参考答案</b>'),'提交前不能显示答案');
x.w.setOpenAnswer('R-110','我先写自己的理解');
x.t.saveStore();
let draft=boot(JSON.parse(x.store.shenrenliu_qbank_v1));
assert.equal(draft.t.getStore().openStudy['R-110'].state,'draft');
draft.w.submitOpenAnswer('R-110');
assert(draft.main.innerHTML.includes('参考答案'));
assert.equal(draft.t.getStore().openStudy['R-110'].state,'submitted');
draft.w.rateOpenAnswer('R-110','partial');
const restored=boot(JSON.parse(draft.store.shenrenliu_qbank_v1));
assert.equal(restored.t.getStore().openStudy['R-110'].state,'partial');
restored.w.renderOpenStudy('review');
assert(restored.main.innerHTML.includes('R-110')||restored.main.innerHTML.includes('原题 #110'));
console.log('v2.3 Ultra校验通过：17条经核验候选、20场45题比例、逐空严格评分/换位/重复/部分正确、断点与历史、简答先答后看及自评恢复。');
