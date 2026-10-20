const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{}};vm.createContext(c);
for(const f of ['ultra-core.js','bank-core.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const C=c.window.BANK_CORE,U=c.window.ULTRA_CORE;
const b=JSON.parse(fs.readFileSync('banks/sinotruk-culture.json','utf8'));
assert(C.validate(b));assert.equal(b.meta.name,'中国重汽企业文化知识');assert.equal(b.questions.length,35);
assert.equal(b.questions.reduce((s,q)=>s+q.answers.length,0),72);
let slots=0;
for(const q of b.questions){
 assert.equal(q.type,'fill');assert.deepEqual(q.options,[]);assert.equal((q.stem.match(/_{6,}/g)||[]).length,q.answers.length);
 assert(U.grade(q.blankGrading,q.answers).wholeCorrect,`canonical #${q.id}`);
 assert(U.grade(q.blankGrading,q.answers.map(a=>` “${a}。” `)).wholeCorrect,`punctuation #${q.id}`);
 for(let i=0;i<q.answers.length;i++){
  let wrong=[...q.answers];wrong[i]+='错误';let r=U.grade(q.blankGrading,wrong);
  assert(!r.wholeCorrect);assert.equal(r.correctBlanks,q.answers.length-1);assert(!r.blankResults[i].correct);
  wrong=[...q.answers];wrong[i]='';r=U.grade(q.blankGrading,wrong);assert(!r.wholeCorrect);assert.equal(r.correctBlanks,q.answers.length-1);slots++;
 }
 if(q.answers.length>1&&q.answers[0]!==q.answers[1]){let reversed=[...q.answers];[reversed[0],reversed[1]]=[reversed[1],reversed[0]];assert(!U.grade(q.blankGrading,reversed).wholeCorrect)}
}
assert.equal(slots,72);
const grade=(id,a)=>U.grade(b.questions[id-1].blankGrading,a);
assert(!grade(11,['联合创新','勇攀高峰']).wholeCorrect);
assert(!grade(25,['红心领航中国重气']).wholeCorrect);
assert(grade(25,['红心领航，中国重器']).wholeCorrect);
assert(grade(26,['１＋ｎ']).wholeCorrect);assert(!grade(26,['1N']).wholeCorrect);assert(!grade(26,['1-N']).wholeCorrect);
assert(grade(4,['一','一','三','七']).wholeCorrect);
assert(!grade(28,['黄河杯','中国重汽杯']).wholeCorrect);
assert(!grade(34,['中国重汽集团有限公司']).wholeCorrect);
let bad=structuredClone(b);bad.questions[0].answers.push('伪答案');assert.throws(()=>C.validate(bad));
bad=structuredClone(b);bad.questions[0].blankGrading.ordering='unordered_set';assert.throws(()=>C.validate(bad));
bad=structuredClone(b);bad.questions[0].options=['答案'];assert.throws(()=>C.validate(bad));
bad=structuredClone(b);bad.questions[0].sourceReferences[0].url='javascript:alert(1)';assert.throws(()=>C.validate(bad));
const ctx=C.compile([b],[b.meta.id]);assert.equal(ctx.questions.length,35);assert.equal(new Set(ctx.questions.map(q=>q.id)).size,35);
assert(ctx.questions.every(q=>Number.isSafeInteger(q.id)&&q.id>999999));
console.log('PASS 35道原生填空 72空：标准答案、逐空错误/留空、有序判分、标点全角、关键错字、加号、数字、公司全称、异常题库拒绝');
