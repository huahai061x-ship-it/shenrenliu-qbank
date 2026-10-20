const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{}};vm.createContext(c);for(const f of ['questions.js','hos-analysis.js','explanation-core.js','ultra-core.js','bank-core.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const w=c.window,Q=w.QUESTION_BANK,A=w.HOS_ANALYSIS,E=w.EXPLANATION_CORE;
assert.equal(Q.length,507);assert.equal(Object.keys(A).length,507);
const bank={meta:{id:'hos_2026',name:'HOS'},questions:Q,explanations:A};
assert(E.validateBank(bank,{allowPending:true}));assert.throws(()=>E.validateBank(bank),/未核准/);
let n=0;for(const q of Q){let a=A[q.id];assert.deepEqual(Array.from(E.check(q,a)),[],`#${q.id}`);if(q.type!=='judge'){assert.equal(Object.keys(a.optionReasons).length,q.options.length);for(const o of [...q.options].reverse()){assert(a.optionReasons[o]);n++}}else if(q.answers[0]==='错')assert(a.correction.length>=12)}
assert.equal(Object.values(A).filter(a=>a.status==='needs_source').length,8);
assert.deepEqual(Object.keys(A).filter(n=>A[n].status==='needs_source').map(Number),[150,238,343,394,422,436,438,505]);
let q=Q[0],a=JSON.parse(JSON.stringify(A[q.id]));a.why='这个选项与正确答案不一致';assert(E.check(q,a).length);a=JSON.parse(JSON.stringify(A[q.id]));delete a.optionReasons[q.options[0]];assert(E.check(q,a).length);
assert.throws(()=>E.validateBank({questions:[q]}),/缺少/);
const jq=Q.find(q=>q.type==='judge'&&q.answers[0]==='错'),ja=JSON.parse(JSON.stringify(A[jq.id]));delete ja.correction;assert(E.check(jq,ja).some(s=>s.includes('改正')));
for(const f of fs.readdirSync('banks').filter(f=>f.endsWith('.json'))){const b=JSON.parse(fs.readFileSync('banks/'+f,'utf8'));if(b.questions)assert(E.validateBank(b))}
assert(E.validateBank({questions:[{type:'fill'}]}));
const ctx=w.BANK_CORE.compile([bank],['hos_2026']);assert(ctx.questions.every(q=>q.analysis&&q.analysis.topic));
const data=JSON.parse(fs.readFileSync('explanations/hos-analysis.json','utf8'));assert.equal(JSON.stringify(data),JSON.stringify(A));
// The generation output must remain synchronized with the manually maintained notes.
const expected=fs.readFileSync('hos-analysis.js','utf8');assert(expected.includes(JSON.stringify(data,null,2)));
console.log(`PASS 507逐题解析、${n}个选项理由、全部错判断改正、8题待核验、乱序文字绑定、空话及缺项拦截、填空豁免、运行时编译`);
