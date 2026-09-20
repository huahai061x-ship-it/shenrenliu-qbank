const fs=require('fs'),vm=require('vm');

const main={innerHTML:''},watermark={textContent:''},realExamRule={value:'normal'},store={};
const bodyClasses=new Set();
const classList={toggle(k,on){if(on===undefined)on=!bodyClasses.has(k);on?bodyClasses.add(k):bodyClasses.delete(k)},add(k){bodyClasses.add(k)},remove(k){bodyClasses.delete(k)}};
const document={hidden:false,documentElement:{dataset:{}},body:{classList,append(){}},querySelector:s=>s==='#main'?main:s==='#watermark'?watermark:s==='#realExamRule'?realExamRule:null,querySelectorAll:()=>[],addEventListener(){},createElement(){return {style:{},classList,append(){},remove(){},click(){},select(){}}},execCommand(){return true}};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
const context={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:false},document,localStorage,location:{protocol:'file:',href:'file:///test'},navigator:{},history:{pushState(){},replaceState(){}},performance:{now:()=>0},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
Object.assign(context.window,{window:context.window,document,localStorage,location:context.location,navigator:context.navigator});
vm.createContext(context);
for(const file of ['questions.js','pedagogy.js','enhanced-fill.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const Q=context.window.QUESTION_BANK,byId=new Map(Q.map(q=>[q.id,q]));
const standard=context.window.HOS_PEDAGOGY.fillBank,enhanced=context.window.HOS_ENHANCED_FILL;
const allExams=[],errors=[];
function currentId(){const m=main.innerHTML.match(/原题号 #(\d+)/);return m?Number(m[1]):null}
function currentIsFill(){return main.innerHTML.includes('<span class="tag fill">填空题</span>')}
function answerCurrent(){
  const id=currentId(),q=byId.get(id);if(!q)throw Error('页面未显示有效原题号');
  if(currentIsFill()){
    const entry=enhanced[id]||standard[id];if(!entry)throw Error(`#${id}显示为填空但没有填空条目`);
    context.window.setAnswer((entry.answers||q.answers).join('、'));
  }else if(q.type==='multiple'){
    const order=context.window.__V22_TEST__.getSession().items.find(x=>x.q.id===id).optionOrder;
    for(const answer of q.answers)context.window.chooseOption(order.indexOf(answer));
  }else {const order=context.window.__V22_TEST__.getSession().items.find(x=>x.q.id===id).optionOrder;context.window.chooseOption(order.indexOf(q.answers[0]));}
  return {id,type:currentIsFill()?'fill':q.type};
}

for(let round=1;round<=20;round++){
  context.window.renderRealExamSetup();context.window.beginRealExam();
  const rows=[];
  for(let i=0;i<55;i++){
    if(!main.innerHTML.includes(`题号 ${i+1}/55`))errors.push(`第${round}场第${i+1}题题号栏异常`);
    rows.push(answerCurrent());
    if(i<54)context.window.nextQ();
  }
  bodyClasses.add('sheet-open');context.window.nextQ();
  if(!main.innerHTML.includes('100分')||!main.innerHTML.includes('答对 55/55'))errors.push(`第${round}场标准答案未取得100分`);
  if(bodyClasses.has('sheet-open'))errors.push(`第${round}场交卷后页面仍被锁定`);
  const ids=rows.map(x=>x.id),counts=Object.fromEntries(['single','multiple','judge','fill'].map(t=>[t,rows.filter(x=>x.type===t).length]));
  if(new Set(ids).size!==55)errors.push(`第${round}场存在场内重复题`);
  if(JSON.stringify(counts)!==JSON.stringify({single:15,multiple:10,judge:10,fill:20}))errors.push(`第${round}场题型结构错误：${JSON.stringify(counts)}`);
  allExams.push(ids);
}
const saved=JSON.parse(store.shenrenliu_qbank_v1||'{}');
if(saved.history?.length!==20)errors.push(`考试历史应有20场，实际${saved.history?.length}`);
if(saved.examRotation?.round!==20)errors.push(`轮换轮次应为20，实际${saved.examRotation?.round}`);
for(let i=0;i<allExams.length;i++)for(let j=i+1;j<allExams.length;j++){
  const repeated=allExams[i].filter(id=>allExams[j].includes(id)),overlap=repeated.length;
  if(j-i<=3&&overlap)errors.push(`相邻四场范围内第${i+1}/${j+1}场重复${overlap}题：#${repeated.join('、#')}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
const union=new Set(allExams.flat()),overlaps=[],usage=Object.values(saved.examRotation.usage||{}),mean=usage.reduce((a,b)=>a+b,0)/usage.length,sd=Math.sqrt(usage.reduce((a,b)=>a+(b-mean)**2,0)/usage.length),min=Math.min(...usage),max=Math.max(...usage);
for(let i=1;i<allExams.length;i++)overlaps.push(allExams[i].filter(id=>allExams[i-1].includes(id)).length);
if(union.size!==507)throw Error(`20场未覆盖全题库，仅${union.size}/507`);
const nonFillSingles=Q.filter(q=>q.type==='single'&&!enhanced[q.id]&&!standard[q.id]),fixedHigh=nonFillSingles.filter(q=>saved.examRotation.usage[q.id]===max);
if(max-min>3){const high=Object.entries(saved.examRotation.usage).filter(([,n])=>n===max).map(([id])=>`#${id}(${byId.get(Number(id))?.type})`).join('、');throw Error(`长期公平性未达可实现目标：max=${max}, min=${min}；最高频${high}`)}
if(fixedHigh.length===nonFillSingles.length)throw Error('非填空单选仍存在固定最高频结构性偏差');
console.log(`20场实测通过：共作答${20*55}题次，20场均100分，题型结构全部正确，场内零重复。`);
console.log(`连续覆盖：20场累计覆盖${union.size}/507道原题；相邻场重复数依次为 ${overlaps.join('、')}。`);
console.log(`长期公平性：min=${min}，max=${max}，均值=${mean.toFixed(3)}，标准差=${sd.toFixed(3)}，极差=${max-min}。`);
console.log(`非填空单选最高频：${fixedHigh.length}/${nonFillSingles.length}题（不得再固定为全部最高频）。`);
console.log('交互状态：1100次逐题作答/翻题成功，20次交卷成功，交卷后页面滚动锁全部解除。');
