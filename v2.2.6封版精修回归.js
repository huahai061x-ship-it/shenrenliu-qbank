const assert=require('assert/strict'),{boot}=require('./scripts/test-app-harness.cjs');
const eq=(a,b,m)=>assert.equal(a,b,m);
let x=boot(),q=x.w.QUESTION_BANK.find(q=>q.type==='single');
const legacy={kind:'exam',bankVersion:'v2.2.2',ids:[q.id],answers:[q.answers[0]],renderTypes:[q.type],fillLevels:['standard'],timeMs:[12345],paperId:'legacy'};
for(const v of [undefined,1,2])for(const appVersion of ['v2.1','v2.2.5','different-display-version']){
  const migrated=x.t.sanitizeLastSession({...legacy,schemaVersion:v,bankVersion:appVersion});
  assert(migrated,'旧断点未恢复');eq(migrated.schemaVersion,3);eq(migrated.bankSchemaVersion,1);eq(migrated.appVersion,x.t.APP_VERSION);eq(migrated.answers[0],q.answers[0]);
}
assert(!x.t.sanitizeLastSession({...legacy,schemaVersion:99}),'未来断点schema未拒绝');
assert(!x.t.sanitizeLastSession({...legacy,schemaVersion:3,bankSchemaVersion:99}),'未来题库schema未拒绝');
x.w.beginRealExam('real');x.t.saveSession();let saved=JSON.parse(x.store.shenrenliu_qbank_v1);
eq(saved.lastSession.schemaVersion,3);eq(saved.lastSession.bankSchemaVersion,1);assert(!('bankVersion' in saved.lastSession),'仍保存旧应用版本为兼容标识');
let restore=boot({...saved,favorites:[q.id],wrong:{[q.id]:{count:2}},mastery:{[q.id]:'fuzzy'}});restore.w.resumeLastSession();
eq(restore.t.getSession().items.length,45);assert(restore.t.getStore().favorites.includes(q.id));eq(restore.t.getStore().wrong[q.id].count,2);

// Same attempt contributes only 0/1, without subtracting seven historical contributions.
x=boot({schemaVersion:2,learning:{[q.id]:{lowConfidenceCorrect:7}}});x.w.startStudy('sequence',[q]);let item=x.t.getSession().items[0];item.answer=q.answers[0];x.w.checkStudy();
for(let i=0;i<12;i++){x.w.setConfidence('guess');eq(x.t.getStore().learning[q.id].lowConfidenceCorrect,8);x.w.setConfidence('hesitant');eq(x.t.getStore().learning[q.id].lowConfidenceCorrect,8);x.w.setConfidence('sure');eq(x.t.getStore().learning[q.id].lowConfidenceCorrect,7)}
x.w.setConfidence('guess');eq(x.t.getStore().learning[q.id].lowConfidenceCorrect,8);
// A persisted checked attempt keeps its contribution ownership across resume.
x.w.beginRealExam('real');item=x.t.getSession().items[0];const id=item.q.id;x.t.getStore().learning[id]={attempts:0,correct:0,wrong:0,streak:0,totalMs:0,timedAttempts:0,lowConfidenceCorrect:7};
item.answer=item.q.type==='multiple'?[...item.q.answers]:item.q.answers[0];item.correct=true;item.checked=true;x.t.updateLearning(item,true);x.w.setConfidence('guess');x.t.saveSession();
restore=boot(JSON.parse(x.store.shenrenliu_qbank_v1));restore.w.resumeLastSession();eq(restore.t.getSession().items[0].lowConfidenceContribution,true);
for(let i=0;i<12;i++){restore.w.setConfidence('sure');eq(restore.t.getStore().learning[id].lowConfidenceCorrect,7);restore.w.setConfidence('guess');eq(restore.t.getStore().learning[id].lowConfidenceCorrect,8)}
restore.w.setConfidence('sure');eq(restore.t.getStore().learning[id].lowConfidenceCorrect,7);

// Search normalization applies equally to original/visible content and user input.
x=boot();for(const [hay,query] of [['作业要 领书','作业要领书'],['作业要领书','作业要 领书'],['Standard Work','standard work'],['Standard  Work','standard work'],['60N·m','60N·m'],['5Why','5why'],['2T','２Ｔ'],['质量管理','质量 管理']])assert(x.t.searchTextMatches(hay,query),`${hay} 未匹配 ${query}`);
for(const term of ['作业要领书','5Why','60N·m','质量管理']){x.w.doSearch(term);assert(!x.nodes['#searchResults'].innerHTML.includes('没有匹配结果'),`${term}实际搜题无结果`)}
x.w.doSearch('绝不应该存在的检索词');assert(x.nodes['#searchResults'].innerHTML.includes('没有匹配结果'));

