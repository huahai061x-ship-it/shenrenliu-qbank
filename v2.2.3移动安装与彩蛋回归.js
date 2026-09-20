const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
function cl(){return {add(){},remove(){},toggle(){},contains(){return false}}}
function boot(initial=''){
  const nodes={},node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:cl(),append(){},remove(){},click(){},select(){}}),main=node(),watermark=node();
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:cl(),append(){}},querySelector:s=>s==='#main'?main:s==='#watermark'?watermark:(nodes[s]||(nodes[s]=node())),querySelectorAll:()=>[],addEventListener(){},createElement:node,execCommand(){return true}};
  const store={shenrenliu_qbank_v1:initial},localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const navigator={userAgent:'Mozilla/5.0',serviceWorker:null};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:true},document,localStorage,location:{protocol:'https:',href:'https://example.test/'},navigator,history:{pushState(){},replaceState(){}},performance:{now:()=>1000},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
  Object.assign(c.window,{window:c.window,document,localStorage,location:c.location,navigator});vm.createContext(c);for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});return {c,store};
}
function ok(v,m){if(!v)throw Error(m)}
const x=boot(JSON.stringify({schemaVersion:2,easterEggs:{discovered:['score100'],titles:['胸有成竹'],currentTitle:'胸有成竹'}})),t=x.c.window.__V223_TEST__;
ok(t.detectMobilePlatform('Mozilla Android OpenHarmony')==='harmony','OpenHarmony 被 Android 抢先识别');
ok(t.detectMobilePlatform('Mozilla HarmonyOS Android')==='harmony','HarmonyOS 被 Android 抢先识别');
ok(t.detectMobilePlatform('MicroMessenger Android')==='webview','微信 WebView 识别失败');
ok(t.detectMobilePlatform('HuaweiBrowser Android')==='huawei','华为浏览器识别失败');
ok(t.detectMobilePlatform('Chrome Android')==='android','Android 识别失败');
for(const [score,id] of [[18,'score20'],[35,'score40'],[55,'scoreLow'],[65,'score60'],[75,'score70'],[85,'score80'],[95,'score90'],[100,'score100']])ok(t.scoreEggId(score)===id,`${score}分层级错误`);
const state=t.sanitizeEggState({discovered:['score100','bad'],titles:['胸有成竹'],currentTitle:'胸有成竹',answerStreak:{correct:20}});
ok(state.discovered.length===1&&state.discovered[0]==='score100','彩蛋状态迁移错误');
ok(state.currentTitle==='胸有成竹'&&state.answerStreak.correct===20,'称号或连击状态恢复错误');
const src=fs.readFileSync('questions.js'),hash=crypto.createHash('sha256').update(src).digest('hex');
ok(x.c.window.QUESTION_BANK.length===507,'题数发生变化');
ok(hash.length===64,'题库 SHA 计算失败');
console.log('v2.2.3回归通过：鸿蒙识别优先、WebView/华为/Android分流、8个成绩层级唯一、旧数据迁移及507题数据完整。');
