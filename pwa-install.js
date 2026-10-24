// Loaded in <head>, before the manifest and the question-bank scripts.
(() => {
  // Version-specific entry pages keep the same origin, storage, and canonical app scope.
  try{const base=document.querySelector('base[data-release-root]');if(base?.getAttribute){base.href=new URL(base.getAttribute('href'),location.href).href;const url=new URL(base.href);url.search=location.search;url.hash=location.hash;window.history.replaceState(window.history.state,'',url.href);}}catch(_){}
  // Keep the compatibility entry marker out of the address bar without reloading or changing scope.
  try{const url=new URL(location.href);if(url.searchParams.get('entry')==='ShenRenLiu'){url.searchParams.delete('entry');window.history.replaceState(window.history.state,'',url.href);}}catch(_){}
  const state = {prompt:null, installed:false, busy:false, controlled:false, manifest:null, manifestOK:false, manifestError:'', waiting:null, updateAvailable:false, reloadRequested:false, registration:null, swError:'', checking:false, updateStatus:'idle', updateMessage:'自动检查已开启', checkedAt:0, currentVersion:document.querySelector('meta[name="build-version"]')?.content||'', latestVersion:'', downloadDone:0, downloadTotal:0};
  const appBase = new URL('./',document.baseURI);
  const watchedRegistrations=new WeakSet(),watchedWorkers=new WeakSet();
  let registrationPromise=null,checkPromise=null,lastAttempt=0;
  const assetRoot=document.querySelector('meta[name="asset-base"]')?.content||'';
  const assetURL=file=>/^assets\/[a-zA-Z0-9._-]+\/$/.test(assetRoot)&&!assetRoot.includes('__BUILD_VERSION__')?new URL(assetRoot+file,appBase).href:file;
  const releaseURL=()=>{const url=new URL('releases/'+encodeURIComponent(state.latestVersion)+'.html',appBase);url.search=location.search||'';url.searchParams.delete('entry');url.hash=location.hash||'';return url.href;};
  const standalone = () => !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
  const notify = () => {state.controlled=!!navigator.serviceWorker?.controller;const button=document.querySelector('#siteUpdateButton'),status=document.querySelector('#siteUpdateStatus');if(button){button.disabled=state.checking;button.textContent=state.updateAvailable?'↻ 发现新版本':state.checking?'↻ 正在检查…':'↻ 检查更新';button.setAttribute?.('aria-busy',String(state.checking));}if(status){status.textContent=state.updateMessage;status.title=state.updateMessage;if(status.dataset)status.dataset.state=state.updateStatus;}window.updateInstallUI?.();window.updatePwaNotice?.();};
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();state.prompt=event;state.installed=false;notify();
  });
  window.addEventListener('appinstalled', () => {state.prompt=null;state.installed=true;state.busy=false;notify();window.toastPwaInstalled?.();});
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',notify);

  async function inspectManifest() {
    if(location.protocol==='file:')return false;
    try {
      const link=document.querySelector('link[rel="manifest"]');
      if(!link)throw Error('未找到安装清单');
      const url=new URL(link.href,location.href),response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw Error(`安装清单 HTTP ${response.status}`);
      if(!/application\/(manifest\+json|json)/i.test(response.headers.get('content-type')||''))throw Error('安装清单 MIME 类型不正确');
      const manifest=await response.json(),start=new URL(manifest.start_url,url),scope=new URL(manifest.scope,url),id=new URL(manifest.id,start.origin+'/');
      if(!manifest.name||!manifest.short_name||manifest.display!=='standalone'||start.origin!==location.origin||scope.origin!==location.origin||!start.pathname.startsWith(scope.pathname)||!location.pathname.startsWith(scope.pathname)||id.pathname!==scope.pathname)throw Error('安装清单身份或范围不正确');
      for(const size of [192,512]){
        const icon=manifest.icons?.find(x=>x.sizes===`${size}x${size}`&&x.type==='image/png'&&(x.purpose||'any').split(/\s+/).includes('any'));
        if(!icon)throw Error(`缺少 ${size} PNG 安装图标`);
        const iconURL=new URL(icon.src,url);if(iconURL.origin!==scope.origin||!iconURL.pathname.startsWith(scope.pathname))throw Error('安装图标不在应用范围内');
        const r=await fetch(iconURL,{cache:'no-store'});if(!r.ok||!(r.headers.get('content-type')||'').includes('image/png'))throw Error(`${size} 图标不可用或 MIME 不正确`);
        const bytes=new Uint8Array(await r.arrayBuffer()),view=new DataView(bytes.buffer);
        if(bytes.length<24||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a||view.getUint32(16)!==size||view.getUint32(20)!==size)throw Error(`${size} 图标尺寸或 PNG 格式不正确`);
      }
      state.manifest={startURL:start.href,scope:scope.href,id:id.href,icons:manifest.icons};state.manifestOK=true;state.manifestError='';
    } catch(error) {state.manifestOK=false;state.manifestError=error.message;}
    notify();return state.manifestOK;
  }
  async function promptInstall() {
    if(standalone()||state.installed)return 'installed';
    if(state.busy)return 'busy';
    const event=state.prompt;if(!event)return 'unavailable';
    state.busy=true;notify();
    try {await event.prompt();const choice=await event.userChoice;return choice.outcome;}
    catch(error){state.swError=`安装弹窗未打开：${error.message}`;return 'unavailable';}
    finally {if(state.prompt===event)state.prompt=null;state.busy=false;notify();}
  }
  function requestUpdate() {
    state.updatePrepared=false;state.reloadRequested=false;
    if(window.prepareRequiredPwaUpdate){if(window.prepareRequiredPwaUpdate()===false)return false;state.updatePrepared=true;}else if(window.canReloadForPwaUpdate?.()===false){window.deferPwaUpdate?.();return false;}
    state.reloadRequested=true;
    if(state.webviewFallback&&state.latestVersion)location.replace(releaseURL());else if(state.waiting&&(!state.waiting.state||state.waiting.state==='installed'))state.waiting.postMessage('SKIP_WAITING');else if(state.reloadOnly&&!navigator.serviceWorker)location.replace(releaseURL());else location.reload();
    return true;
  }
  function report(status,message) {state.updateStatus=status;state.updateMessage=message;notify();return status;}
  function bounded(promise,ms,message) {
    let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));
  }
  function foundWaiting(registration,worker=registration.waiting) {
    if(!worker||(!registration.active&&!navigator.serviceWorker.controller)||worker===registration.active||['activating','activated','redundant'].includes(worker.state))return false;
    state.waiting=worker;state.updateAvailable=true;report('available','新版本已下载，点击更新后生效');return true;
  }
  function watchWorker(registration,worker) {
    if(!worker||watchedWorkers.has(worker))return;watchedWorkers.add(worker);
    const changed=()=>{
      if(worker.state==='installed'&&(registration.waiting||registration.active&&registration.active!==worker))foundWaiting(registration,registration.waiting||worker);
      else if(worker.state==='redundant'&&!state.updateAvailable)report('error','更新包未下载完整，请检查网络后重试');
    };
    worker.addEventListener('statechange',changed);changed();
  }
  function monitorRegistration(registration) {
    state.registration=registration;
    foundWaiting(registration);watchWorker(registration,registration.installing);
    if(watchedRegistrations.has(registration))return;watchedRegistrations.add(registration);
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;if(!worker)return;
      if(navigator.serviceWorker.controller)report('downloading','发现更新，正在下载完整更新包…');
      watchWorker(registration,worker);
    });
  }
  function registerWorker() {
    if(!navigator.serviceWorker||location.protocol==='file:')return Promise.resolve(null);
    if(registrationPromise)return registrationPromise;
    registrationPromise=navigator.serviceWorker.register(new URL('sw.js',appBase).href,{scope:appBase.href,updateViaCache:'none'}).then(registration=>{monitorRegistration(registration);notify();return registration;}).catch(error=>{registrationPromise=null;state.swError=error.message;throw error;});
    return registrationPromise;
  }
  async function workerVersion(worker) {
    if(!worker||typeof MessageChannel==='undefined')return '';
    const channel=new MessageChannel();
    try{return await bounded(new Promise(resolve=>{channel.port1.onmessage=e=>resolve(e.data?.version||'');worker.postMessage({type:'GET_VERSION'},[channel.port2]);}),2000,'版本确认超时');}catch(_){return '';}finally{channel.port1.close();channel.port2.close();}
  }
  async function finishInstallation(registration) {
    const worker=registration.installing;if(!worker)return;
    watchWorker(registration,worker);report('downloading','发现更新，正在下载完整更新包…');
    let changed;
    try{await bounded(new Promise((resolve,reject)=>{changed=()=>{if(worker.state==='installed'||worker.state==='activated')resolve();else if(worker.state==='redundant')reject(Error('更新包未下载完整，请稍后重试'));};worker.addEventListener('statechange',changed);changed();}),45000,'更新包仍在下载，可稍后再次检查');}finally{worker.removeEventListener?.('statechange',changed);}
  }
  function checkUpdate({manual=false,force=false}={}) {
    if(checkPromise)return checkPromise;
    if(!manual&&!force&&(document.hidden||Date.now()-lastAttempt<30000))return Promise.resolve(state.updateStatus);
    lastAttempt=Date.now();state.checking=true;state.swError='';report('checking','正在联网核对最新版本…');
    checkPromise=(async()=>{
      if(location.protocol==='file:')return report('unsupported','请打开在线网址后检查更新');
      if(navigator.onLine===false)return report('offline','当前离线，无法确认最新版本；联网后可重试');
      try{
        const versionURL=new URL('release.json',appBase);versionURL.searchParams.set('_check',Date.now().toString(36));
        const abort=typeof AbortController!=='undefined'?new AbortController():null;
        let response;
        try{for(let attempt=0;attempt<2;attempt++){try{versionURL.searchParams.set('_check',Date.now().toString(36)+'-'+attempt);response=await bounded(fetch(versionURL.href,{cache:'no-store',...(abort?{signal:abort.signal}:{}),headers:{'Cache-Control':'no-cache'}}).then(async r=>{if(!r.ok)throw Error('版本服务暂不可用');return r.json();}),12000,'联网检查超时，请检查网络后重试');break;}catch(error){if(attempt===1||navigator.onLine===false)throw error;report('checking','首次联网未成功，正在重新核对版本…');}}}finally{abort?.abort();}
        if(response?.schemaVersion!==1||typeof response.version!=='string'||!response.version||response.version.length>100)throw Error('版本信息不完整，请稍后重试');
        state.latestVersion=response.version;
        let registration;try{registration=await bounded(registerWorker(),navigator.serviceWorker?.controller?15000:5000,'更新服务连接超时，请重试');}catch(error){state.webviewFallback=true;state.swError=error.message;registration=null;}
        if(!registration){
          state.webviewFallback=true;
          if(state.currentVersion&&state.currentVersion!==state.latestVersion){state.reloadOnly=true;state.updateAvailable=true;return report('available','发现新版本，点击更新后生效');}
          if(!state.currentVersion)throw Error('当前浏览器无法核对本机版本，请使用系统浏览器打开');
        }else{
          if(foundWaiting(registration))return 'available';
          try{await bounded(registration.update(),15000,'更新包检查超时，请重试');}catch(error){state.webviewFallback=true;state.swError=error.message;if(state.currentVersion!==state.latestVersion){state.reloadOnly=true;state.updateAvailable=true;return report('available','发现新版本，可使用网页方式更新');}state.checkedAt=Date.now();return report('latest','已联网确认：当前为最新版本');}
          monitorRegistration(registration);
          if(foundWaiting(registration))return 'available';
          await finishInstallation(registration);
          if(foundWaiting(registration))return 'available';
          if(state.currentVersion!==state.latestVersion){
            if(await workerVersion(registration.active)===state.latestVersion){state.reloadOnly=true;state.updateAvailable=true;return report('available','新版本已就绪，点击更新后生效');}
            throw Error('服务器已有新版本，更新包尚未就绪，请稍后重试');
          }
        }
        state.checkedAt=Date.now();state.updateAvailable=false;state.waiting=null;return report('latest','已联网确认：当前为最新版本');
      }catch(error){if(state.updateAvailable)return report('available','新版本已下载，点击更新后生效');state.swError=error.message;return report(navigator.onLine===false?'offline':'error',error.message||'检查未完成，请稍后重试');}
    })().finally(()=>{state.checking=false;checkPromise=null;notify();});
    return checkPromise;
  }
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      notify();
      // Required updates reload only after explicit activation and successful progress saving.
      if(state.reloadRequested&&(state.updatePrepared||window.canReloadForPwaUpdate?.()!==false)){state.reloadRequested=false;location.reload();}
    });
    navigator.serviceWorker.addEventListener('message',event=>{
      const data=event.data;if(data?.type==='SERVER_VERSION_CHANGED'&&data.version!==state.currentVersion){checkUpdate({force:true});return;}if(data?.type!=='UPDATE_PROGRESS'||data.version===state.currentVersion)return;
      state.downloadDone=data.done;state.downloadTotal=data.total;
      if(!state.updateAvailable)report('downloading',`正在下载更新包 ${data.done}/${data.total}，可继续学习`);
    });
  }
  function openLatest(){if(navigator.onLine===false){report('offline','当前离线，请联网后获取新版');return false;}if(window.prepareRequiredPwaUpdate?.()===false)return false;const url=location.hostname==='huahai061x-ship-it.github.io'?new URL('https://huahai061x-ship-it.github.io/ShenRenLiu/latest.html'):new URL('latest.html',appBase);url.search=location.search;url.searchParams.delete('entry');url.hash=location.hash;location.assign(url.href);return true;}
  window.PWA_INSTALL={state,standalone,notify,inspectManifest,promptInstall,requestUpdate,checkUpdate,assetURL,openLatest};
  const autoCheck=()=>checkUpdate();
  window.addEventListener('pageshow',event=>checkUpdate({force:!!event.persisted}));
  window.addEventListener('focus',autoCheck);
  window.addEventListener('online',()=>checkUpdate({force:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoCheck();});
  document.addEventListener('resume',autoCheck);
  const start=()=>{registerWorker().catch(error=>{state.swError=error.message;notify();});checkUpdate({force:true});inspectManifest();notify();setInterval(()=>{if(!document.hidden)autoCheck();},120000);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
