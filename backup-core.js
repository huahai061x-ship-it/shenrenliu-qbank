(()=>{'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const MAX_BYTES=20*1024*1024;
function crc32(text){let c=0xffffffff;for(const b of new TextEncoder().encode(text)){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0)}return ((c^0xffffffff)>>>0).toString(16).padStart(8,'0')}
function validate(e){
 if(!plain(e)||e.format!=='shenrenliu-workspace'||e.version!==1||!plain(e.data)||!Array.isArray(e.includedBankIds)||!e.includedBankIds.length||new Set(e.includedBankIds).size!==e.includedBankIds.length||e.includedBankIds.some(n=>typeof n!=='string'||!/^[a-z][a-z0-9_-]{0,47}$/.test(n)))throw Error('备份身份或版本不正确');
 const d=e.data;
 if(d.schemaVersion!=null&&d.schemaVersion>2)throw Error('备份来自更新的数据版本，请先更新网站');
 for(const k of ['wrong','mastery','reviewFlags','seen','learning','difficultyProgress','reviewNotes','pendingPractice','openStudy'])if(d[k]!=null&&!plain(d[k]))throw Error('备份字段无效：'+k);
 for(const k of ['favorites','history'])if(d[k]!=null&&!Array.isArray(d[k]))throw Error('备份字段无效：'+k);
 if((d.favorites||[]).some(n=>!Number.isSafeInteger(n)||n<1))throw Error('收藏题号无效');
 if((d.history||[]).some(h=>!plain(h)||!Array.isArray(h.ids)||h.ids.some(n=>!Number.isSafeInteger(n)||n<1)))throw Error('历史试卷格式无效');
 for(const k of ['wrong','learning','difficultyProgress','reviewNotes','pendingPractice','openStudy'])if(Object.values(d[k]||{}).some(v=>!plain(v)))throw Error('备份记录无效：'+k);
 for(const k of ['wrong','learning'])for(const v of Object.values(d[k]||{}))for(const f of ['count','wrongTotal','attempts','correct','wrong','totalMs','timedAttempts','last','lastWrong','lastCorrect','due'])if(v[f]!=null&&(!Number.isFinite(v[f])||v[f]<0))throw Error('备份计数或时间无效：'+k+'.'+f);
 for(const k of ['reviewNotes','pendingPractice'])for(const v of Object.values(d[k]||{}))if(v.time!=null&&(!Number.isFinite(v.time)||v.time<0))throw Error('备份时间无效：'+k);
 for(const k of ['seen','reviewFlags'])if(Object.values(d[k]||{}).some(v=>!Number.isFinite(v)||v<0))throw Error('备份时间无效：'+k);
 if(Object.values(d.mastery||{}).some(v=>!['','new','fuzzy','mastered'].includes(v)))throw Error('掌握状态无效');
 if(d.settings!=null&&!plain(d.settings)||e.scopeSessions!=null&&!plain(e.scopeSessions)||e.bundles!=null&&!Array.isArray(e.bundles))throw Error('备份设置、未交试卷或题库格式无效');
 for(const s of Object.values(e.scopeSessions||{}))if(s!=null&&(!plain(s)||!Array.isArray(s.ids)||s.ids.some(n=>!Number.isSafeInteger(n)||n<1)))throw Error('未交试卷格式无效');
 return true;
}
function encode(payload,createdAt=new Date().toISOString()){
 validate(payload);let p=clone(payload),checksum='crc32:'+crc32(JSON.stringify(p));
 const text=JSON.stringify({format:'shenrenliu-backup',version:1,createdAt,checksum,payload:p},null,2);
 if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('备份超过20MB，请在高级导出中按所选题库分批备份');
 return text;
}
function decode(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('文件超过20MB或内容无效');
 let e;try{e=JSON.parse(text.replace(/^\uFEFF/,''),(k,v)=>{if(['__proto__','prototype','constructor'].includes(k))throw Error('不安全字段');return v})}catch(_){throw Error('文件内容不完整或不是学习备份，请选择原始TXT/JSON文件，不要复制聊天预览文字')}
 let createdAt=null,checked=false;
 if(e?.format==='shenrenliu-backup'){
  if(e.version!==1||!plain(e.payload)||e.checksum!=='crc32:'+crc32(JSON.stringify(e.payload)))throw Error('文件完整性校验失败，可能被截断或修改，请重新发送原文件');
  createdAt=e.createdAt;checked=true;e=e.payload;
 }
 if(e?.format==='shenrenliu-workspace')validate(e);
 else if(!plain(e)||e.format||!plain(e.settings)||e.schemaVersion>2)throw Error('这不是支持的学习备份文件');
 return {payload:e,createdAt,checked};
}
function time(v){return Math.max(0,...['last','time','lastWrong','lastCorrect','updatedAt'].map(k=>Number(v?.[k])||0))}
function mergeRecord(a,b){
 if(a==null)return clone(b);if(b==null)return clone(a);
 let recent=time(b)>time(a)?b:a,out=clone(recent);
 if(typeof a.attempts==='number'||typeof b.attempts==='number'){
  const cumulative=(b.attempts||0)>(a.attempts||0)?b:(a.attempts||0)>(b.attempts||0)?a:recent;
  for(const k of ['attempts','correct','wrong','totalMs','timedAttempts','assistedCorrect','lowConfidenceCorrect'])if(typeof cumulative[k]==='number')out[k]=cumulative[k];
 }
 const understood=(b.understandingAt||0)>(a.understandingAt||0)?b:a;if(understood.understandingAt){out.understandingAt=understood.understandingAt;out.understanding=understood.understanding}
 for(const k of ['wrongTotal','totalExposure','regularExposure','fillExposure'])if(typeof a[k]==='number'||typeof b[k]==='number')out[k]=Math.max(a[k]||0,b[k]||0);
 return out;
}
function histories(a=[],b=[]){let seen=new Set;return [...a,...b].sort((x,y)=>(y.time||y.date||y.started||0)-(x.time||x.date||x.started||0)).filter(h=>{let k=h.paperId||JSON.stringify([h.time,h.date,h.started,h.ids,h.score,h.userAnswers]);if(seen.has(k))return false;seen.add(k);return true}).slice(0,50)}
function maxTree(a,b){if(typeof a==='number'&&typeof b==='number')return Math.max(a,b);if(plain(a)&&plain(b)){let o={...b};for(const k of Object.keys(a))o[k]=k in b?maxTree(a[k],b[k]):a[k];return o}return a??b}
function merge(local,incoming){
 validate(local);validate(incoming);let e=clone(local),a=e.data,b=incoming.data;
 for(const key of ['learning','wrong','difficultyProgress','reviewNotes','pendingPractice','openStudy']){a[key]||={};for(const [n,r] of Object.entries(b[key]||{}))a[key][n]=mergeRecord(a[key][n],r)}
 for(const key of ['seen','reviewFlags']){a[key]||={};for(const [n,v] of Object.entries(b[key]||{}))a[key][n]=Math.max(a[key][n]||0,v)}
 // Without dedicated timestamps, preserve explicit local mastery on conflicts.
 a.mastery={...b.mastery,...a.mastery};a.favorites=[...new Set([...(a.favorites||[]),...(b.favorites||[])])];
 for(const [n,r] of Object.entries(a.pendingPractice||{}))if((a.learning?.[n]?.last||0)>=(r.time||0))delete a.pendingPractice[n];
 a.history=histories(a.history,b.history);a.aggregateStats=maxTree(a.aggregateStats,b.aggregateStats);
 a.examRotation=maxTree(a.examRotation,b.examRotation);
 if((b.examRotation?.round||0)>(local.data.examRotation?.round||0))a.examRotation.recent=clone(b.examRotation.recent||[]);
 let x=a.easterEggs||{},y=b.easterEggs||{};a.easterEggs={...y,...x,discovered:[...new Set([...(x.discovered||[]),...(y.discovered||[])])],titles:[...new Set([...(x.titles||[]),...(y.titles||[])])]};
 // Empty new devices receive source display preferences; populated devices keep theirs.
 if(!Object.keys(local.data.learning||{}).length&&!Object.keys(local.data.seen||{}).length&&!(local.data.history||[]).length)a.settings=clone(b.settings||a.settings||{});
 e.scopeSessions||={};for(const [n,s] of Object.entries(incoming.scopeSessions||{}))if(!e.scopeSessions[n]&&s)e.scopeSessions[n]=clone(s);
 e.deferredHistory=histories(e.deferredHistory,incoming.deferredHistory);
 e.bankRegistry={...incoming.bankRegistry,...e.bankRegistry};
 return e;
}
function summary(info){let e=info.payload,d=e.data||e;return {createdAt:info.createdAt,checked:info.checked,banks:e.includedBankIds||['hos_2026'],practiced:Object.keys(d.learning||{}).length,favorites:(d.favorites||[]).length,wrong:Object.values(d.wrong||{}).filter(w=>w.count>0).length,history:(d.history||[]).length,sessions:Object.values(e.scopeSessions||{}).filter(Boolean).length}}
window.BACKUP_CORE={encode,decode,validate,merge,summary,crc32,MAX_BYTES};
})();
