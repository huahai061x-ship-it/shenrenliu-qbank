const assert=require('assert/strict'),{boot}=require('../scripts/test-app-harness.cjs');
let x=boot();x.c.localStorage.removeItem=k=>delete x.store[k];
const state=()=>x.t.getStore(),saveStudy=n=>{x.w.startStudy('sequence');x.w.jumpQ(n);const id=x.t.getSession().paperId;x.w.pauseAndSave();return id;};
const a=saveStudy(10),b=saveStudy(20);assert.equal(state().recentSessions.length,2);assert.deepEqual(new Set(state().recentSessions.map(x=>x.id)),new Set([a,b]));
x.w.openCollection('wrong');x.w.navHome(true);assert.deepEqual(new Set(state().recentSessions.map(x=>x.id)),new Set([a,b]));
x.w.resumeSavedActivity(a);assert.equal(x.t.getSession().paperId,a);assert.equal(x.t.getSession().items.length,507);x.w.pauseAndSave();
x.w.beginRealExam();let e1=x.t.getSession().paperId;x.w.jumpQ(5);x.w.pauseAndSave();x.w.beginRealExam();let e2=x.t.getSession().paperId;x.w.jumpQ(8);x.w.pauseAndSave();assert.deepEqual(new Set(state().recentSessions.map(x=>x.id)),new Set([e1,e2]));
x.w.resumeSavedActivity(e1);assert.equal(x.t.getSession().paperId,e1);assert.equal(state().lastSession.current,5);x.w.submitExam(true);assert(!state().recentSessions.some(x=>x.id===e1));assert(state().recentSessions.some(x=>x.id===e2));
// One corrupt record must not prevent a different, valid record from loading.
let raw=state();raw.recentSessions.push({id:'broken',kind:'practice',scopeKey:'hos_2026',time:0,snapshot:null});x=boot(raw);assert.equal(state().recentSessions.length,1);assert.equal(state().recentSessions[0].id,e2);
console.log('PASS 两次进度独立更新、浏览列表不覆盖、考试暂停不丢弃、交卷只移除本场、损坏记录隔离');
const fs=require('fs'),vm=require('vm'),c={window:{},TextEncoder};vm.createContext(c);vm.runInContext(fs.readFileSync('backup-core.js','utf8'),c);const B=c.window.BACKUP_CORE;
const record=(id,scopeKey,time)=>({id,kind:'exam',scopeKey,time,snapshot:{paperId:id,ids:[4]}}),envelope=rows=>({format:'shenrenliu-workspace',version:1,includedBankIds:['hos_2026','sinotruk_culture_2025_official'],data:{settings:{},recentSessions:rows},scopeSessions:{},bundles:[]});
const local=envelope([record('a','hos_2026',1),record('b','hos_2026',2)]),incoming=envelope([record('remote','hos_2026',999),record('culture','sinotruk_culture_2025_official',3)]),merged=B.merge(local,incoming);assert.deepEqual(new Set(merged.data.recentSessions.map(x=>x.id)),new Set(['a','b','culture']));assert.equal(B.summary({payload:merged}).sessions,3);assert.equal(B.decode(B.encode(merged)).payload.data.recentSessions.length,3);
assert.equal(B.merge(envelope([]),envelope([])).data.recentSessionsMigrated,false,'旧格式备份没有新字段时仍须迁移旧恢复点');
console.log('PASS 合并优先保留本机两次，其他题库独立补入，备份计数及旧版迁移兼容');
