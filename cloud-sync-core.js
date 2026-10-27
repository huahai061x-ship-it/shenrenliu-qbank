// Shared browser/server protocol. Client wall clocks never decide which edit wins.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CLOUD_SYNC_CORE=api;})(typeof window!=='undefined'?window:globalThis,()=>{
  'use strict';
  const P=typeof module==='object'&&module.exports?require('./cloud-sync-payload.js'):window.CLOUD_SYNC_PAYLOAD;
  const QUESTION_FIELDS=['favorite','mastery','wrong','learning','seen','reviewFlags','reviewNotes','pendingPractice','difficultyProgress','rotation'];
  const FIELDS=[...QUESTION_FIELDS,'statistics','exam','activity','preferences','examRotation','openStudy','easterEggs'],DOMAINS=['qq.com','vip.qq.com','foxmail.com','163.com','126.com','yeah.net','sina.com','sina.cn','sohu.com'];
  const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),clone=x=>JSON.parse(JSON.stringify(x));
  function email(input){const value=String(input||'').trim().toLowerCase();if(value.length>254||! /^[a-z0-9][a-z0-9.!#$%&'*+\/=?^_`{|}~-]{0,63}@[a-z0-9.-]+$/.test(value)||value.split('@')[0].includes('..')||!DOMAINS.includes(value.split('@')[1]))throw Error('请使用QQ、网易、 新浪或搜狐等当前支持的大陆常用邮箱');return value;}
  function key(q){const bank=q.bankId||'hos_2026',id=q.sourceQuestionId||q.id;const value=bank+':'+id;if(!validKey(value))throw Error('题目身份无效');return value;}
  const validKey=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,47}:[1-9][0-9]{0,5}$/.test(x);
  const STORE_FIELDS={schemaVersion:'local-format',favorites:'favorite',mastery:'mastery',wrong:'wrong',learning:'learning',seen:'seen',reviewFlags:'reviewFlags',reviewNotes:'reviewNotes',pendingPractice:'pendingPractice',difficultyProgress:'difficultyProgress',aggregateStats:'statistics',history:'exam',recentSessions:'activity',lastSession:'activity-derived',recentSessionsMigrated:'activity-derived',settings:'preferences-with-device-backup-exclusions',examRotation:'rotation+examRotation',openStudy:'openStudy',easterEggs:'easterEggs'};
  const recordId=(key,field)=>key+'/'+field;
  function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(plain(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
  const same=(a,b)=>stable(a)===stable(b);
  function safeTree(value,depth=0){if(depth>40)throw Error('同步记录过深');if(value===null||typeof value==='string'||typeof value==='boolean')return;if(typeof value==='number'&&Number.isFinite(value))return;if(Array.isArray(value)){if(value.length>20000)throw Error('同步数组过长');value.forEach(v=>safeTree(v,depth+1));return;}if(plain(value)){for(const [k,v] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(k))throw Error('同步记录字段无效');safeTree(v,depth+1);}return;}throw Error('同步记录类型无效');}
  function validateValue(field,value){
    if(!FIELDS.includes(field))throw Error('不支持的同步字段');
    if(P.manifest(value)){if(['favorite','mastery','seen','reviewFlags'].includes(field))throw Error('简单状态不能使用分块');P.validateManifest(value);return;}
    if(field==='favorite'){if(typeof value!=='boolean')throw Error('收藏状态无效');return;}
    if(field==='mastery'){if(value!==null&&!['mastered','fuzzy','new'].includes(value))throw Error('掌握状态无效');return;}
    if(value===null)return;
    if(['seen','reviewFlags'].includes(field)){if(!Number.isFinite(value)||value<0)throw Error('学习时间无效');return;}
    if(!plain(value))throw Error('学习记录无效');safeTree(value);
    if(P.length(JSON.stringify(value))>P.MAX_BYTES)throw Error('单份学习记录超过20MB');
    if(field==='wrong')for(const n of ['count','wrongTotal','wrongStreak','lastWrong','lastCorrect','independentCorrectStreak','assistedCorrect'])if(value[n]!=null&&(!Number.isFinite(value[n])||value[n]<0))throw Error('错题计数或时间无效');
    if(field==='exam'&&(!Array.isArray(value.ids)||typeof value.score!=='number'||!Number.isFinite(value.score)||value.score<0||value.score>100))throw Error('成绩记录格式无效');
    if(field==='activity'){
      if(!['exam','practice'].includes(value.kind)||typeof value.id!=='string'||!value.id||value.id.length>80||! /^[a-z0-9_|-]{1,180}$/.test(value.scopeKey)||!Number.isFinite(value.time)||value.time<0||!plain(value.snapshot))throw Error('恢复进度格式无效');
      const paper=value.kind==='exam'?value.snapshot.paperId:value.snapshot.session?.paperId;
      if(paper!==value.id||value.kind==='exam'&&!Array.isArray(value.snapshot.ids)||value.kind==='practice'&&!Array.isArray(value.snapshot.session?.items))throw Error('恢复进度与试卷身份不一致');
    }
    if(field==='statistics')for(const n of ['totalAnswers','totalCorrect','totalStudyMs','totalExams','highestScore'])if(value[n]!=null&&(!Number.isFinite(value[n])||value[n]<0))throw Error('累计统计无效');
  }
  function validateIdentity(row){if(QUESTION_FIELDS.includes(row.field)){if(!/^[a-z][a-z0-9_-]{0,47}:[1-9][0-9]{0,5}$/.test(row.key)||row.key==='global:1')throw Error('逐题记录身份无效');return;}if(row.field==='exam'){if(!row.key.startsWith('paper_')||row.value&&!P.manifest(row.value)&&row.key!==entityKey('paper',examIdentity(row.value)))throw Error('试卷身份不匹配');}else if(row.field==='activity'){if(!row.key.startsWith('activity_')||row.value&&!P.manifest(row.value)&&row.key!==entityKey('activity',row.value.id))throw Error('恢复进度身份不匹配');}else if(row.key!=='global:1')throw Error('账号学习记录身份无效');}
  function forkActivity(value,id,time){const out=clone(value);out.id=id;out.time=time;if(out.kind==='exam'){out.snapshot.paperId=id;out.snapshot.title=(out.snapshot.title||'考试')+' · 冲突副本';}else{out.snapshot.session.paperId=id;out.snapshot.session.title=(out.snapshot.session.title||'背诵')+' · 冲突副本';}validateValue('activity',out);return out;}
  function validateRecord(row){if(!plain(row)||!validKey(row.key)||!FIELDS.includes(row.field)||!Number.isSafeInteger(row.rev)||row.rev<1)throw Error('云端记录结构无效');validateValue(row.field,row.value);validateIdentity(row);return row;}
  function validateOp(op){if(!plain(op)||!validKey(op.key)||!FIELDS.includes(op.field)||!Number.isSafeInteger(op.baseRev)||op.baseRev<0||typeof op.id!=='string'||! /^[a-zA-Z0-9_-]{8,100}$/.test(op.id))throw Error('同步操作结构无效');validateValue(op.field,op.value);validateIdentity(op);return op;}
  function batch(operations){const result=[];let bytes=0;for(const op of operations){validateOp(op);const encoded=P.encode(op.value);const size=P.length(JSON.stringify({...op,value:encoded.value}))+1;if(size>200000)throw Error('单条同步数据过大');if(result.length>=50||bytes+size>200000)break;result.push(op);bytes+=size;}return result;}
  function applyOperation(current,op){validateOp(op);if(current)validateRecord(current);if(current&&(current.key!==op.key||current.field!==op.field))throw Error('记录身份不一致');if(current&&same(current.value,op.value))return {status:'accepted',id:op.id,record:clone(current),changed:false};if((current?.rev||0)!==op.baseRev)return {status:'conflict',id:op.id,record:current?clone(current):null,changed:false};return {status:'accepted',id:op.id,record:{key:op.key,field:op.field,value:clone(op.value),rev:(current?.rev||0)+1},changed:true};}
  const entityKey=(kind,id)=>kind+'_'+P.hash(String(id)).slice(0,32)+':1';
  function examIdentity(v){return v.paperId||P.fingerprint({time:v.time,ids:v.ids,mode:v.mode,count:v.count,score:v.score});}
  function values(store,questions){
    const out={},put=(key,field,value)=>{out[recordId(key,field)]={key,field,value};},favorites=new Set(store.favorites||[]);
    for(const q of questions){const k=key(q);put(k,'favorite',favorites.has(q.id));put(k,'mastery',store.mastery?.[q.id]||null);put(k,'wrong',store.wrong?.[q.id]?clone(store.wrong[q.id]):null);
      for(const field of QUESTION_FIELDS.slice(3,-1))if(store[field]?.[q.id]!=null)put(k,field,clone(store[field][q.id]));
      const r=store.examRotation;if(r?.usage?.[q.id]!=null||r?.lastSeenRound?.[q.id]!=null)put(k,'rotation',{usage:r.usage?.[q.id]||0,lastSeenRound:r.lastSeenRound?.[q.id]||0});
    }
    if(store.aggregateStats)put('global:1','statistics',clone(store.aggregateStats));
    for(const h of store.history||[])put(entityKey('paper',examIdentity(h)),'exam',clone(h));
    for(const activity of store.recentSessions||[])put(entityKey('activity',activity.id),'activity',clone(activity));
    if(store.settings){const {lastBackup,backupDismissedUntil,lastBackupMetrics,...preferences}=store.settings;put('global:1','preferences',clone(preferences));}
    if(store.examRotation)put('global:1','examRotation',{round:store.examRotation.round||0,recent:clone(store.examRotation.recent||[])});
    for(const field of ['openStudy','easterEggs'])if(store[field])put('global:1',field,clone(store[field]));
    return out;
  }
  function emptyValue(item){const v=item.value;if(v===null||v===false)return true;if(['seen','reviewFlags'].includes(item.field))return v===0;if(item.field==='statistics')return !(v.totalAnswers||v.totalExams||v.totalStudyMs||v.highestScore);if(item.field==='examRotation')return !v.round&&!v.recent?.length;if(item.field==='openStudy')return !Object.keys(v).length;if(item.field==='easterEggs')return !v.discovered?.length&&!Object.values(v.triggerCounts||{}).some(Boolean);return false;}
  function sameSnapshot(item,value){return item.hash?item.hash===P.fingerprint(value):same(item.value,value);}
  function compactState(state){
    const out=clone({...state,records:{},baseline:{},pending:{},conflicts:{}}),compact=(row,revision)=>({...{key:row.key,field:row.field},...(revision?{rev:row.rev}:{}),hash:row.hash||P.fingerprint(row.value)});
    for(const [id,row] of Object.entries(state.records||{}))out.records[id]=compact(row,true);
    for(const [id,row] of Object.entries(state.baseline||{}))out.baseline[id]=compact(row,false);
    for(const [id,op] of Object.entries(state.pending||{})){if(P.length(JSON.stringify(op))<8000)out.pending[id]=clone(op);else{const {value,...meta}=op;out.pending[id]={...meta,valueRef:P.fingerprint(value)};}}
    return out;
  }
  function restoreState(state,now){
    const out=clone(state);out.conflicts={};
    for(const [id,row] of Object.entries(out.records||{})){if(row.hash){if(!validKey(row.key)||!FIELDS.includes(row.field)||!Number.isSafeInteger(row.rev)||row.rev<1||!/^[a-f0-9]{64}$/.test(row.hash))throw Error('同步缓存无效');}else validateRecord(row);}
    for(const [id,op] of Object.entries(out.pending||{})){if(op.valueRef){const value=now[id]?.value??null;delete op.valueRef;op.value=clone(value);}validateOp(op);}
    return out;
  }
  function bootstrap(local,remote,pending={}){const rows={},conflicts=[],upload=[],download=[];for(const row of remote){validateRecord(row);const id=recordId(row.key,row.field);if(rows[id])throw Error('云端重复记录');rows[id]=clone(row);}for(const [id,item] of Object.entries(local)){const old=rows[id];if(old){if(!same(item.value,old.value)){const empty=emptyValue(item);if(empty)download.push(old);else conflicts.push({id,local:clone(item),remote:old});}}else if(!emptyValue(item))upload.push({...clone(item),baseRev:0});}for(const [id,row] of Object.entries(rows))if(!local[id])download.push(row);for(const [id,op] of Object.entries(pending)){const item=local[id]||op,row=rows[id];if(row&&!same(item.value,row.value)){const old=conflicts.findIndex(x=>x.id===id);if(old>=0)conflicts.splice(old,1);for(let i=download.length-1;i>=0;i--)if(recordId(download[i].key,download[i].field)===id)download.splice(i,1);conflicts.push({id,local:clone(item),remote:row});}else if(!row&&!upload.some(x=>recordId(x.key,x.field)===id))upload.push({...clone(item),baseRev:0});}return {records:rows,conflicts,upload,download};}
  function capture(snapshot,current,pending,records,idFactory){
    const next={...pending};
    for(const [id,item] of Object.entries(current)){if(snapshot[id]&&sameSnapshot(snapshot[id],item.value))continue;if(!snapshot[id]&&emptyValue(item))continue;validateValue(item.field,item.value);next[id]={...clone(item),baseRev:snapshot[id]?(records[id]?.rev||0):0,id:idFactory()};}
    for(const [id,item] of Object.entries(snapshot)){if(current[id]||QUESTION_FIELDS.includes(item.field)&&!current[recordId(item.key,'favorite')])continue;if(!item.hash&&emptyValue(item))continue;next[id]={key:item.key,field:item.field,value:null,baseRev:records[id]?.rev||0,id:idFactory()};}
    return next;
  }
  function acknowledge(pending,records,conflicts,results){const next={...pending},known={...records},issues={...conflicts};for(const result of results){const row=result.record;if(!row)throw Error('云端记录缺失，已保留本机变更');validateRecord(row);const id=recordId(row.key,row.field);if(!['accepted','conflict'].includes(result.status))throw Error('同步回复无效');if(!known[id]||row.rev>=known[id].rev)known[id]=clone(row);if(next[id]?.id!==result.id){if(next[id]&&result.status==='accepted'&&next[id].baseRev===(records[id]?.rev||0)&&row.rev>=next[id].baseRev)next[id]={...next[id],baseRev:row.rev};continue;}if(result.status==='accepted'){delete next[id];delete issues[id];}else issues[id]={local:clone(next[id]),remote:clone(row),...(result.reason?{reason:String(result.reason).slice(0,200)}:{})};}return {pending:next,records:known,conflicts:issues};}
  function resolve(state,id,choice,idFactory){const issue=state.conflicts[id];if(!issue||!['local','remote'].includes(choice))throw Error('请选择本机或云端记录');const next=clone(state);delete next.conflicts[id];if(choice==='remote'){delete next.pending[id];return {state:next,apply:issue.remote};}next.pending[id]={...issue.local,baseRev:issue.remote.rev,id:idFactory()};return {state:next,apply:null};}
  function project(store,questions,rows){
    const out=clone(store),catalog=new Map(questions.map(q=>[key(q),q])),ids=new Set(questions.map(q=>q.id)),history=new Map((out.history||[]).map(h=>[entityKey('paper',examIdentity(h)),h])),activities=new Map((out.recentSessions||[]).map(r=>[entityKey('activity',r.id),r])),scopes=new Set();
    for(const row of rows){validateRecord(row);if(P.manifest(row.value))throw Error('恢复记录尚未下载完整');const q=catalog.get(row.key),value=row.value;
      if(QUESTION_FIELDS.includes(row.field)){if(!q)continue;if(row.field==='favorite'){const fav=new Set(out.favorites||[]);value?fav.add(q.id):fav.delete(q.id);out.favorites=[...fav];}
        else if(row.field==='rotation'){out.examRotation||={};for(const k of ['usage','lastSeenRound']){out.examRotation[k]||={};if(value===null)delete out.examRotation[k][q.id];else out.examRotation[k][q.id]=value[k]||0;}}
        else{const field=row.field;out[field]||={};if(value===null)delete out[field][q.id];else out[field][q.id]=clone(value);}continue;}
      if(row.field==='exam'){if(value&&(value.ids||[]).some(id=>!ids.has(id)))throw Error('历史试卷需要的题库尚未加载，请先导入相同题库');value===null?history.delete(row.key):history.set(row.key,clone(value));}
      else if(row.field==='activity'){const old=activities.get(row.key);if(old)scopes.add(old.scopeKey);if(value){const referenced=value.kind==='exam'?value.snapshot.ids:value.snapshot.session.items.map(i=>i.questionId);if(referenced.some(id=>!ids.has(id)))throw Error('恢复进度需要的题库尚未加载，请先导入相同题库');scopes.add(value.scopeKey);activities.set(row.key,clone(value));}else activities.delete(row.key);}
      else if(row.field==='statistics')out.aggregateStats=value===null?{}:clone(value);
      else if(row.field==='preferences'){const local=out.settings||{};out.settings={...(value||{}),lastBackup:local.lastBackup||0,backupDismissedUntil:local.backupDismissedUntil||0,lastBackupMetrics:clone(local.lastBackupMetrics||{})};}
      else if(row.field==='examRotation')out.examRotation={...(out.examRotation||{}),round:value?.round||0,recent:clone(value?.recent||[])};
      else if(['openStudy','easterEggs'].includes(row.field))out[row.field]=clone(value||{});
    }
    if(rows.some(r=>r.field==='exam'))out.history=[...history.values()].sort((a,b)=>b.time-a.time).slice(0,50);
    let retired=false;const completed=new Set([...history.values()].map(h=>h.paperId).filter(Boolean));for(const [id,row] of activities)if(row.kind==='exam'&&completed.has(row.id)){scopes.add(row.scopeKey);activities.delete(id);retired=true;}if(rows.some(r=>r.field==='activity')||retired){const counts=new Map();out.recentSessions=[...activities.values()].sort((a,b)=>b.time-a.time).filter(r=>{const n=counts.get(r.scopeKey)||0;counts.set(r.scopeKey,n+1);return n<2}).slice(0,128);out.recentSessionsMigrated=true;out.__cloudActivityScopes=[...scopes];}
    return out;
  }
  return {FIELDS,QUESTION_FIELDS,STORE_FIELDS,forkActivity,DOMAINS,entityKey,examIdentity,emptyValue,compactState,restoreState,email,key,recordId,same,clone,validateValue,validateRecord,validateOp,batch,applyOperation,values,bootstrap,capture,acknowledge,resolve,project};
});
