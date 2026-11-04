const assert=require('node:assert/strict');
global.window=global;require('../bank-core.js');
const C=BANK_CORE,bank={meta:{id:C.HOS,name:'HOS'},questions:[1,2,3].map(id=>({id,type:'single',stem:'题'+id,options:['甲','乙'],answers:['甲']}))};
const ctx=C.compile([bank],[C.HOS]);
const raw=new Map(),storage={getItem:k=>raw.get(k)??null,setItem:(k,v)=>raw.set(k,v),removeItem:k=>raw.delete(k),key:i=>[...raw.keys()][i],get length(){return raw.size}};
function page(){let db=new C.Storage(storage,ctx);const s=db.read();return {db,s,save:()=>db.persist(s)}}
const init=page();Object.assign(init.s,{favorites:[],learningPlans:{},reviewNotes:{},settings:{theme:'light'},history:[],recentSessions:[]});init.save();
const a=page(),b=page();a.s.favorites=[1];a.s.learningPlans.p={title:'A',events:{}};a.save();b.s.favorites.push(2);b.save();
assert.deepEqual(new Set(page().s.favorites),new Set([1,2]));assert.equal(page().s.learningPlans.p.title,'A');assert.equal(b.s.learningPlans.p.title,'A');
const c=page(),d=page();c.s.favorites=c.s.favorites.filter(n=>n!==1);delete c.s.learningPlans.p;c.save();d.s.settings.theme='dark';d.save();assert.deepEqual(page().s.favorites,[2]);assert.equal(page().s.learningPlans.p,undefined);
const e=page(),g=page();e.s.reviewNotes[2]={note:'第一份',time:1};e.save();g.s.reviewNotes[2]={note:'第二份',time:2};assert.throws(g.save,{name:'WorkspaceConflict'});assert.equal(page().s.reviewNotes[2].note,'第一份');assert.equal(g.s.reviewNotes[2].note,'第二份');
const h=page(),j=page();h.s.history.push({paperId:'a',ids:[1],time:2});h.save();j.s.history.push({paperId:'b',ids:[2],time:3});j.save();assert.deepEqual(page().s.history.map(r=>r.paperId),['b','a']);
const fail=page(),before=raw.get(C.KEY),write=storage.setItem;storage.setItem=(k,v)=>{if(k===C.KEY)throw Error('quota');return write(k,v)};fail.s.favorites.push(3);assert.throws(fail.save,/quota/);assert.equal(raw.get(C.KEY),before);storage.setItem=write;fail.save();assert.deepEqual(page().s.favorites,[2,3]);
console.log('PASS 两页新增收藏和计划、取消和删除不复活、同条冲突保留、历史整卷合并、空间不足可重试');
// A temporarily unavailable bank can return after compacted presentation snapshots
// were archived. Legacy papers can share a timestamp without a paperId.
const foreign={meta:{id:'other',name:'其他题库'},questions:[{id:1,type:'judge',stem:'其他题干',options:['对','错'],answers:['对']}]};
const both=C.compile([bank,foreign],[C.HOS,'other']),qid=C.id('other',1);
const full=new C.Storage(storage,both),all=full.read();
const makePaper=stem=>({time:22,ids:[qid],mode:stem,presentationSnapshots:[{questionId:qid,stem}]});
all.history=[makePaper('原卷一'),makePaper('原卷二')];full.persist(all);
const missing=page();assert.equal(missing.s.history.length,0);missing.save();
const returned=new C.Storage(storage,both).read();
assert.deepEqual(returned.history.map(r=>r.presentationSnapshots[0].stem),['原卷一','原卷二']);
console.log('PASS 题库暂缺后恢复两份同毫秒旧试卷及实际题干快照');
