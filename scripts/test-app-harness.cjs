const fs=require('fs'),vm=require('vm');
function classes(){const s=new Set();return {add:k=>s.add(k),remove:k=>s.delete(k),toggle(k,on){on?s.add(k):s.delete(k)},contains:k=>s.has(k)}}
function boot(initial={}){
  const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:classes(),append(){},remove(){},click(){},select(){},focus(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []}}),main=node(),nodes={};
  const controls={'#realExamRule':{value:'normal'},'#countBtns .active':{dataset:{n:'30'}},'#examRule':{value:'normal'},'#fillLevel':{value:'enhanced'},'#fillRatio':{value:'15'},'#typeFilter':{value:'all'},'#searchType':{value:'all'}};
  const document={hidden:false,documentElement:{dataset:{}},body:{classList:classes(),append(){}},querySelector:s=>s==='#main'?main:controls[s]||(nodes[s]||(nodes[s]=node())),querySelectorAll:()=>[],addEventListener(){},createElement:node,execCommand(){return true}};
  const store={shenrenliu_qbank_v1:JSON.stringify(initial)},localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
  const c={window:{addEventListener(){},matchMedia:()=>({matches:false}),scrollTo(){},scrollY:0,isSecureContext:true},document,localStorage,location:{protocol:'https:',href:'https://example.test/'},navigator:{userAgent:'Mozilla/5.0',serviceWorker:null},history:{pushState(){},replaceState(){}},performance:{now:()=>1000},requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},structuredClone:o=>JSON.parse(JSON.stringify(o)),confirm:()=>true,prompt(){},alert(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},FileReader:function(){}};
  Object.assign(c.window,{window:c.window,document,localStorage,location:c.location,navigator:c.navigator});vm.createContext(c);
  for(const f of ['questions.js','pedagogy.js','enhanced-fill.js','app.js']){
    let source=fs.readFileSync(f,'utf8');
    if(f==='app.js')source=source.replace('updateWatermark();initBackGuard();renderHome();','window.__V226_TEST__={APP_VERSION,STORE_SCHEMA_VERSION,SESSION_SCHEMA_VERSION,BANK_SCHEMA_VERSION,normalizeSearchText,searchTextMatches,analyzeQuestionTimes,historyTimeAnalysis,sanitizeLastSession,sanitizeHistory,updateLearning,saveSession,getStore:()=>S,getSession:()=>session};updateWatermark();initBackGuard();renderHome();');
    vm.runInContext(source,c,{filename:f});
  }
  return {c,w:c.window,t:c.window.__V226_TEST__,main,nodes,store};
}
module.exports={boot};
