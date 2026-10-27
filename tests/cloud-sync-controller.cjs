const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),C=require('../cloud-sync-core.js');
const clone=x=>JSON.parse(JSON.stringify(x)),deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
async function boot({corrupt=false}={}){
 const store={favorites:[1],mastery:{},wrong:{},history:[{score:88}],recentSessions:[{id:'local-paper'}]},questions=[{id:1,bankId:'hos_2026',sourceQuestionId:1}],rows=new Map(),storage=new Map(),timers=new Map(),intervals=[],requests=[],hooks={};let serial=0,applied=0;
 const row={key:'hos_2026:1',field:'favorite',value:true,rev:1};rows.set(C.recordId(row.key,row.field),row);
 const prefix='shenrenliu_cloud_v1_unit-env_';storage.set(prefix+'owner','reader-a');storage.set(prefix+'reader-a',corrupt?'broken':JSON.stringify({version:1,scopeVersion:2,approved:true,records:{[C.recordId(row.key,row.field)]:row},pending:{},conflicts:{},baseline:C.values(store,questions)}));
 const transport={async currentUser(){return {uid:'reader-a',email:'reader@qq.com'}},async signOut(){},async request(data){requests.push(clone(data));if(data.action==='push'){const results=data.operations.map(op=>{const id=C.recordId(op.key,op.field),result=C.applyOperation(rows.get(id),op);if(result.changed)rows.set(id,result.record);return result});if(hooks.push)await hooks.push();return {results};}let records=[...rows.values()].map(clone);if(hooks.pull)records=await hooks.pull(records);return {records};}};
 const button={setAttribute(){},innerHTML:'',hidden:false},document={hidden:false,querySelector(q){return q==='#cloudAccountButton'?button:null},addEventListener(){},createElement(){return {append(){}}}},window={CLOUD_SYNC_CORE:C,QBANK_CLOUD_CONFIG:{enabled:true,envId:'unit-env'},createQbankCloudbase:async()=>transport,addEventListener(){}},navigator={onLine:true},context={window,document,navigator,crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial},clearTimeout:id=>timers.delete(id),setInterval:fn=>intervals.push(fn),Date,console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('cloud-sync.js','utf8'),context);
 const sync=window.CLOUD_SYNC;await sync.attach({getStore:()=>store,questions:()=>questions,apply(next){applied++;store.favorites=next.favorites;store.mastery=next.mastery;store.wrong=next.wrong;return true}});
 return {sync,store,rows,storage,timers,intervals,requests,hooks,navigator,document,state:()=>JSON.parse(storage.get(prefix+'reader-a')),applied:()=>applied};
}
(async()=>{
 const a=await boot(),started=deferred(),release=deferred();
 a.store.mastery[1]='fuzzy';a.hooks.push=()=>{started.resolve();return release.promise};
 const uploading=a.sync.sync();await started.promise;a.store.mastery[1]='mastered';a.sync.changed();release.resolve();await uploading;
 assert.equal(a.store.mastery[1],'mastered');assert.equal(Object.keys(a.state().conflicts).length,0);assert.equal(a.state().pending['hos_2026:1/mastery'].value,'mastered');
 delete a.hooks.push;await a.sync.sync();assert.equal(a.rows.get('hos_2026:1/mastery').value,'mastered');assert.equal(a.rows.get('hos_2026:1/mastery').rev,2);assert.equal(Object.keys(a.state().pending).length,0);assert.equal(a.store.history[0].score,88);assert.equal(a.store.recentSessions[0].id,'local-paper');
 console.log('PASS 上传返回前再次修改，250ms采集前也保留新值；自己的上一版本不会被误判成冲突');
 const b=await boot(),pulling=deferred(),finishPull=deferred();b.hooks.pull=async records=>{pulling.resolve();await finishPull.promise;return [...records,{key:'hos_2026:1',field:'mastery',value:'mastered',rev:1}]};
 const request=b.sync.sync();await pulling.promise;const count=b.applied();await b.sync.logout();finishPull.resolve();await request;
 assert.equal(b.applied(),count);assert.equal(b.store.mastery[1],undefined);assert.equal(b.sync.status(),'未登录');assert(b.store.favorites.includes(1));
 console.log('PASS 退出登录使在途同步响应失效，不继续接收、不写入退出后的状态，本机记录保留');
 const c=await boot();c.hooks.pull=async records=>[...records,...records];await c.sync.sync();assert(c.sync.status().includes('重复'));assert.deepEqual(c.store.favorites,[1]);
 console.log('PASS 重复分页响应停止整批接收，保留本机数据');
 const d=await boot({corrupt:true});assert(d.sync.status().includes('缓存无效'));assert.equal(d.requests.length,0);await d.sync.sync();assert.equal(d.requests.length,0);assert.deepEqual(d.store.favorites,[1]);
 console.log('PASS 损坏同步缓存不发出请求、不删除本机记录，也不清除取证数据');
 const e=await boot();assert(e.sync.bulkWarning().includes('其他设备'));const before=e.requests.length;e.document.hidden=true;e.intervals[0]();e.document.hidden=false;e.sync.onView(false);e.intervals[0]();e.navigator.onLine=false;e.sync.onView(true);e.intervals[0]();assert.equal(e.requests.length,before);e.navigator.onLine=true;e.intervals[0]();await new Promise(r=>setImmediate(r));assert(e.requests.length>before);
 console.log('PASS 定时刷新只在可见首页且联网登录时请求；导入清空提示说明同账号多端影响');
})().catch(error=>{console.error(error);process.exitCode=1});
