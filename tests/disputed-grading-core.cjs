// Policy changed by the owner on 2026-11-11: verification flags no longer block original-key grading.
const assert=require('node:assert/strict'),{boot}=require('../scripts/test-app-harness.cjs');
for(const type of ['single','multiple','judge']){
 const {w,t}=boot();w.startStudy('sequence');
 const items=t.getSession().items,index=items.findIndex(i=>i.renderType===type),item=items[index];
 item.q.analysis={status:'needs_source',topic:'有待查证的原题',why:'保留原始答案及证据缺口'};
 w.jumpQ(index);w.setAnswer(type==='multiple'?[...item.q.answers]:item.q.answers[0]);w.checkStudy();
 assert(item.checked&&item.correct&&item.attemptRecorded,type+' disputed answer must grade');
 const progress=t.getStore().learning[item.q.id];assert.equal(progress.attempts,1);assert.equal(progress.correct,1);assert(progress.due>progress.last);
 w.checkStudy();assert.equal(progress.attempts,1,'repeated clicks must not add attempts');
 assert.equal(item.q.analysis.status,'needs_source','grading does not erase uncertainty');
 const other=items.findIndex((i,n)=>n!==index&&i.renderType===type);w.jumpQ(other);
 const wrong=items[other];wrong.q.analysis={status:'needs_source'};
 const incorrect=wrong.q.options.find(o=>!wrong.q.answers.includes(o));
 w.setAnswer(type==='multiple'?[]:incorrect);if(type==='multiple')w.setAnswer([wrong.q.options[0],...wrong.q.options].filter((v,i,a)=>a.indexOf(v)===i));
 // Use a guaranteed nonmatching set even for all-options-correct multiple choice questions.
 if(type==='multiple'&&t.answerCorrect(wrong,wrong.answer))w.setAnswer([wrong.q.answers[0]]);
 w.checkStudy();assert(wrong.checked&&!wrong.correct);assert.equal(t.getStore().wrong[wrong.q.id].wrongTotal,1);
}
{
 const {w,t}=boot();w.startStudy('sequence');const item=t.getSession().items[0];item.q.analysis={status:'needs_source'};item.q.answers=[];
 w.setAnswer(item.q.options[0]);w.checkStudy();assert.equal(item.checked,false);assert(!item.attemptRecorded,'missing answer must not become a false grade');
}
console.log('PASS disputed single/multiple/judge grading, wrong-book and due dates, no duplicate attempts, uncertainty retained, invalid key blocked');
