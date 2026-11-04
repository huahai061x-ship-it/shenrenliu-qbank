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
    if(p.dailyNew!==undefined&&(!Number.isInteger(p.dailyNew)||p.dailyNew<1||p.dailyNew>2000))throw Error('每日新题量无效');
    if(!Array.isArray(p.keys)||!p.keys.length||p.keys.length>2000||new Set(p.keys).size!==p.keys.length||p.keys.some(k=>!validKey(k)))throw Error('计划题目身份无效');
    if(!Number.isFinite(p.createdAt)||p.createdAt<0||!plain(p.events)||Object.keys(p.events).length>30000)throw Error('计划记录无效');
    const keys=new Set(p.keys);
    for(const [id,e] of Object.entries(p.events)){if(!/^[a-zA-Z0-9_-]{8,120}$/.test(id)||!plain(e)||!keys.has(e.key)||!['remembered','assisted','again'].includes(e.rating)||!Number.isFinite(e.at)||e.at<0||today(e.at)!==e.day||ordinal(e.day)<ordinal(p.start))throw Error('计划回忆记录无效');}
    return p;
  }
  function create({id,title,keys,start,end,dailyNew,now=Date.now()}){const p={version:1,id,title:String(title||'我的学习计划').trim().slice(0,80),keys:[...new Set(keys)],start,end,createdAt:now,events:{}};if(dailyNew!==undefined)p.dailyNew=dailyNew;validate(p);return p;}
  // New plans reserve up to three target days for consolidation at the suggested pace.
  // The stored cap is immutable; old plans use their previous distribution.
  function suggestedNew(n,start,end){
    const span=ordinal(end)-ordinal(start)+1;
    return Math.max(1,Math.ceil(n/Math.max(1,span-Math.min(3,Math.floor(span/4)))));
  }
  // Spread banks and question types through the schedule instead of serving an entire
  // block of single-choice questions before the first judgment question.
  function orderedKeys(questions){
    const groups=new Map();
    for(const q of questions){
      const group=(q.bankId||'hos_2026')+'|'+q.type;
      if(!groups.has(group))groups.set(group,[]);
      groups.get(group).push(questionKey(q));
    }
    return [...groups.values()].flatMap(keys=>keys.map((key,i)=>({key,position:(i+.5)/keys.length})))
      .sort((a,b)=>a.position-b.position).map(x=>x.key);
  }
  function initial(p,key,i,first,slots){
    const offset=p.dailyNew?Math.floor(i/p.dailyNew):Math.floor(i*slots/p.keys.length);
    return {key,order:i,due:date(first+offset),stage:0,repetitions:0,lastDay:'',firstDay:'',againToday:0,lastRating:'',introduced:false,retryAt:0};
  }
  function advance(p,s,e){
    const next={...s,introduced:true,firstDay:s.firstDay||e.day,lastDay:e.day,lastRating:e.rating,repetitions:s.repetitions+1,retryAt:0};
    next.againToday=e.day===s.lastDay?s.againToday:0;
    if(e.rating==='again'){
      next.stage=0;next.againToday++;next.due=next.againToday===1?e.day:add(e.day,1);
      if(p.dailyNew&&next.againToday===1){next.retryAt=e.at+10*60000;next.due=today(next.retryAt);}
    }else if(e.rating==='assisted'){
      next.stage=Math.min(s.stage,1);next.due=add(e.day,1);
    }else if(p.dailyNew&&s.retryAt&&e.at<s.retryAt){
      next.due=s.due;next.retryAt=s.retryAt;next.lastRating=s.lastRating;
    }else if(!s.introduced||e.day>=s.due){
      next.stage=Math.min(6,s.stage+(!s.introduced||e.day!==s.lastDay?1:0));
      next.due=add(e.day,INTERVALS[Math.max(0,next.stage-1)]);
    }
    if(!p.dailyNew&&e.day<p.end&&next.due>p.end)next.due=p.end;
    return next;
  }
  function states(p,day=today()){
    validate(p);const start=ordinal(p.start),slots=Math.max(1,Math.floor((ordinal(p.end)-start+1)*.6));
    ordinal(day);
    const out=Object.fromEntries(p.keys.map((k,i)=>[k,initial(p,k,i,start,slots)]));
    for(const [,e] of Object.entries(p.events).filter(([,e])=>e.day<=day).sort((a,b)=>a[1].at-b[1].at||a[0].localeCompare(b[0]))){
      out[e.key]=advance(p,out[e.key],e);
    }
    return out;
  }
  function dueItems(p,all,day,at){
    let left=p.dailyNew===undefined?Infinity:Math.max(0,p.dailyNew-all.filter(s=>s.firstDay===day).length);
    const eligible=all.filter(s=>s.due<=day&&(!s.retryAt||s.retryAt<=at));
    eligible.sort((a,b)=>Number(b.introduced)-Number(a.introduced)||Number(b.lastRating==='again')-Number(a.lastRating==='again')||a.due.localeCompare(b.due)||a.order-b.order);
    return eligible.filter(s=>{if(s.introduced)return true;if(left<=0)return false;left--;return true;});
  }
  function tasks(p,day=today(),at=Date.now()){
    if(day<p.start)return [];
    return dueItems(p,Object.values(states(p,day)),day,at);
  }
  function record(p,{id,key,rating,at=Date.now()}){validate(p);if(p.events[id])return clone(p);const day=today(at);if(day<p.start)throw Error('计划尚未开始');const out=clone(p);out.events[id]={key,rating,day,at};validate(out);return out;}
  function merge(a,b){validate(a);validate(b);if(a.id!==b.id||JSON.stringify([a.keys,a.start,a.end,a.title,a.createdAt,a.dailyNew])!==JSON.stringify([b.keys,b.start,b.end,b.title,b.createdAt,b.dailyNew]))return null;const out=clone(a),rank={remembered:0,assisted:1,again:2};for(const [id,e] of Object.entries(b.events)){const old=out.events[id];if(!old)out.events[id]=clone(e);else if(JSON.stringify(old)!==JSON.stringify(e)){if(old.key!==e.key)return null;out.events[id]=clone(rank[e.rating]>rank[old.rating]||rank[e.rating]===rank[old.rating]&&e.at>old.at?e:old);}}validate(out);return out;}
  function calendar(p,from=today()){
    const start=from<p.start?p.start:from,all=states(p,start),rows=[];
    const end=ordinal(p.end);
    for(let d=ordinal(start);d<=end;d++){
      const day=date(d),at=(d+1)*DAY-8*3600000-1,items=dueItems(p,Object.values(all),day,at);
      rows.push({day,items}); // advance creates new states; earlier rows remain immutable.
      for(const s of items)all[s.key]=advance(p,s,{day,rating:'remembered',at});
    }
    return rows;
  }
  function sanitize(raw){const out={};if(!plain(raw))return out;for(const [id,p] of Object.entries(raw)){try{validate(p);if(id===p.id)out[id]=clone(p);}catch(_){/* Caller keeps the raw workspace backup. */}}return out;}
  return {DAY,INTERVALS,questionKey,validKey,ordinal,date,today,add,suggestedNew,orderedKeys,validate,create,states,tasks,record,merge,calendar,sanitize};
});
