const fs=require('fs'),vm=require('vm');
const errors=[];
function check(value,message){if(!value)errors.push(message)}
function classes(){const s=new Set(['hidden']);return {add:k=>s.add(k),remove:k=>s.delete(k),toggle(k,on){on?s.add(k):s.delete(k)},contains:k=>s.has(k)}}
function boot(){
  const nodes={},node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:classes(),append(){},remove(){},click(){},select(){}}),main=node(),watermark=node();
  for(const key of ['#eggModal','#eggBody','#settingsModal'])nodes[key]=node();
  const controls={'#realExamRule':{value:'normal'},'#countBtns .active':{dataset:{n:'30'}},'#examRule':{value:'normal'},'#fillLevel':{value:'enhanced'},'#fillRatio':{value:'15'},'#typeFilter':{value:'all'}};
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:classes(),append(){}},querySelector:s=>s==='#main'?main:s==='#watermark'?watermark:nodes[s]||controls[s]||null,querySelectorAll:()=>[],addEventListener(){},createElement:node,execCommand(){return true}};
  const store={},localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const navigator={userAgent:'Mozilla/5.0',serviceWorker:null},location={protocol:'https:',href:'https://example.test/'};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:true},document,localStorage,location,navigator,history:{pushState(){},replaceState(){}},performance:{now:()=>1000},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
  Object.assign(c.window,{window:c.window,document,localStorage,location,navigator});
  vm.createContext(c);for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js']){
    let source=fs.readFileSync(f,'utf8');
    if(f==='app.js'){
      const marker='updateWatermark();initBackGuard();renderHome();';
      if(!source.includes(marker))throw Error('判题测试无法定位现有 answerCorrect 函数');
      source=source.replace(marker,'window.__FILL_QUALITY_TEST__={answerCorrect};'+marker);
    }
    vm.runInContext(source,c,{filename:f});
  }
  return {c,main,store};
}
const x=boot(),Q=x.c.window.QUESTION_BANK,standard=x.c.window.HOS_PEDAGOGY.fillBank,added=x.c.window.HOS_ENHANCED_FILL,full={...standard,...added};
const rewritten=[138,143,144,145,154,164,165,170,173,177,183,184,185,186,187];
const fixed=[168,462,474],removed=[176,378,418,431,450,473],inserted=[247,258,259,261,268,308];
check(Q.length===507,'原题不是507道');check(Object.keys(standard).length===104,'标准填空不是104道');
check(Object.keys(added).length===104,'增强独立池不是104道');check(Object.keys(full).length===208,'增强总池不是208道');
check(x.main.innerHTML.includes('题库数据自检通过'),'运行时题库自检未通过');
for(const id of removed){check(!added[id],`#${id}仍在增强池`);check(Q.some(q=>q.id===id),`原题#${id}丢失`)}
for(const id of inserted)check(!!added[id],`#${id}未加入增强池`);
const expected={
  138:['干燥','保持设备干燥'],143:['安全活动日','安全活动日'],144:['低压电工','低压电工'],145:['订单型号','根据订单型号'],
  154:['润滑','定期进行简单保养、润滑'],164:['弹垫','普通螺母加装弹垫'],165:['野蛮','野蛮操作'],
  170:['咔','“咔”声'],173:['15','至少为15cm'],177:['规定位置','规定位置'],183:['起火','设备起火'],
  184:['用户体验','用户体验'],185:['WMS扫码枪损坏','WMS扫码枪损坏'],186:['定置','定置存放'],187:['班组会','班组会']
};
for(const id of [...rewritten,...fixed,...inserted]){
  const entry=added[id],q=Q.find(q=>q.id===id);if(!entry||!q)continue;
  check(entry.stem.includes('______'),`#${id}无填空线`);
  check(Array.isArray(entry.answers)&&entry.answers.length>0,`#${id}无必答答案`);
  check(Array.isArray(entry.accepted),`#${id}无容错数组`);
  check(entry.originType===q.type,`#${id}原题类型不一致`);
  check((entry.stem.match(/______/g)||[]).length===entry.answers.length,`#${id}空位与答案数不符`);
  check(entry.answers.every(a=>a.length<=12&&!/以上都是|以上都对/.test(a)),`#${id}答案过长或包含“以上都是”`);
  if(expected[id]){check(entry.answers.length===1&&entry.answers[0]===expected[id][0],`#${id}未聚焦单个答案`);check(q.answers.some(a=>a.includes(expected[id][1])),`#${id}答案无原题依据`);check(!entry.why.includes('作答时应写全原题所有正确项'),`#${id}保留旧长清单提示`)}
  if(inserted.includes(id))check(JSON.stringify(entry.answers)===JSON.stringify(q.answers),`#${id}新增答案与原题不一致`);
}
check(JSON.stringify(added[168].answers)===JSON.stringify(['60N·m']),'#168非唯一答案');
check(JSON.stringify(added[462].answers)===JSON.stringify(['5Why'])&&added[462].accepted.includes('5Why法'),'#462同义结构错误');
check(JSON.stringify(added[474].answers)===JSON.stringify(['环境'])&&added[474].accepted.includes('Environment'),'#474同义结构错误');
function correct(id,raw){const q=Q.find(q=>q.id===id);return x.c.window.__FILL_QUALITY_TEST__.answerCorrect({q,renderType:'fill',fillLevel:'enhanced'},raw)}
const cases=[
  [168,'60N·m',true],[168,'60N.m',true],[168,'58N·m',false],[168,'55N·m',false],[168,'62N·m',false],
  [462,'5Why',true],[462,'5Why法',true],[462,'5Why、5Why法',false],
  [474,'环境',true],[474,'Environment',true],[474,'environment',true],[474,'环境、Environment',false],
  [247,'自检、互检、专职检',true],[247,'互检、自检、专职检',true],[247,'自检,互检,专职检',true],[247,'自检\n互检\n专职检',true],[247,'自检、互检',false],[247,'自检、互检、专职检、首检',false],
  [258,'按设计图样、按工艺文件、按技术标准',true],[258,'按设计图样、按工艺文件',false],[258,'按设计图样、按工艺文件、按技术标准、错误项',false],
  [259,'尺寸精度、形状精度、位置精度',true],[259,'尺寸精度、形状精度',false],
  [261,'漏水、漏油、漏气',true],[261,'漏水、漏油、漏气、漏电',false],
  [268,'入库过滤、加油过滤、发放过滤',true],[268,'入库过滤、加油过滤、发放过滤、错误项',false],
  [308,'冲压、焊装、涂装、总装',true],[308,'冲压、焊装、涂装',false],[308,'冲压、焊装、涂装、总装、错误项',false]
];
for(const [id,raw,want] of cases)check(correct(id,raw)===want,`#${id}判题错误：${JSON.stringify(raw)}应为${want}`);
const groups=x.c.window.__V22_TEST__.duplicateGroups,fillSeen=new Set(),regularSeen=new Set();
for(let round=0;round<100;round++){
  x.c.window.beginRealExam('fillStrong');const session=x.c.window.__V22_TEST__.getSession();
  check(!!session&&session.items.length===55,`真实模拟第${round+1}场题数不对`);if(!session||session.items.length!==55)break;
  const ids=session.items.map(i=>i.q.id),counts={single:0,multiple:0,judge:0,fill:0};
  check(new Set(ids).size===55,`真实模拟第${round+1}场重复原题`);
  check(groups.every(g=>g.filter(id=>ids.includes(id)).length<=1),`真实模拟第${round+1}场等价组冲突`);
  for(const item of session.items){counts[item.renderType]++;if(item.renderType==='fill'){fillSeen.add(item.q.id);const e=full[item.q.id],v=e?.variants?.find(x=>x.key===item.fillVariantKey)||e,answers=v?.answers||item.q.answers;check(!!e&&!!v&&answers.length>0,`真实模拟第${round+1}场空答案`);check(!v.stem.includes('undefined'),`真实模拟第${round+1}场undefined`);item.answer=answers.join('、')}else{regularSeen.add(item.q.id);item.answer=item.q.type==='multiple'?[...item.q.answers]:item.q.answers[0]}item.timeMs=5000}
  check(counts.single===15&&counts.multiple===10&&counts.judge===10&&counts.fill===20,`真实模拟第${round+1}场比例不对`);
  session.totalActiveMs=275000;x.c.window.submitExam();check(x.c.window.__V22_TEST__.getStore().history[0].score===100,`真实模拟第${round+1}场标准答案未得100分`);
}
const pureSeen=new Set();
for(let round=0;round<50;round++){
  x.c.window.renderExamSetup('fill','enhanced');x.c.window.beginExam('fill');const session=x.c.window.__V22_TEST__.getSession();
  check(!!session&&session.items.length===30,`纯填空第${round+1}场题数不对`);if(!session||session.items.length!==30)break;
  const ids=session.items.map(i=>i.q.id);check(new Set(ids).size===30,`纯填空第${round+1}场重复原题`);
  for(const item of session.items){pureSeen.add(item.q.id);const e=full[item.q.id],v=e?.variants?.find(x=>x.key===item.fillVariantKey)||e,answers=v?.answers||item.q.answers;check(item.renderType==='fill'&&!!e&&!!v,`纯填空第${round+1}场无效填空`);check(!removed.includes(item.q.id),`纯填空第${round+1}场出现移除题`);check(!v.stem.includes('undefined'),`纯填空第${round+1}场undefined`);check(answers.length>0,`纯填空第${round+1}场无答案`);item.answer=answers.join('、');item.timeMs=5000}
  session.totalActiveMs=150000;x.c.window.submitExam();check(x.c.window.__V22_TEST__.getStore().history[0].score===100,`纯填空第${round+1}场得分异常`);
}
for(const id of inserted)check(pureSeen.has(id),`新增#${id}在50场纯填空中未抽到`);
for(const id of removed)check(regularSeen.has(id),`移除增强资格的原题#${id}在100场普通题型中未抽到`);
check(pureSeen.size===208,`50场纯填空仅覆盖${pureSeen.size}/208题`);
const summary={sourceQuestions:Q.length,standardFill:Object.keys(standard).length,enhancedIndependent:Object.keys(added).length,enhancedTotal:Object.keys(full).length,gradingCases:cases.length,fillStrongExams:100,pureFillExams:50,pureFillCoverage:pureSeen.size,removedOriginalsRegularCoverage:removed.filter(id=>regularSeen.has(id)).length,errors:errors.length};
if(errors.length){console.error(errors.join('\n'));console.error(JSON.stringify(summary));process.exit(1)}
console.log('填空题命题质量专项校验通过：'+JSON.stringify(summary));
