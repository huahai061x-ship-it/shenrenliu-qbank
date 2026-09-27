// Loaded in <head>, before the manifest and the question-bank scripts.
(() => {
  const state = {prompt:null, installed:false, busy:false, controlled:false, manifest:null, manifestOK:false, manifestError:'', waiting:null, updateAvailable:false, reloadRequested:false, registration:null, swError:''};
  const standalone = () => !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
  const notify = () => {state.controlled=!!navigator.serviceWorker?.controller;window.updateInstallUI?.();window.updatePwaNotice?.();};
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
    if(window.canReloadForPwaUpdate?.()===false){window.deferPwaUpdate?.();return false;}
    state.reloadRequested=true;
    if(state.waiting)state.waiting.postMessage('SKIP_WAITING');else location.reload();
    return true;
  }
  function monitorRegistration(registration) {
    state.registration=registration;
    if(registration.waiting){state.waiting=registration.waiting;state.updateAvailable=true;notify();}
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){state.waiting=registration.waiting||worker;state.updateAvailable=true;notify();}});
    });
  }
  async function registerWorker() {
    if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      notify();
      // Refresh only after a user's explicit update request, never during an exam.
      if(state.reloadRequested&&window.canReloadForPwaUpdate?.()!==false){state.reloadRequested=false;location.reload();}
    });
    try {
      const scriptURL=new URL('./sw.js',document.baseURI),scope=new URL('./',document.baseURI);
      const registration=await navigator.serviceWorker.register(scriptURL.href,{scope:scope.href,updateViaCache:'none'});
      monitorRegistration(registration);await registration.update();notify();
      navigator.serviceWorker.ready.then(notify).catch(()=>{});
    }catch(error){state.swError=error.message;notify();}
  }
  window.PWA_INSTALL={state,standalone,notify,inspectManifest,promptInstall,requestUpdate};
  const start=()=>{registerWorker();inspectManifest();notify();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
