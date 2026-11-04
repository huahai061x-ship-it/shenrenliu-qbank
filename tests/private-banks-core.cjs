const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createHash,webcrypto} = require('node:crypto');
const banks=['forming_forging_2026','forming_casting_2026'].map(id=>({meta:{id},questions:[{id:1,stem:'TEST FIXTURE'}]}));
const pack={format:'qbank-private-pair/v1',banks};
let source=fs.readFileSync('private-banks.js','utf8');
for(const bank of banks){
 const digest=createHash('sha256').update(JSON.stringify(bank)).digest('hex');
 source=source.replace(new RegExp("("+bank.meta.id+": ')[0-9a-f]{64}"),'$1'+digest);
}
const raw=Object.create(null);
for(const [k,v] of Object.entries({
  getItem:k=>Object.hasOwn(raw,k)?raw[k]:null,
  setItem:(k,v)=>{raw[k]=String(v);}, removeItem:k=>{delete raw[k];}
}))Object.defineProperty(raw,k,{value:v});
function browser(active){
 const window={localStorage:raw};
 vm.runInNewContext(source,{window,URL,location:{href:'https://example.test/qbank/'+(active?'?localBanks=1':'')},TextEncoder,crypto:webcrypto});
 return window;
}
(async()=>{
 const publicPage=browser(false);
 raw.setItem('history','public sentinel');
 await publicPage.QBANK_PRIVATE.install(pack);
 assert.equal(await publicPage.QBANK_PRIVATE.installed(),true);
 const privatePage=browser(true);
 assert.equal(privatePage.QBANK_CLOUD_CONFIG.enabled,false);
 assert.equal(privatePage.localStorage.getItem('history'),null);
 privatePage.localStorage.setItem('history','local sentinel');
 assert.deepEqual(Object.keys(privatePage.localStorage),['history']);
 assert.equal(raw.getItem('history'),'public sentinel');
 assert.equal((await privatePage.QBANK_PRIVATE.read()).length,2);
 const original=raw.getItem('srl_verified_local_pair_v1');
 const invalid=structuredClone(pack);invalid.banks[1].questions[0].stem='different fixture';
 await assert.rejects(()=>publicPage.QBANK_PRIVATE.install(invalid),/不一致/);
 assert.equal(raw.getItem('srl_verified_local_pair_v1'),original);
 await assert.rejects(()=>publicPage.QBANK_PRIVATE.install({...pack,banks:[banks[0],banks[0]]}),/重复/);
 assert.equal(raw.getItem('srl_verified_local_pair_v1'),original);
 privatePage.localStorage.clear();assert.equal(raw.getItem('history'),'public sentinel');
 assert.equal(publicPage.QBANK_PRIVATE.installed(),true);
 console.log('PASS 两库整包身份/指纹、原子性、本机命名空间、关闭云端、公开学习进度隔离');
})().catch(e=>{console.error(e);process.exitCode=1});
