// Calendar time is always UTC+8. Exam durations continue to use performance.now().
(() => {
  'use strict';
  const state={offsetMs:0,synced:false,lastAttempt:0,lastSyncedAt:0};
  const now=()=>Date.now()+state.offsetMs;
  const pad=n=>String(n).padStart(2,'0');
  function parts(value=now()){const d=new Date(value+8*3600000);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),weekday:d.getUTCDay(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),second:d.getUTCSeconds()};}
  function dateKey(value=now()){const p=parts(value);return `${p.year}-${pad(p.month)}-${pad(p.day)}`;}
  function format(value=now()){const p=parts(value);return `${dateKey(value)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;}
  function render(){if(document.hidden)return;for(const element of document.querySelectorAll?.('[data-beijing-clock]')||[]){element.textContent='北京时间 '+format();element.title=state.synced?'已通过本站响应时间校准；网络时延可能带来秒级误差':'按设备时钟换算为北京时间，联网后尝试校准';element.dataset.source=state.synced?'server':'device';}}
  let pending=null;
  async function sync(){if(pending)return pending;if(navigator.onLine===false||location.protocol==='file:'||Date.now()-state.lastAttempt<30*60000&&state.lastAttempt)return false;state.lastAttempt=Date.now();pending=(async()=>{const abort=typeof AbortController!=='undefined'?new AbortController():null;const timer=abort?setTimeout(()=>abort.abort(),5000):null;try{const url=new URL('release.json',document.baseURI);url.searchParams.set('_clock',Date.now().toString(36));const sent=Date.now(),response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'},...(abort?{signal:abort.signal}:{})}),received=Date.now(),stamp=Date.parse(response.headers.get('Date')||''),age=Number(response.headers.get('Age')||0);if(!response.ok||!Number.isFinite(stamp)||stamp<Date.UTC(2020,0,1)||received-sent>5000||!Number.isFinite(age)||age<0||age>5)return false;state.offsetMs=stamp+age*1000+(received-sent)/2-received;state.synced=true;state.lastSyncedAt=received;return true;}catch(_){return false;}finally{if(timer)clearTimeout(timer);pending=null;render();}})();return pending;}
  window.BEIJING_CLOCK={state,now,parts,dateKey,format,sync,render};
  window.addEventListener?.('online',()=>{render();sync();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();sync();}});
  const start=()=>{render();sync();setInterval(render,1000);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
