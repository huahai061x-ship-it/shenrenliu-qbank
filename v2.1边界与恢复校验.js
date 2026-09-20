const fs=require('fs'),vm=require('vm');

function classList(){const s=new Set();return {add:k=>s.add(k),remove:k=>s.delete(k),toggle(k,on){if(on===undefined)on=!s.has(k);on?s.add(k):s.delete(k)},contains:k=>s.has(k)}}
function boot(initialStore='',opts={}){
  const main={innerHTML:''},watermark={textContent:''},bodyCL=classList(),settingsModal={classList:classList()},controls={
    '#typeFilter':{value:'all'},'#fillLevel':{value:'standard'},'#examRule':{value:'normal'},'#fillRatio':{value:'15'},'#realExamRule':{value:'normal'},
    '#countBtns .active':{dataset:{n:'50'}},'#settingsModal':settingsModal
  },store={shenrenliu_qbank_v1:initialStore},created=[];
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:bodyCL,append(x){created.push(x)}},querySelector(s){return s==='#main'?main:s==='#watermark'?watermark:controls[s]||null},querySelectorAll:()=>[],addEventListener(){},createElement(){return {style:{},classList:classList(),append(){},remove(){},click(){},select(){}}},execCommand(){return true}};
  let clock=1000;
  const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:false},document,localStorage,location:{protocol:'file:',href:'file:///test'},navigator:{},history:{pushState(){},replaceState(){}},performance:{now:()=>clock},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:opts.confirm||(()=>true),prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){this.readAsText=file=>{this.result=file.text;this.onload()}}};
  Object.assign(c.window,{window:c.window,document,localStorage,location:c.location,navigator:c.navigator});vm.createContext(c);
  for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
  return {c,main,controls,store,bodyCL,created,setClock:v=>clock=v};
}
function setExam(x,{n,type='all',level='standard',rule='normal'}={}){x.controls['#countBtns .active']={dataset:{n:String(n)}};x.controls['#typeFilter'].value=type;x.controls['#fillLevel'].value=level;x.controls['#examRule'].value=rule}
function assert(v,m){if(!v)throw Error(m)}

for(const tc of [
  {name:'标准填空150',mode:'fill',n:150,level:'standard',allowed:false},
  {name:'增强填空150',mode:'fill',n:150,level:'enhanced',allowed:true},
  {name:'仅单选150',mode:'mixed',n:150,type:'single',allowed:false},
  {name:'仅多选150',mode:'mixed',n:150,type:'multiple',allowed:true},
  {name:'仅判断150',mode:'mixed',n:150,type:'judge',allowed:true}
]){let x=boot();setExam(x,tc);x.c.window.beginExam(tc.mode);assert(x.main.innerHTML.includes('题号 1/150')===tc.allowed,`${tc.name}边界控制失败`)}

let strict=boot();setExam(strict,{n:30,rule:'strict'});strict.c.window.beginExam('mixed');strict.c.window.submitExam();let strictData=JSON.parse(strict.store.shenrenliu_qbank_v1);assert(strict.main.innerHTML.includes('题号 1/30'),'严格模式空卷不应交卷');assert(strictData.history.length===0,'严格模式空卷写入了历史');
let normal=boot();setExam(normal,{n:30,rule:'normal'});normal.c.window.beginExam('mixed');normal.bodyCL.add('sheet-open');normal.c.window.submitExam();let normalData=JSON.parse(normal.store.shenrenliu_qbank_v1);assert(normal.main.innerHTML.includes('0分'),'普通模式空卷未按0分交卷');assert(normalData.history.length===1,'普通模式未写入一条历史');assert(!normal.bodyCL.contains('sheet-open'),'交卷后滚动锁未解除');normal.c.window.submitExam();assert(JSON.parse(normal.store.shenrenliu_qbank_v1).history.length===1,'重复交卷产生重复历史');

