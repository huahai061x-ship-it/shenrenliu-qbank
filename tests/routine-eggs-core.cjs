const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{},document:{addEventListener(){}},setInterval(){},Date,localStorage:{getItem(){return null}}};vm.createContext(c);vm.runInContext(fs.readFileSync('routine-eggs.js','utf8'),c);const R=c.window.ROUTINE_EGGS,at=s=>Date.parse(s+'+08:00'),g=s=>R.greeting(at(s)),r=s=>R.routine(at(s));
for(const value of ['2026-10-26T05:29:59','2026-10-26T07:30:00','2026-10-26T22:59:59','2026-10-27T01:00:00','2026-10-27T04:30:00'])assert.equal(g(value),null,value);
for(const value of ['2026-10-26T05:30:00','2026-10-26T07:29:59'])assert.equal(g(value).period,'early');
assert.equal(g('2026-10-26T23:00:00').key,'2026-10-26:late');assert.equal(g('2026-10-27T00:59:59').key,'2026-10-26:late');assert.equal(g('2027-01-01T00:30:00').key,'2026-12-31:late');assert.equal(g('2026-11-01T00:30:00').key,'2026-10-31:late');
for(const [time,period] of [['06:35:00','bus'],['06:39:59','bus'],['11:40:00','lunch'],['12:09:59','lunch'],['17:10:00','off'],['17:29:59','off']])assert.equal(r('2026-10-26T'+time).period,period);
for(const time of ['06:34:59','06:40:00','11:39:59','12:10:00','17:09:59','17:30:00'])assert.equal(r('2026-10-26T'+time),null);
assert.equal(r('2026-10-24T06:37:00').period,'bus','周六按工作日');assert.equal(r('2026-10-25T06:37:00'),null,'周日不催班车');for(const time of ['11:40:00','17:10:00'])assert.equal(r('2026-10-25T'+time).period,'sunday');assert.equal(g('2026-10-25T06:00:00').sunday,true);
for(const period of ['early','late','bus','lunch','off','sunday'])assert(R.COPY[period].length>=3&&R.COPY[period].every(x=>typeof x==='string'&&x.length>10));
for(const name of ['index.html','scripts/build-release.mjs','sw.js']){const source=fs.readFileSync(name,'utf8');assert(source.includes('routine-eggs.js'));assert(source.includes('lulu-avatar.js'));}
console.log('PASS 北京时间早晚精确边界、跨午夜／跨月／跨年共用夜间标记、周一至六三时段、周日休息日、资源纳入完整更新包');
