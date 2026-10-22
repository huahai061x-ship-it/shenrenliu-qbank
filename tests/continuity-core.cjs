const assert=require('node:assert/strict'),{boot}=require('../scripts/test-app-harness.cjs');
let x=boot();x.w.beginRealExam();let s=x.t.getSession();s.items=s.items.slice(0,1);let item=s.items[0];item.timeMs=0;item.answer=null;x.t.updateLearning(item,false);x.w.submitExam(true);let store=x.t.getStore();store.history[0].learningPolicyVersion=1;
assert.equal(x.w.EXPERIENCE_CORE.legacyCleanupCandidates().length,1,'explicit blank-only historical evidence should qualify');
// Give the stub only the native dialog/storage methods this flow uses.
x.w.$('#legacyCleanupDialog').close=()=>{};x.c.localStorage.removeItem=k=>delete x.store[k];
let before={answers:store.aggregateStats.totalAnswers,wrong:store.wrong[item.q.id].wrongTotal,score:store.history[0].score};
x.w.applyLegacyCleanup();assert.equal(x.t.getStore().wrong[item.q.id].count,0);assert.equal(x.t.getStore().learning[item.q.id].attempts,0);assert.equal(x.t.getStore().aggregateStats.totalAnswers,0);assert(x.t.getStore().pendingPractice[item.q.id]);assert.equal(x.t.getStore().history[0].score,before.score);assert.equal(x.w.EXPERIENCE_CORE.legacyCleanupCandidates().length,0,'cleanup must be idempotent');
x.w.undoLegacyCleanup();assert.equal(x.t.getStore().wrong[item.q.id].wrongTotal,before.wrong);assert.equal(x.t.getStore().aggregateStats.totalAnswers,before.answers);assert.equal(x.t.getStore().history[0].score,before.score);
// Any actual subsequent attempt excludes the question; zero elapsed time is not proof.
let raw=structuredClone(x.t.getStore());raw.learning[item.q.id].attempts++;raw.learning[item.q.id].wrong++;x=boot(raw);assert.equal(x.w.EXPERIENCE_CORE.legacyCleanupCandidates().length,0);
raw=structuredClone(raw);raw.history[0].questionTimes[0].answered=true;x=boot(raw);assert.equal(x.w.EXPERIENCE_CORE.legacyCleanupCandidates().length,0);
assert.equal(x.w.EXPERIENCE_CORE.examCompletion({ids:[1],questionTimes:[{answered:true}],completionEvidence:false}).complete,false,'missing legacy answered flags cannot be manufactured into completion evidence');
x=boot();x.w.beginRealExam();let source=x.t.getSession(),presentations=JSON.stringify(source.items.map(i=>i.presentationSnapshot));x.w.submitExam(true);x.w.startPendingPractice(true);assert.equal(JSON.stringify(x.t.getSession().items.map(i=>i.presentationSnapshot)),presentations,'pending practice must retain original rendered types and fill variants, not regenerate original questions');
let practice=x.t.getSession();practice.totalActiveMs=9000;practice.items[0].timeMs=6000;x.w.pausePractice();x.w.resumePractice();assert.equal(x.t.getSession().totalActiveMs,9000,'resuming cannot reset elapsed time');assert.equal(x.t.getSession().items[0].timeMs,6000);
console.log('PASS 历史空白严格证据、后续作答保护、整理幂等、撤销与原成绩保留、缺失旧记录不推断完成');
