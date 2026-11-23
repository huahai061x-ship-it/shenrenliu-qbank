const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {boot}=require('../scripts/test-app-harness.cjs');let x=boot({settings:{thinkBeforeSelect:true},mastery:{4:'mastered'},favorites:[4]});
x.w.beginRealExam();x.w.setBlankAnswer(0,'旧卷输入');x.t.saveSession();let legacy=x.t.packStore(x.t.getStore());
vm.runInContext(fs.readFileSync('bank-core.js','utf8'),x.c);const C=x.w.BANK_CORE;
const hos={meta:{id:C.HOS,name:'HOS',sourcePageCount:111},questions:x.w.QUESTION_BANK,pedagogy:x.w.HOS_PEDAGOGY,enhancedFill:x.w.HOS_ENHANCED_FILL,ultraCandidates:x.w.ULTRA_CANDIDATES};
const other={meta:{id:'sample',name:'同号测试'},questions:[{id:4,type:'single',stem:'不同题',options:['甲','乙'],answers:['甲']}]};
const both=C.compile([hos,other],[C.HOS,'sample']),only=C.compile([hos],[C.HOS]);const foreign=C.id('sample',4);assert(Number.isSafeInteger(foreign)&&foreign!==4);
const raw={[C.LEGACY]:legacy},storage={getItem:k=>raw[k]||null,setItem:(k,v)=>{raw[k]=v}};let s=new C.Storage(storage,both),data=s.read();assert.equal(data.mastery[4],'mastered');assert.equal(data.settings.thinkBeforeSelect,true);assert.equal(data.lastSession,null);assert.equal(raw[C.LEGACY],legacy);assert.equal(raw[C.KEY+'_legacy_backup'],legacy);data.mastery[foreign]='fuzzy';data.favorites.push(foreign);data.lastSession={ids:[foreign],answers:['甲']};s.persist(data);
assert.equal(raw[C.LEGACY],legacy);assert.equal(s.snapshot().scopeSessions[C.HOS].ids.length,45);assert(s.snapshot().scopeSessions[both.scopeKey].ids.includes(foreign));let reopened=new C.Storage(storage,both),d=reopened.read();assert.equal(d.lastSession.answers[0],'甲');
let narrow=new C.Storage(storage,only),n=narrow.read();assert.equal(n.lastSession.ids.length,45);n.mastery={4:'mastered'};n.favorites=[4];narrow.persist(n);let restored=new C.Storage(storage,both).read();assert.equal(restored.mastery[foreign],'fuzzy');assert(restored.favorites.includes(foreign));
let packed=C.pack({history:[{presentationSnapshots:[{questionId:4,stem:'保留快照'}]}],wrong:{4:{lastPresentation:{questionId:4,stem:'保留快照'}}}});assert.equal(packed.presentationCatalog.length,1);assert.equal(C.unpack(packed).history[0].presentationSnapshots[0].stem,'保留快照');
let broken=new C.Storage({getItem:()=>'{坏json',setItem:()=>{throw Error('不应写入')}},both);assert.throws(()=>broken.read());let quota=new C.Storage(storage,both);quota.read();quota.storage={getItem:storage.getItem,setItem:()=>{throw Error('quota')}};const before=raw[C.KEY];assert.throws(()=>quota.persist(restored));assert.equal(raw[C.KEY],before);
assert.throws(()=>C.compile([hos,other,other],[C.HOS]));assert.throws(()=>C.validate({...other,questions:[{...other.questions[0],answers:['无效答案']}]}));assert.throws(()=>C.validate({...other,questions:[...other.questions,...other.questions]}));assert.throws(()=>C.validate({...other,meta:{...other.meta,sourceBase:'../逃逸'}}));
console.log('PASS 旧版压缩快照迁移、原数据保留、同号隔离、分范围未交卷、暂缺题库记录保留、压缩往返、存储失败、无效数据拦截');

// Some older records contain the learning store directly under the workspace key.
const full={format:'shenrenliu-workspace',version:1,data:C.pack({schemaVersion:2,settings:{theme:'dark'},favorites:[foreign]}),scopeSessions:{sample:{ids:[foreign]}}};
const sample=C.compile([hos,other],['sample']);
x.c.TextEncoder=TextEncoder;
vm.runInContext(fs.readFileSync('backup-core.js','utf8'),x.c);
const transfer=x.w.BACKUP_CORE.encode({...full,includedBankIds:['sample']});
const flat=JSON.stringify({...full.data,lastSession:full.scopeSessions.sample});
const backupKey=C.KEY+'_before_format_migration';
for(const original of [flat,JSON.stringify(JSON.stringify(full)),JSON.stringify({...full,version:'1'}),JSON.stringify({data:full.data,scopeSessions:full.scopeSessions}),transfer,'\ufeff'+JSON.stringify(full)]){
 const db=new Map([[C.KEY,original]]);
 const io={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
 const adapter=new C.Storage(io,sample),view=adapter.read();
 assert.equal(view.settings.theme,'dark');assert(view.favorites.includes(foreign));assert.equal(view.lastSession.ids[0],foreign);
 assert.equal(db.get(backupKey),original);assert.equal(JSON.parse(db.get(C.KEY)).version,1);
 view.settings.theme='light';adapter.persist(view);
 assert.equal(new C.Storage(io,sample).read().settings.theme,'light');assert.equal(db.size,2);
}
for(const original of [JSON.stringify({...full,version:2}),'{"format":"other","settings":{},"schemaVersion":2}','{}','null',transfer.replace('dark','xxxx')]){
 const io={getItem:k=>k===C.KEY?original:null,setItem:()=>assert.fail('unexpected write')};
 assert.throws(()=>new C.Storage(io,sample).read());
}
const blockedDb=new Map([[C.KEY,flat],[backupKey,'older original']]);
const quotaIO={getItem:k=>blockedDb.get(k)??null,setItem:()=>{throw Error('quota')}};
assert.throws(()=>new C.Storage(quotaIO,sample).read(),/quota/);
assert.equal(blockedDb.get(C.KEY),flat);assert.equal(blockedDb.get(backupKey),'older original');
console.log('PASS 工作区兼容迁移、原文保留、续考及再次保存、重复打开、未来版本与校验失败保护');
