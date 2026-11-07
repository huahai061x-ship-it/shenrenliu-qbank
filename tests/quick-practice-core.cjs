const assert=require('node:assert/strict'),{boot}=require('../scripts/test-app-harness.cjs');
const x=boot(),pick=x.w.EXPERIENCE_CORE.representativePracticePick;
const pool=Array.from({length:80},(_,i)=>({id:10000+i,bankId:'bank'+Math.floor(i/40),contentGroup:'topic'+Math.floor(i%40/10),type:['single','multiple','judge'][i%3],stem:'原题'+i,answers:['原答案']}));
const state={seen:{},learning:{}},before=JSON.stringify({pool,state}),first=pick(pool,10,state);
assert.equal(first.length,10);assert.equal(new Set(first.map(q=>q.id)).size,10);
assert.equal(new Set(first.map(q=>q.bankId)).size,2);assert.equal(new Set(first.map(q=>q.bankId+'/'+q.contentGroup)).size,8);assert.equal(new Set(first.map(q=>q.type)).size,3);
assert.equal(JSON.stringify({pool,state}),before,'抽题不修改题目、答案或学习记录');
const used=new Set();for(let round=1;round<=8;round++){const batch=pick(pool,10,state);for(const q of batch){assert(!used.has(q.id),'先覆盖未看过的题');used.add(q.id);state.seen[q.id]=round*1000;}}
assert.equal(used.size,80);const ninth=pick(pool,10,state);assert(ninth.every(q=>state.seen[q.id]<=6000),'全库覆盖后避开最近两轮');
assert.equal(pick([],10,state).length,0);assert.equal(pick(pool,0,state).length,0);assert.equal(pick(pool.slice(0,3),10,state).length,3);assert.equal(pick([...pool,pool[0]],80,state).length,80);
const onlyPending=pool.slice(0,5).map(q=>({...q,reviewStatus:'pending'}));assert.equal(pick(onlyPending,10,{}).length,5,'待核验题不被过滤');
const filtered=pool.filter(q=>q.contentGroup==='topic2');assert(pick(filtered,10,state).every(q=>q.contentGroup==='topic2'));
const variants=new Set(Array.from({length:12},()=>pick(pool,10,{}).map(q=>q.id).join(',')));assert(variants.size>1,'相同覆盖要求内随机换题');
console.log('PASS 十题覆盖题库／分类／原题型，连续八轮覆盖80题无重复，已覆盖后避开近期题，保留待核验，小题池与空范围安全，不伪造学习记录');