const records=Array.from({length:50},()=>({score:100,count:45,mode:'模拟考试'}));
const early=boot({schemaVersion:2,aggregateStats:{totalExams:2},settings:{lastBackup:Date.now(),lastBackupMetrics:{exams:2,examsSchema:2}}});eq(early.w.__V22_TEST__.backupReminder(),'');early.t.getStore().aggregateStats.totalExams=5;assert(early.w.__V22_TEST__.backupReminder().includes('立即备份'),'50场以内3场新增未提醒');
x=boot({schemaVersion:2,aggregateStats:{totalExams:50,totalAnswers:2250},history:records,settings:{lastBackup:Date.now(),lastBackupMetrics:{exams:50,examsSchema:2,wrong:0,favorites:0}}});
eq(x.t.getStore().history.length,50);eq(x.w.__V22_TEST__.backupReminder(),'');
for(let round=0;round<3;round++){x.w.beginRealExam('real');let s=x.t.getSession();for(const i of s.items){if(i.renderType==='fill'){let e=x.w.HOS_ENHANCED_FILL[i.q.id]||x.w.HOS_PEDAGOGY.fillBank[i.q.id],v=e.variants?.find(v=>v.key===i.fillVariantKey)||e;i.answer=(v.answers||i.q.answers).join('、')}else i.answer=i.q.type==='multiple'?[...i.q.answers]:i.q.answers[0];i.timeMs=5000}s.totalActiveMs=225000;x.w.submitExam()}
eq(x.t.getStore().history.length,50);eq(x.t.getStore().aggregateStats.totalExams,53);assert(x.w.__V22_TEST__.backupReminder().includes('立即备份'),'50场后3场未提示备份');
for(const aggregateStats of [{totalExams:100},undefined]){const old=boot({schemaVersion:2,aggregateStats,history:records,settings:{lastBackup:Date.now(),lastBackupMetrics:{exams:50}}});eq(old.w.__V22_TEST__.backupReminder(),'','旧基线迁移立即误报');eq(old.t.getStore().settings.lastBackupMetrics.exams,aggregateStats?100:50)}

// Result/history use exactly one analyzer in normal, early-submit, unanswered and zero-time cases.
const timingCases=[
  {ms:[10000,10000,70000],answered:[true,true,true],avg:30000,high:1},
  {ms:[10000,10000,70000,300000],answered:[true,true,true,false],avg:30000,high:1},
  {ms:[50000,0,undefined],answered:[false,false,false],avg:0,high:0},
  {ms:[0,undefined,NaN,10000],answered:[true,true,true,true],avg:10000,high:0}
];
for(const spec of timingCases){const y=boot();y.w.beginExam('mixed');const s=y.t.getSession();s.items=s.items.slice(0,spec.ms.length);s.items.forEach((i,k)=>{i.timeMs=spec.ms[k];i.answer=spec.answered[k]?(i.q.type==='multiple'?[...i.q.answers]:i.q.answers[0]):null});s.totalActiveMs=400000;
  const analysis=y.t.analyzeQuestionTimes(s.items);eq(analysis.avgMs,spec.avg);eq(analysis.highCount,spec.high);y.w.submitExam();const rec=y.t.getStore().history[0];eq(rec.avgMs,spec.avg);eq(rec.highCount,spec.high);eq(s.highTimeItems.length,spec.high);eq(rec.durationMs,400000,'整场计时被改变');
  const reloaded=boot(JSON.parse(y.store.shenrenliu_qbank_v1));const persisted=reloaded.t.getStore().history[0];eq(persisted.avgMs,spec.avg);eq(persisted.highCount,spec.high);reloaded.w.renderHistory();assert(reloaded.main.innerHTML.includes(`高耗时 ${spec.high}题`));assert(Number.isFinite(rec.avgMs));
}
console.log('v2.2.6封版精修回归通过：新旧schema、记录保留、12轮信心切换及恢复、OCR/英文/单位搜索、50+3场备份、四类统一时间分析。');
