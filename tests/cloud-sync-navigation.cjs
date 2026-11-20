const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src=path.resolve(__dirname,'..');
const candidate=src;
const C = require(path.join(src, 'cloud-sync-core.js'));
const P = require(path.join(src, 'cloud-sync-payload.js'));
const { boot } = require(path.join(src, 'tests/cloud-sync-controller.cjs'));
process.chdir(candidate);
const tick = () => new Promise(resolve => setImmediate(resolve));

async function normalNavigation() {
  const a = await boot({ policy: 'account' });
  a.store.history[0].optional = undefined;
  a.store.recentSessions[0].optional = undefined;
  a.rows.set('hos_2026:1/mastery', { key: 'hos_2026:1', field: 'mastery', value: 'mastered', rev: 1 });
  a.store.mastery[1] = 'fuzzy';
  await a.sync.sync();
  assert.equal(a.sync.status(), '已同步全部学习数据');
  assert.equal(a.store.mastery[1], 'mastered');
  assert.equal(Object.keys(a.state().pending).length, 0);
  const changed = await boot({policy:'account'});
  changed.rows.set('hos_2026:1/mastery',{key:'hos_2026:1',field:'mastery',value:'mastered',rev:1});
  changed.store.mastery[1]='fuzzy';
  changed.hooks.recovery=()=>{changed.store.favorites=[];};
  await changed.sync.sync();assert.match(changed.sync.status(),/学习记录已变化/);
  assert.equal(changed.store.mastery[1],'fuzzy');
  const b = await boot();
  let status;
  b.rows.set('hos_2026:1/mastery', { key: 'hos_2026:1', field: 'mastery', value: 'mastered', rev: 1 });
  b.hooks.pull = records => { b.sync.onView(false); return records; };
  await b.sync.sync();
  status = b.sync.status();
  assert.doesNotMatch(status, /失败|暂缓|异常/);
  assert.equal(b.store.mastery[1], undefined);
  assert.equal(b.state().records['hos_2026:1/mastery'], undefined);
  delete b.hooks.pull;
  b.sync.onView(true);
  await b.sync.sync();
  assert.equal(b.store.mastery[1], 'mastered');
  assert.equal(b.sync.status(), '已同步全部学习数据');
  console.log('PASS unchanged live snapshot, true mutation, navigation while pull, later apply.');
}

async function firstAccount(errors) {
  const events={}, requests=[], timers=new Map(), rows=new Map([['shenrenliu_cloud_v1_unit_owner','a']]);
  const user={uid:'a',email:'demo@qq.com'};
  const doc={hidden:false,querySelector:s=>s==='#cloudAccountButton'?{setAttribute(){}}:null,addEventListener(){}};
  const win={CLOUD_SYNC_CORE:C,CLOUD_SYNC_PAYLOAD:P,QBANK_CLOUD_CONFIG:{envId:'unit',enabled:true},addEventListener:(name,fn)=>events[name]=fn,
    createQbankCloudbase:async()=>({currentUser:async()=>user,signOut:async()=>{},request:async(data,o)=>{
      requests.push({action:data.action,owner:o.expectedUid});
      const error=errors.shift();if(error)throw error;
      return {records:[]};
    }})};
  let id=0;
  const context={window:win,document:doc,navigator:{onLine:true},localStorage:{getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)},setInterval(){},setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout:key=>timers.delete(key)};
  vm.runInNewContext(fs.readFileSync(path.join(candidate,'cloud-sync.js'),'utf8'),context);
  await win.CLOUD_SYNC.attach({getStore:()=>({}),questions:()=>[],apply:()=>true});
  async function fire(ms) {
    const hit=[...timers].find(([,t])=>t.ms===ms);
    assert.ok(hit,'expected timer '+ms);timers.delete(hit[0]);hit[1].fn();await tick();
  }
  return {sync:win.CLOUD_SYNC, timers, events, requests, fire, doc, nav:context.navigator};
}
async function bootstrap(){
  const network=()=>Error('REQUEST_CANCELED');
  let a=await firstAccount([network(),network()]);
  assert.equal(a.requests.length,1);
  await a.fire(2500);await a.fire(8000);
  assert.deepEqual(a.requests.map(r=>r.owner),['a','a','a']);
  assert.equal(a.sync.connected(),false); // connected only after the user approves the initial merge
  assert.equal(a.timers.size,0);
  a=await firstAccount([network(),network(),network(),network()]);await a.fire(2500);await a.fire(8000);
  assert.equal(a.requests.length,3);assert.equal(a.timers.size,0);assert.match(a.sync.status(),/CANCELED/);
  a=await firstAccount([network()]);a.nav.onLine=false;await a.fire(2500);assert.equal(a.requests.length,1);
  a.nav.onLine=true;a.events.online();await a.fire(0);assert.equal(a.requests.length,2);
  a=await firstAccount([network()]);a.doc.hidden=true;await a.fire(2500);assert.equal(a.requests.length,1);
  a=await firstAccount([network()]);await a.sync.logout();assert.equal(a.timers.size,0);assert.equal(a.sync.status(),'未登录');
  a=await firstAccount([Error('INVALID_ACCESS_TOKEN')]);assert.equal(a.requests.length,1);assert.equal(a.timers.size,0);
  console.log('PASS initial read retries without re-login or approval, budget, offline/foreground, hidden, logout, auth errors.');
}
async function transport(){
  const window={};vm.runInNewContext(fs.readFileSync(path.join(candidate,'cloud-sync-cloudbase.js'),'utf8'),{window});
  const temporary=window.createQbankCloudbase.temporaryFailure;
  assert.equal(temporary({errCode:'REQUEST_CANCELED'}),true);
  assert.equal(temporary({response:{status:503}}),true);
  assert.equal(temporary({status:401,message:'network auth'}),false);
  assert.equal(temporary({code:'INVALID_ACCESS_TOKEN',message:'network'}),false);
  assert.equal(temporary({errCode:'RATE_LIMIT_EXCEEDED',errMsg:'network'}),false);
  assert.equal(temporary({code:'timeout'}),true);
  console.log('PASS structured network errors; permanent identity/validation/rate failures remain visible.');
}
Promise.resolve().then(normalNavigation).then(bootstrap).then(transport).catch(e=>{console.error(e);process.exitCode=1});
