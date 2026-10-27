// Evidence-informed spaced retrieval. Intervals are an adaptive product heuristic,
// not a universal human forgetting curve or a guarantee of retention.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.STUDY_PLAN_CORE=api;})(typeof window!=='undefined'?window:globalThis,()=>{
  'use strict';
  const DAY=86400000,INTERVALS=[1,2,4,7,14,30],clone=x=>JSON.parse(JSON.stringify(x));
  const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const questionKey=q=>(q.bankId||'hos_2026')+':'+(q.sourceQuestionId||q.id);
  const validKey=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,47}:[1-9][0-9]{0,5}$/.test(x);
  function ordinal(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('请选择有效日期');const n=Date.parse(date+'T00:00:00+08:00');if(!Number.isFinite(n)||new Date(n+8*3600000).toISOString().slice(0,10)!==date)throw Error('日期无效');return Math.floor((n+8*3600000)/DAY);}
  const date=n=>new Date(n*DAY).toISOString().slice(0,10);
  const today=(now=Date.now())=>date(Math.floor((now+8*3600000)/DAY));
  const add=(d,n)=>date(ordinal(d)+n);
  function validate(p){
    if(!plain(p)||p.version!==1||!/^plan_[a-zA-Z0-9_-]{8,70}$/.test(p.id)||typeof p.title!=='string'||!p.title.trim()||p.title.length>80)throw Error('学习计划身份或名称无效');
    const days=ordinal(p.end)-ordinal(p.start)+1;if(days<1||days>366)throw Error('计划时间须为1至366天');
    if(!Array.isArray(p.keys)||!p.keys.length||p.keys.length>2000||new Set(p.keys).size!==p.keys.length||p.keys.some(k=>!validKey(k)))throw Error('计划题目身份无效');
    if(!Number.isFinite(p.createdAt)||p.createdAt<0||!plain(p.events)||Object.keys(p.events).length>30000)throw Error('计划记录无效');
    const keys=new Set(p.keys);
    for(const [id,e] of Object.entries(p.events)){if(!/^[a-zA-Z0-9_-]{8,120}$/.test(id)||!plain(e)||!keys.has(e.key)||!['remembered','assisted','again'].includes(e.rating)||!Number.isFinite(e.at)||e.at<0||today(e.at)!==e.day||ordinal(e.day)<ordinal(p.start))throw Error('计划回忆记录无效');}
    return p;
  }
  function create({id,title,keys,start,end,now=Date.now()}){const p={version:1,id,title:String(title||'我的学习计划').trim().slice(0,80),keys:[...new Set(keys)],start,end,createdAt:now,events:{}};validate(p);return p;}
  // Reserve the final 40% of days for consolidation, and always make a deadline review.
  function introduction(p,index){const span=ordinal(p.end)-ordinal(p.start)+1,slots=Math.max(1,Math.floor(span*.6));return add(p.start,Math.floor(index*slots/p.keys.length));}
  function initial(p,key){return {key,due:introduction(p,p.keys.indexOf(key)),stage:0,repetitions:0,lastDay:'',againToday:0,lastRating:'',introduced:false};}
  function advance(p,s,e){const next={...s,introduced:true,lastDay:e.day,lastRating:e.rating,repetitions:s.repetitions+1};
    next.againToday=e.day===s.lastDay?s.againToday:0;
    if(e.rating==='again'){next.stage=0;next.againToday++;next.due=next.againToday===1?e.day:add(e.day,1);}
    else if(e.rating==='assisted'){next.stage=Math.min(s.stage,1);next.due=add(e.day,1);}
    else {next.stage=Math.min(6,s.stage+(e.day!==s.lastDay&&e.day>=s.due||!s.introduced?1:0));next.due=add(e.day,INTERVALS[Math.max(0,next.stage-1)]);}
    if(e.day<p.end&&next.due>p.end)next.due=p.end;
    return next;
  }
  function states(p,day=today()){validate(p);ordinal(day);const out=Object.fromEntries(p.keys.map(k=>[k,initial(p,k)]));for(const e of Object.entries(p.events).filter(([,e])=>e.day<=day).sort((a,b)=>a[1].at-b[1].at||a[0].localeCompare(b[0]))){out[e[1].key]=advance(p,out[e[1].key],e[1]);}return out;}
  function tasks(p,day=today()){if(day<p.start)return [];const all=Object.values(states(p,day));return all.filter(s=>s.due<=day).sort((a,b)=>Number(b.introduced)-Number(a.introduced)||Number(b.lastRating==='again')-Number(a.lastRating==='again')||a.due.localeCompare(b.due)||p.keys.indexOf(a.key)-p.keys.indexOf(b.key));}
  function record(p,{id,key,rating,at=Date.now()}){validate(p);if(p.events[id])return clone(p);const day=today(at);if(day<p.start)throw Error('计划尚未开始');const out=clone(p);out.events[id]={key,rating,day,at};validate(out);return out;}
  function merge(a,b){validate(a);validate(b);if(a.id!==b.id||JSON.stringify([a.keys,a.start,a.end,a.title,a.createdAt])!==JSON.stringify([b.keys,b.start,b.end,b.title,b.createdAt]))return null;const out=clone(a),rank={remembered:0,assisted:1,again:2};for(const [id,e] of Object.entries(b.events)){const old=out.events[id];if(!old)out.events[id]=clone(e);else if(JSON.stringify(old)!==JSON.stringify(e)){if(old.key!==e.key)return null;out.events[id]=clone(rank[e.rating]>rank[old.rating]||rank[e.rating]===rank[old.rating]&&e.at>old.at?e:old);}}validate(out);return out;}
  function calendar(p,from=today()){validate(p);const start=from<p.start?p.start:from,all=states(p,start),rows=[];for(let d=ordinal(start);d<=ordinal(p.end);d++){const day=date(d),items=Object.values(all).filter(s=>s.due<=day).sort((a,b)=>Number(b.introduced)-Number(a.introduced)||a.due.localeCompare(b.due)||p.keys.indexOf(a.key)-p.keys.indexOf(b.key));rows.push({day,items:clone(items)});for(const s of items)all[s.key]=advance(p,s,{day,rating:'remembered'});}return rows;}
  function sanitize(raw){const out={};if(!plain(raw))return out;for(const [id,p] of Object.entries(raw)){try{validate(p);if(id===p.id)out[id]=clone(p);}catch(_){/* Caller keeps the raw workspace backup. */}}return out;}
  return {DAY,INTERVALS,questionKey,validKey,ordinal,date,today,add,validate,create,states,tasks,record,merge,calendar,sanitize};
});
