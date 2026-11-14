(()=>{
 'use strict';
 let lastFailure=null;
 const KEY='shenrenliu_device_mode_v1';let choice='',mounted=false,failed=false,reported=false,hadData=false;
 try{hadData=!!(localStorage.getItem('shenrenliu_qbank_workspace_v1')||localStorage.getItem('shenrenliu_qbank_v1'));}catch(_){}
 try{choice=localStorage.getItem(KEY)||'';}catch(_){}
 function probe(){const key=KEY+'_probe_'+Math.random();try{localStorage.setItem(key,'ok');if(localStorage.getItem(key)!=='ok')throw Error('not persisted');localStorage.removeItem(key);return true;}catch(_){try{localStorage.removeItem(key);}catch(_){}return false;}}
 function box(id){let d=document.getElementById(id);if(!d){d=document.createElement('dialog');d.id=id;d.className='device-mode-dialog';document.body.append(d);}return d;}
 function decorate(button,email){if(email)return;if(choice==='guest'){button.querySelector('.cloud-account-identity').textContent='访客 · 本设备学习';button.querySelector('.cloud-account-state').textContent=failed?'保存异常':'本机模式';button.setAttribute('aria-label','访客，本设备学习，管理保存方式');}}
 function refresh(){const b=document.querySelector('#cloudAccountButton');if(b&&b.dataset.syncState==='signed-out')decorate(b,false);}
 function open(){
  const d=box('deviceModeDialog');d.setAttribute('aria-labelledby','deviceModeTitle');
  d.innerHTML=`<div class="device-mode-top"><span class="device-brand">刘</span><button class="btn" data-close aria-label="暂不选择">稍后选择</button></div><p class="device-eyebrow">神人刘题库训练站</p><h2 id="deviceModeTitle">选一种适合你的学习方式</h2><p class="device-intro">一个人、一台设备，也可以好好记录每一步进步。</p><div class="device-options"><button class="device-option" data-guest><span class="device-icon" aria-hidden="true">▣</span><span class="device-option-title">访客登录 <small>直接开始</small></span><span class="device-description">不用邮箱和验证码<br>进度、错题、收藏保存在当前浏览器</span><span class="device-cta">在本设备学习 <span>→</span></span></button><button class="device-option" data-email><span class="device-icon" aria-hidden="true">✉</span><span class="device-option-title">邮箱登录 <small>多设备同步</small></span><span class="device-description">使用邮箱验证码登录<br>手机、平板和电脑接着学</span><span class="device-cta">使用邮箱登录 <span>→</span></span></button></div><p class="device-local-note">访客记录不会上传。换浏览器、清理网站数据可能丢失记录，请定期在设置中备份。以后也可以从顶部账号入口接入邮箱。</p><p class="device-mode-message" role="status"></p>`;
  d.querySelector('[data-close]').onclick=()=>d.close();d.querySelector('[data-guest]').onclick=()=>{if(!probe()){d.querySelector('[role=status]').textContent='此浏览器目前无法保存。请允许网站存储、释放空间，或用系统浏览器打开后重试。';return;}try{localStorage.setItem(KEY,'guest');choice='guest';failed=false;refresh();d.close();navigator.storage?.persist?.().catch(()=>{});}catch(_){d.querySelector('[role=status]').textContent='选择未能保存，请检查浏览器存储设置后重试。';}};
  d.querySelector('[data-email]').onclick=()=>{try{localStorage.setItem(KEY,'email');choice='email';}catch(_){}d.close();window.CLOUD_SYNC?.open();};if(!d.open)d.showModal();
 }
 function mount(){if(mounted)return;mounted=true;let existing=false,bound=false;try{existing=hadData;const config=window.QBANK_CLOUD_CONFIG||{};bound=!!localStorage.getItem('shenrenliu_cloud_v1_'+encodeURIComponent(config.envId||'disabled')+'_owner');}catch(_){}if(!choice&&existing&&!bound){choice='guest';try{localStorage.setItem(KEY,choice);}catch(_){}}if(!choice&&!bound)setTimeout(function prompt(){if(choice)return;if(document.querySelector('dialog[open]')||!document.querySelector('.home-content'))return setTimeout(prompt,1000);open();},600);}
 function failureMessage(error){
  const name=error?.name||'Error';
  if(name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED')return '浏览器可用存储空间不足，本次保存未完成。请先导出备份。';
  if(name==='SecurityError'||name==='NotAllowedError')return '浏览器拒绝了本机存储访问，本次保存未完成。请先导出备份。';
  return '保存过程中发生了程序或兼容性错误。请先导出备份，并保留下面的诊断信息。';
 }
 function diagnostic(){return JSON.stringify({version:document.querySelector('meta[name="build-version"]')?.content||'local',stage:lastFailure?.stage,error:lastFailure?.name,code:lastFailure?.code,location:lastFailure?.location,browser:navigator.userAgent,touchPoints:navigator.maxTouchPoints||0,pointer:window.matchMedia?.('(pointer:coarse)').matches?'touch':'mouse',viewport:innerWidth+'×'+innerHeight,features:window.QBANK_COMPAT?.features||{}},null,2);}
 function storageError(error,stage='保存学习记录'){
  const frame=String(error?.stack||'').match(/([a-zA-Z0-9_-]+\.js):(\d+):(\d+)/);
  lastFailure={stage,name:error?.name||'Error',code:Number(error?.code)||0,location:frame?frame[0]:''};failed=true;refresh();
  const current=document.querySelector('#deviceStorageDialog[open]');if(current){current.querySelector('[data-reason]').textContent=failureMessage(error);current.querySelector('[data-diagnostic]').value=diagnostic();return;}
  if(reported)return;reported=true;
  setTimeout(()=>{if(!failed){reported=false;return}const d=box('deviceStorageDialog');d.setAttribute('aria-labelledby','deviceStorageTitle');
   d.innerHTML='<h2 id="deviceStorageTitle">这次进度还没有保存成功</h2><p>当前页面仍保留着你的作答，请先备份，再关闭或刷新。</p><p class="device-local-note" data-reason></p><div class="device-recovery"><button class="btn primary" data-export>导出当前学习备份</button><button class="btn" data-retry>重新检查保存</button><button class="btn" data-close>留在当前页面</button></div><p role="status"></p><details class="field"><summary>保存诊断（不含邮箱、题目和作答记录）</summary><textarea data-diagnostic readonly rows="7" aria-label="保存诊断"></textarea><button class="btn" data-diagnostic-download>下载诊断信息</button></details>';
   d.querySelector('[data-reason]').textContent=failureMessage(error);d.querySelector('[data-diagnostic]').value=diagnostic();
   d.querySelector('[data-export]').onclick=()=>{try{window.exportUnsavedData();d.querySelector('[role=status]').textContent='已发起备份下载，请确认文件已保存。';}catch(e){d.querySelector('[role=status]').textContent='导出未完成，请保留当前页面并下载诊断信息。';storageError(e,'导出当前备份');}};
   d.querySelector('[data-retry]').onclick=()=>{let ok=false;try{ok=window.retryLocalSave?.()===true;}catch(e){storageError(e,'重新检查保存')}d.querySelector('[role=status]').textContent=ok?'保存已恢复，可以继续学习。':'仍未保存成功，请先导出备份，并保留诊断信息。';};
   d.querySelector('[data-diagnostic-download]').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([diagnostic()],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='神人刘_保存诊断.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
   d.querySelector('[data-close]').onclick=()=>d.close();if(!d.open)d.showModal();
  },0);
 }
 function saved(scope='store'){if(lastFailure?.stage.includes('恢复点')&&scope!=='progress')return;failed=false;reported=false;lastFailure=null;refresh();}
 function emailConnected(){choice='email';try{localStorage.setItem(KEY,choice);}catch(_){}}
 window.LOCAL_MODE={open,mount,decorate,storageError,failureMessage,saved,probe,emailConnected,isGuest:()=>choice==='guest'};
})();
