const fs=require('fs'),vm=require('vm');
function ok(value,message){if(!value)throw Error(message)}
function classes(){const s=new Set(['hidden']);return {add:k=>s.add(k),remove:k=>s.delete(k),toggle(k,on){on?s.add(k):s.delete(k)},contains:k=>s.has(k)}}
function boot(initial=''){
  const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:classes(),append(){},remove(){},click(){},select(){}}),main=node(),watermark=node(),nodes={};
  for(const key of ['#eggModal','#eggBody','#settingsModal'])nodes[key]=node();
  const controls={'#realExamRule':{value:'normal'},'#countBtns .active':{dataset:{n:'30'}},'#examRule':{value:'normal'},'#fillLevel':{value:'enhanced'},'#fillRatio':{value:'15'},'#typeFilter':{value:'all'}};
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:classes(),append(){}},querySelector:s=>s==='#main'?main:s==='#watermark'?watermark:nodes[s]||controls[s]||null,querySelectorAll:()=>[],addEventListener(){},createElement:node,execCommand(){return true}};
  const store={shenrenliu_qbank_v1:initial},localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const navigator={userAgent:'Mozilla/5.0',serviceWorker:null},location={protocol:'https:',href:'https://example.test/'};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:true},document,localStorage,location,navigator,history:{pushState(){},replaceState(){}},performance:{now:()=>1000},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
  Object.assign(c.window,{window:c.window,document,localStorage,location,navigator});vm.createContext(c);
  for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js']){
    let source=fs.readFileSync(f,'utf8');
    if(f==='app.js')source=source.replace('updateWatermark();initBackGuard();renderHome();','window.__FREEZE__={answerCorrect,variantOrder,nextFillVariantKey,assignFillVariantKeys,sanitizeLastSession,sanitizeHistory,resolveFillEntry,getStore:()=>S,getSession:()=>session};updateWatermark();initBackGuard();renderHome();');
    vm.runInContext(source,c,{filename:f});
  }
  return {c,store,main,F:c.window.__FREEZE__};
}
const x=boot(),Q=x.c.window.QUESTION_BANK,standard=x.c.window.HOS_PEDAGOGY.fillBank,added=x.c.window.HOS_ENHANCED_FILL,full={...standard,...added};
const dynamicIds=[132,133,134,140,141,148,155,158,159,161,162,163,166,167,171,179,181,182],orderedStandard=[58,61,70,86,99,102,108,212],orderedEnhanced=[406,485];
ok(Q.length===507,'原题数量错误');ok(Object.keys(standard).length===104,'标准填空数量错误');ok(Object.keys(added).length===104,'独立增强填空数量错误');ok(Object.keys(full).length===208,'增强填空总数错误');
ok(JSON.stringify(Object.keys(added).filter(id=>added[id].variants).map(Number).sort((a,b)=>a-b))===JSON.stringify(dynamicIds),'动态题目编号不符');
ok(!added[397]&&Q.some(q=>q.id===397),'#397仅应移除增强填空资格');
for(const id of [27,28,97,103,105,107,254,260,266,272,290])ok(!!added[id],`#${id}未加入增强题库`);
let variants=0;
for(const id of dynamicIds){
  const q=Q.find(q=>q.id===id),e=added[id],order=x.F.variantOrder(q,'enhanced'),seen=new Set();
  ok(order.length===e.variants.length&&new Set(order).size===order.length,`#${id}轮换次序不完整`);
  for(let exposure=0;exposure<e.variants.length*2;exposure++){
    x.F.getStore().learning[id]={fillExposure:exposure};
    ok(x.F.nextFillVariantKey(q,'enhanced')===order[exposure%order.length],`#${id}轮换未按无放回次序循环`);
  }
  for(const v of e.variants){
    variants++;seen.add(v.key);
    ok((v.stem.match(/______/g)||[]).length===1&&v.answers.length===1,`#${id}/${v.key}不是单空`);
    const item={q,renderType:'fill',fillLevel:'enhanced',fillVariantKey:v.key};
    ok(x.F.answerCorrect(item,v.answers[0]),`#${id}/${v.key}正确答案未通过`);
    ok(!x.F.answerCorrect(item,v.answers[0]+'、错误内容'),`#${id}/${v.key}额外内容被误判`);
    ok(!x.F.answerCorrect(item,'__WRONG__'),`#${id}/${v.key}错误答案被误判`);
  }
  ok(seen.size===e.variants.length,`#${id}变体key重复`);
  x.F.getStore().learning[id].fillExposure=0;
  const item={q,renderType:'fill',fillLevel:'enhanced',fillVariantKey:''};x.F.assignFillVariantKeys([item]);
  ok(item.fillVariantKey===order[0],`#${id}创建会话时未锁定首个变体`);
  x.F.getStore().learning[id].fillExposure=1;x.F.assignFillVariantKeys([item]);ok(item.fillVariantKey===order[0],`#${id}重绘改变了变体`);
}
ok(variants===60,`变体不是60个，而是${variants}个`);
for(const [level,ids] of [['standard',orderedStandard],['enhanced',orderedEnhanced]])for(const id of ids){
  const q=Q.find(q=>q.id===id),entry=level==='standard'?standard[id]:added[id],item={q,renderType:'fill',fillLevel:level,fillVariantKey:''};
  const answers=entry.answers||q.answers;
  ok(entry.ordered&&answers.length>1,`#${id}未标记顺序填空`);
  ok(x.F.answerCorrect(item,answers.join('、')),`#${id}正确顺序不通过`);
  ok(!x.F.answerCorrect(item,[...answers].reverse().join('、')),`#${id}逆序被误判`);
}
for(const id of [247,258,259,261,268,308]){const q=Q.find(q=>q.id===id),entry=added[id],item={q,renderType:'fill',fillLevel:'enhanced',fillVariantKey:''};ok(!entry.ordered,`#${id}不应按顺序判题`);ok(x.F.answerCorrect(item,[...entry.answers].reverse().join('、')),`#${id}无序答案未通过`)}
const q=Q.find(q=>q.id===132),key=added[132].variants[1].key;
const legacy={bankVersion:'v2.2.2',kind:'exam',ids:[132],renderTypes:['fill'],fillLevels:['enhanced'],answers:[''],paperId:'legacy-test'};
const old=x.F.sanitizeLastSession(legacy),again=x.F.sanitizeLastSession(legacy);ok(old?.fillVariantKeys[0]&&old.fillVariantKeys[0]===again.fillVariantKeys[0],'旧会话回退不稳定');
const saved=x.F.sanitizeLastSession({...legacy,fillVariantKeys:[key]});ok(saved.fillVariantKeys[0]===key,'新会话变体未保留');
const oldHistory=x.F.sanitizeHistory([{ids:[132],renderTypes:['fill'],fillLevels:['enhanced'],paperId:'legacy-test'}])[0];ok(!oldHistory.paperDamaged&&oldHistory.fillVariantKeys[0]==='','旧历史记录被误判为损坏');
const newHistory=x.F.sanitizeHistory([{ids:[132],renderTypes:['fill'],fillLevels:['enhanced'],fillVariantKeys:[key],paperId:'new-test'}])[0];ok(newHistory.fillVariantKeys[0]===key,'新历史记录变体未保留');
let strongSeen=new Set(),pureSeen=new Set(),variantSeen=new Set();
for(let round=0;round<100;round++){
  x.c.window.beginRealExam('fillStrong');let session=x.F.getSession();ok(session.items.length===55,`第${round+1}场强化考试题数错误`);
  let types={single:0,multiple:0,judge:0,fill:0};
  for(const item of session.items){types[item.renderType]++;if(item.renderType==='fill'){strongSeen.add(item.q.id);const v=x.F.resolveFillEntry(item.q,item.fillLevel,item.fillVariantKey),answers=v?.answers||item.q.answers;ok(!!v&&answers.length>0,`强化考试#${item.q.id}无变体答案`);if(item.fillVariantKey)variantSeen.add(`${item.q.id}/${item.fillVariantKey}`);item.answer=answers.join('、')}else item.answer=item.q.type==='multiple'?[...item.q.answers]:item.q.answers[0];item.timeMs=5000}
  ok(JSON.stringify(types)===JSON.stringify({single:15,multiple:10,judge:10,fill:20}),`第${round+1}场比例错误`);session.totalActiveMs=275000;x.c.window.submitExam();ok(x.F.getStore().history[0].score===100,`第${round+1}场强化考试未得满分`);
}
for(let round=0;round<100;round++){
  x.c.window.renderExamSetup('fill','enhanced');x.c.window.beginExam('fill');let session=x.F.getSession();ok(session.items.length===30,`第${round+1}场纯填空题数错误`);
  for(const item of session.items){ok(item.renderType==='fill',`第${round+1}场混入非填空`);pureSeen.add(item.q.id);const v=x.F.resolveFillEntry(item.q,item.fillLevel,item.fillVariantKey),answers=v?.answers||item.q.answers;ok(!!v&&answers.length>0,`纯填空#${item.q.id}无变体答案`);if(item.fillVariantKey)variantSeen.add(`${item.q.id}/${item.fillVariantKey}`);item.answer=answers.join('、');item.timeMs=5000}
  session.totalActiveMs=150000;x.c.window.submitExam();ok(x.F.getStore().history[0].score===100,`第${round+1}场纯填空未得满分`);
}
ok(pureSeen.size===208,`纯填空仅覆盖${pureSeen.size}/208题`);ok(variantSeen.size===60,`模拟考试仅覆盖${variantSeen.size}/60种变体`);
const finishedKeys=x.F.getSession().items.map(i=>i.fillVariantKey);
x.c.window.redoCurrentPaper();ok(JSON.stringify(x.F.getSession().items.map(i=>i.fillVariantKey))===JSON.stringify(finishedKeys),'重做当前试卷改变了变体');
const redoSnapshot=JSON.parse(x.store.shenrenliu_qbank_v1).lastSession;
const restored=boot(JSON.stringify({schemaVersion:2,lastSession:redoSnapshot}));restored.c.window.resumeLastSession();
ok(JSON.stringify(restored.F.getSession().items.map(i=>i.fillVariantKey))===JSON.stringify(finishedKeys),'恢复未完成考试改变了变体');
x.c.window.redoHistoryPaper(0);ok(JSON.stringify(x.F.getSession().items.map(i=>i.fillVariantKey))===JSON.stringify(finishedKeys),'重做历史试卷改变了变体');
console.log(`填空封版校验通过：标准104、独立增强104、增强总计208、动态18题60变体；顺序判题、旧记录兼容、100场强化考试和100场纯填空考试均通过。`);
