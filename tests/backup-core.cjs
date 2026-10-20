const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{},TextEncoder};vm.createContext(c);vm.runInContext(fs.readFileSync('backup-core.js','utf8'),c);const B=c.window.BACKUP_CORE;
const plain=x=>JSON.parse(JSON.stringify(x));
const base=()=>({format:'shenrenliu-workspace',version:1,includedBankIds:['hos_2026'],data:{schemaVersion:2,settings:{theme:'dark'},learning:{},seen:{},wrong:{},favorites:[],history:[],mastery:{}},scopeSessions:{},bundles:[]});
assert.equal(B.crc32('123456789'),'cbf43926');
const a=base(),b=base();a.data.learning[4]={last:200,attempts:3,correct:3,wrong:0};a.data.seen[4]=200;a.data.mastery[4]='mastered';a.data.favorites=[4];a.data.wrong[5]={lastCorrect:300,wrongTotal:2,count:0,corrected:true};a.data.history=[{paperId:'one',ids:[4],date:300,score:100}];a.scopeSessions.hos_2026={ids:[4],answers:['原设备较新输入']};
b.data.learning[4]={last:100,attempts:2,correct:1,wrong:1};b.data.learning[5]={last:100,attempts:1,correct:0,wrong:1};b.data.mastery={4:'fuzzy',5:'new'};b.data.favorites=[5];b.data.wrong[5]={lastWrong:100,wrongTotal:1,count:1,corrected:false};b.data.history=[{paperId:'one',ids:[4],date:300,score:100},{paperId:'two',ids:[5],date:200,score:0}];b.scopeSessions.hos_2026={ids:[5],answers:['旧输入']};b.data.settings.theme='light';
let text=B.encode(b,'2026-10-20T08:00:00.000Z'),decoded=B.decode('\uFEFF'+text);assert(decoded.checked);assert.deepEqual(plain(decoded.payload),b);assert(B.summary(decoded).favorites===1);
assert.throws(()=>B.decode(text.slice(0,-15)));assert.throws(()=>B.decode(text.replace('旧输入','被篡改')),/完整性/);assert.throws(()=>B.decode('{"constructor":{}}'));
assert.equal(B.decode(JSON.stringify(b)).checked,false);assert(B.decode(JSON.stringify({schemaVersion:2,settings:{},favorites:[]})).payload.settings);
let merged=plain(B.merge(a,b));assert.equal(merged.data.learning[4].last,200);assert.equal(merged.data.learning[4].attempts,3);assert.equal(merged.data.mastery[4],'mastered');assert.equal(merged.data.mastery[5],'new');assert.deepEqual(merged.data.favorites,[4,5]);assert.equal(merged.data.history.length,2);assert.equal(merged.data.wrong[5].count,0);assert(merged.data.wrong[5].corrected);assert.equal(merged.data.settings.theme,'dark');assert.equal(merged.scopeSessions.hos_2026.answers[0],'原设备较新输入');
assert.deepEqual(plain(B.merge(merged,b)),merged);assert.deepEqual(a.data.favorites,[4]);assert.equal(a.data.history.length,1);
const fresh=plain(B.merge(base(),b));assert.equal(fresh.data.settings.theme,'light');assert.equal(fresh.scopeSessions.hos_2026.answers[0],'旧输入');
for(const mutate of [x=>x.data.history={},x=>x.data.mastery[4]='invalid',x=>x.data.learning[4]=null,x=>x.scopeSessions.hos_2026.ids=['bad'],x=>x.includedBankIds.push('bad id')]){let bad=structuredClone(b);mutate(bad);assert.throws(()=>B.validate(bad))}
console.log('PASS TXT Unicode/BOM/CRC32、旧JSON、截断篡改拦截、合并幂等、不叠加次数、本机掌握与较新记录保护、收藏历史合并、未交卷优先、格式验证');