let a=boot();a.c.window.renderRealExamSetup();a.c.window.beginRealExam();let firstId=Number(a.main.innerHTML.match(/原题号 #(\d+)/)[1]),q=a.c.window.QUESTION_BANK.find(z=>z.id===firstId);a.c.window.chooseOption(q.options.indexOf(q.answers[0]));a.setClock(6000);a.c.window.jumpQ(10);let saved=a.store.shenrenliu_qbank_v1,beforeMs=JSON.parse(saved).lastSession.totalActiveMs,b=boot(saved);assert(beforeMs===5000,'刷新前有效用时保存错误');assert(b.main.innerHTML.includes('继续上次考试'),'重启后未显示恢复入口');assert(JSON.parse(b.store.shenrenliu_qbank_v1).lastSession.totalActiveMs===beforeMs,'关闭期间被错误计时');b.c.window.resumeLastSession();assert(b.main.innerHTML.includes('题号 11/55'),'恢复后当前题号错误');b.c.window.jumpQ(0);assert(b.main.innerHTML.includes('option selected'),'恢复后答案丢失');b.c.window.submitExam();assert(!JSON.parse(b.store.shenrenliu_qbank_v1).lastSession,'交卷后恢复点未清除');

let bad=JSON.parse(saved);bad.lastSession.bankVersion='old';let rejected=boot(JSON.stringify(bad));assert(!rejected.main.innerHTML.includes('继续上次考试'),'过期恢复数据未被安全拒绝');
let pages=a.c.window.getSourcePages(a.c.window.QUESTION_BANK.find(q=>q.id===302));assert(pages.join(',')==='72,73','第302题跨页数据丢失');let report=a.c.window.reviewReportText([a.c.window.QUESTION_BANK.find(q=>q.id===302)]);assert(report.includes('原题第72、73页'),'第302题待复核导出丢失第73页');

let hostile=boot(JSON.stringify({favorites:[302,999999],reviewFlags:{302:1,999999:1},history:[{mode:'<img src=x onerror=alert(1)>',score:999,count:-3,durationMs:-5}],schemaVersion:1}));hostile.c.window.renderHistory();let migrated=JSON.parse(hostile.store.shenrenliu_qbank_v1);assert(migrated.favorites.length===1&&!migrated.reviewFlags['999999'],'非法题号未过滤');assert(!hostile.main.innerHTML.includes('<img src=x'),'历史文本未转义');assert(hostile.main.innerHTML.includes('&lt;img'),'恶意历史文本未安全显示');

// A/B：恢复答案类型损坏时必须安全清洗，交卷不得抛异常。
let snapshot=JSON.parse(saved),multiAt=snapshot.lastSession.renderTypes.indexOf('multiple'),singleAt=snapshot.lastSession.renderTypes.indexOf('single'),fillAt=snapshot.lastSession.renderTypes.indexOf('fill');
assert(multiAt>=0&&singleAt>=0&&fillAt>=0,'实测恢复卷缺少必要题型');
for(const [name,at,value] of [['多选字符串',multiAt,'THIS_SHOULD_BE_ARRAY'],['多选对象',multiAt,{bad:1}],['多选数字',multiAt,123],['多选数组含非法项',multiAt,['INVALID_OPTION']],['单选数组',singleAt,['错误类型']],['填空对象',fillAt,{bad:1}]]){
  let damaged=JSON.parse(JSON.stringify(snapshot));damaged.lastSession.answers[at]=value;let x=boot(JSON.stringify(damaged)),clean=JSON.parse(x.store.shenrenliu_qbank_v1).lastSession.answers[at];assert(clean==null,`${name}未安全清空`);x.c.window.resumeLastSession();x.c.window.submitExam();assert(JSON.parse(x.store.shenrenliu_qbank_v1).history.length===1,`${name}导致交卷失败`)
}
let legacyFill=JSON.parse(JSON.stringify(snapshot));legacyFill.lastSession.answers[fillAt]=['答案一','答案二'];let legacy=boot(JSON.stringify(legacyFill));assert(JSON.parse(legacy.store.shenrenliu_qbank_v1).lastSession.answers[fillAt]==='答案一、答案二','旧版填空字符串数组未安全兼容');

// C/D：题型或填空等级属于结构损坏，必须拒绝整个恢复点。
let typeMismatch=JSON.parse(JSON.stringify(snapshot));typeMismatch.lastSession.renderTypes[multiAt]='single';assert(!boot(JSON.stringify(typeMismatch)).main.innerHTML.includes('继续上次考试'),'恢复点题型错配未拒绝');
let levelMismatch=JSON.parse(JSON.stringify(snapshot));levelMismatch.lastSession.fillLevels[fillAt]='super';assert(!boot(JSON.stringify(levelMismatch)).main.innerHTML.includes('继续上次考试'),'非法fillLevel未拒绝');

// E/F：历史卷必须按原索引保留tuple；损坏卷不得重做。
let corruptHistory={schemaVersion:2,history:[{mode:'索引测试',ids:[132,999999,133],renderTypes:['multiple','single','multiple'],fillLevels:['standard','standard','standard']}]},hx=boot(JSON.stringify(corruptHistory)),hr=JSON.parse(hx.store.shenrenliu_qbank_v1).history[0];assert(hr.ids.join(',')==='132,133'&&hr.renderTypes.join(',')==='multiple,multiple','历史试卷tuple发生索引错位');assert(hr.paperDamaged,'损坏历史卷未留下阻止标记');hx.c.window.redoHistoryPaper(0);assert(hx.created.some(x=>x.textContent==='该历史试卷数据损坏，无法重做'),'损坏历史卷未被安全阻止');
let incompatible={schemaVersion:2,history:[{mode:'题型错配',ids:[132],renderTypes:['single'],fillLevels:['standard']}]},ix=boot(JSON.stringify(incompatible));ix.c.window.redoHistoryPaper(0);assert(ix.created.some(x=>x.textContent==='该历史试卷数据损坏，无法重做'),'题型不兼容历史卷仍可重做');

// G：未来Schema拒绝；Schema 1和缺省版本均迁移成功。
let future=boot();future.c.window.importData({text:JSON.stringify({schemaVersion:999,favorites:[302]})});assert(future.created.some(x=>String(x.textContent).includes('该备份来自更高版本')),'未来Schema导入未明确拒绝');assert(!JSON.parse(future.store.shenrenliu_qbank_v1).favorites.includes(302),'未来Schema错误覆盖了现有数据');
for(const payload of [{schemaVersion:1,favorites:[302]},{favorites:[302]}]){let x=boot();x.c.window.importData({text:JSON.stringify(payload)});let d=JSON.parse(x.store.shenrenliu_qbank_v1);assert(d.schemaVersion===2&&d.favorites.includes(302),'旧版/缺省Schema迁移失败')}
for(const version of [-1,'2']){let x=boot();x.c.window.importData({text:JSON.stringify({schemaVersion:version,favorites:[302]})});assert(x.created.some(z=>String(z.textContent).includes('版本字段不兼容')),'非法Schema版本未拒绝')}

// 设置字段只接受白名单值，比例吸附到合法档位。
let unsafeSettings=boot(JSON.stringify({schemaVersion:2,settings:{theme:'evil',watermark:'script',defaultFillRatio:23}})),safeSettings=JSON.parse(unsafeSettings.store.shenrenliu_qbank_v1).settings;assert(safeSettings.theme==='light'&&safeSettings.watermark==='both'&&safeSettings.defaultFillRatio===25,'设置白名单或比例吸附失败');

// H：放弃恢复点必须二次确认，取消时保持数据。
let keep=boot(saved,{confirm:()=>false});keep.c.window.discardLastSession();assert(JSON.parse(keep.store.shenrenliu_qbank_v1).lastSession,'取消放弃后恢复点被误删');let drop=boot(saved,{confirm:()=>true});drop.c.window.discardLastSession();assert(!JSON.parse(drop.store.shenrenliu_qbank_v1).lastSession,'确认放弃后恢复点未清除');

console.log('边界与恢复校验通过：题量防缩水、严格/普通交卷、重复交卷、断点恢复、异常答案清洗、题型兼容、历史tuple、重做拦截、Schema策略、放弃确认、302跨页与HTML转义均正常。');
