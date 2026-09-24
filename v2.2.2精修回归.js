const fs=require('fs'),vm=require('vm');
function cl(){const s=new Set();return {add:k=>s.add(k),remove:k=>s.delete(k),toggle(k,on){on?s.add(k):s.delete(k)},contains:k=>s.has(k)}}
function boot(initial=''){
  const main={innerHTML:''},watermark={textContent:''},store={shenrenliu_qbank_v1:initial};
  const controls={'#realExamRule':{value:'normal'},'#countBtns .active':{dataset:{n:'30'}},'#examRule':{value:'normal'},'#fillRatio':{value:'15'},'#typeFilter':{value:'all'},'#sprintCountBtns .active':{dataset:{n:'30'}}};
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:cl(),append(){}},querySelector:s=>s==='#main'?main:s==='#watermark'?watermark:controls[s]||null,querySelectorAll:()=>[],addEventListener(){},createElement(){return {style:{},classList:cl(),append(){},remove(){},click(){},select(){}}},execCommand(){return true}};
  const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:false},document,localStorage,location:{protocol:'file:',href:'file:///test'},navigator:{},history:{pushState(){},replaceState(){}},performance:{now:()=>1000},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
  Object.assign(c.window,{window:c.window,document,localStorage,location:c.location,navigator:c.navigator});vm.createContext(c);for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});return {c,store,main,controls};
}
function ok(v,m){if(!v)throw Error(m)}
function answerAll(x,good=true){const s=x.c.window.__V22_TEST__.getSession();for(const item of s.items){const e=x.c.window.HOS_ENHANCED_FILL[item.q.id]||x.c.window.HOS_PEDAGOGY.fillBank[item.q.id];item.timeMs=8000;if(good)item.answer=item.renderType==='fill'?((e?.variants?.find(v=>v.key===item.fillVariantKey)||e)?.answers||item.q.answers).join('、'):item.q.type==='multiple'?[...item.q.answers]:item.q.answers[0];else item.answer=item.renderType==='fill'?'__WRONG__':(item.q.options.find(o=>!item.q.answers.includes(o))||'__WRONG__')}s.totalActiveMs=s.items.reduce((n,i)=>n+i.timeMs,0);x.c.window.submitExam()}

// 1) v2.2.2 version loads and ordinary simulation really honors option shuffle.
let x=boot();
x.c.window.beginExam('mixed');
let s=x.c.window.__V22_TEST__.getSession();
ok(s.items.length===30,'普通模拟题量异常');
let shuffleCandidates=s.items.filter(i=>i.renderType!=='fill'&&i.q.options.length>1);
ok(shuffleCandidates.some(i=>JSON.stringify(i.optionOrder)!==JSON.stringify(i.q.options)),'普通模拟未应用选项乱序');

// 2) Redo-current-paper must preserve the exact option order actually used, not regenerate it.
let target=shuffleCandidates[0];
target.optionOrder=[...target.q.options].reverse();
const original=s.items.map(i=>({id:i.q.id,type:i.renderType,level:i.fillLevel,order:[...(i.optionOrder||i.q.options)]}));
answerAll(x,true);
x.c.window.redoCurrentPaper();
let redo=x.c.window.__V22_TEST__.getSession();
ok(redo.items.length===original.length,'重做本卷题量变化');
for(let i=0;i<original.length;i++){
  ok(redo.items[i].q.id===original[i].id,'重做本卷题号变化');
  ok(redo.items[i].renderType===original[i].type,'重做本卷题型变化');
  ok(redo.items[i].fillLevel===original[i].level,'重做本卷填空等级变化');
  ok(JSON.stringify(redo.items[i].optionOrder)===JSON.stringify(original[i].order),`重做本卷第${i+1}题选项顺序变化`);
}

// 3) Turning shuffle off must keep original option order in normal exams.
let noShuffle=boot(JSON.stringify({schemaVersion:2,settings:{shuffleOptions:false}}));
noShuffle.c.window.beginExam('mixed');
let ns=noShuffle.c.window.__V22_TEST__.getSession();
ok(ns.items.filter(i=>i.renderType!=='fill').every(i=>JSON.stringify(i.optionOrder)===JSON.stringify(i.q.options)),'关闭选项乱序后普通模拟仍被打乱');

// 4) Historical assisted-correct count must not permanently mask a newer wrong/slow state.
let recentWrong=boot(JSON.stringify({schemaVersion:2,wrong:{4:{count:1,wrongTotal:1,wrongStreak:1,assistedCorrect:5,recentResult:'wrong',corrected:false}},learning:{4:{attempts:2,correct:1,wrong:1,totalMs:20000,timedAttempts:2}}}));
ok(recentWrong.c.window.__V22_TEST__.wrongCategory(4)==='recent','历史辅助次数错误覆盖了最新做错状态');
let assistedNow=boot(JSON.stringify({schemaVersion:2,wrong:{4:{count:1,wrongTotal:1,wrongStreak:0,assistedCorrect:2,recentResult:'assistedCorrect',corrected:false}},learning:{4:{attempts:2,correct:1,wrong:1,totalMs:20000,timedAttempts:2}}}));
ok(assistedNow.c.window.__V22_TEST__.wrongCategory(4)==='assisted','最新辅助答对未进入辅助分类');
let slowNow=boot(JSON.stringify({schemaVersion:2,wrong:{4:{count:1,wrongTotal:1,wrongStreak:1,assistedCorrect:9,recentResult:'wrong',corrected:false}},learning:{4:{attempts:2,correct:1,wrong:1,totalMs:80000,timedAttempts:2}}}));
ok(slowNow.c.window.__V22_TEST__.wrongCategory(4)==='slow','高耗时状态被历史辅助次数遮蔽');

// 5) Real-exam analytics must be separated from ordinary simulations in the history view.
let stats=boot();
stats.c.window.beginRealExam('real');answerAll(stats,true);
stats.c.window.beginExam('mixed');answerAll(stats,false);
stats.c.window.renderHistory();
ok(stats.main.innerHTML.includes('真实考试模拟 · 15单选 + 10多选 + 10判断 + 10填空'),'学习记录缺少真实考试独立统计区');
ok(stats.main.innerHTML.includes('记录内场次</span><strong>1</strong>'),'真实考试场次混入普通模拟');
ok(stats.main.innerHTML.includes('最近5场平均</span><strong>100分</strong>'),'真实考试平均分被普通模拟污染');

console.log('v2.2.2精修回归通过：普通模拟选项乱序、重做本卷顺序保持、关闭乱序、错题分类时效性、真实考试独立统计均正常。');
