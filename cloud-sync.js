(() => {
  'use strict';
  const C=window.CLOUD_SYNC_CORE,CONFIG=window.QBANK_CLOUD_CONFIG||{},PREFIX='shenrenliu_cloud_v1_'+encodeURIComponent(CONFIG.envId||'disabled')+'_',BINDING=PREFIX+'owner';
  let app,transport,user=null,state=null,observed={},home=true,applying=false,busy=false,captureTimer=null,syncTimer=null,otpEmail='',codeSentAt=0,lastError='',lastSync=0,preview=null,epoch=0,previewLocal=null,activeSync=null;
  const uid=()=>crypto.randomUUID().replaceAll('-',''),cacheKey=()=>PREFIX+encodeURIComponent(user.uid),status=()=>!CONFIG.enabled?'云同步尚未启用':!user?(lastError||'未登录'):busy?'正在同步学习数据':lastError||(Object.keys(state?.conflicts||{}).length?'有差异待处理':Object.keys(state?.pending||{}).length?'有待同步变更':lastSync?'已同步全部学习数据':'尚未同步');
  function persist(){localStorage.setItem(cacheKey(),JSON.stringify(C.compactState(state)));}
  function current(){return C.values(app.getStore(),app.questions());}
  function updateStatus(){
    const button=document.querySelector('#cloudAccountButton');
    if(button){
      button.hidden=!CONFIG.enabled;
      const mode=!user?'signed-out':busy?'syncing':lastError?'error':Object.keys(state?.conflicts||{}).length?'attention':!state?.approved?'confirm':Object.keys(state?.pending||{}).length?'pending':lastSync?'synced':'pending';
      const label={'signed-out':'邮箱登录',syncing:'同步中',error:'连接异常',attention:'待处理',confirm:'待确认',pending:'待同步',synced:'已同步'}[mode],email=user?.email||'我的学习账号';
      button.setAttribute('data-sync-state',mode);
      button.innerHTML=`<span class="cloud-account-avatar" aria-hidden="true">${user?'@':'☁'}</span><span class="cloud-account-identity">${esc(user?email:'登录学习账号')}</span><span class="cloud-account-state"><i aria-hidden="true"></i>${label}</span><span class="cloud-account-chevron" aria-hidden="true">›</span>`;
      button.title=(user?email+' · ':'')+status();
      button.setAttribute('aria-label',(user?email+'，':'')+label+'，打开学习账户与同步');
      button.setAttribute('aria-haspopup','dialog');
    }
    const hint=document.querySelector('#studyStorageHint');if(hint)hint.textContent=user&&state?.approved?'学习记录已关联账号，联网后同步；完整备份仍可使用':'当前使用本机记录，换设备可用完整备份';const node=document.querySelector('#cloudSyncStatus');if(node)node.textContent=status();
  }
  function capture(){if(!user||!state||!state.approved||applying)return;const now=current();const pending=C.capture(observed,now,state.pending,state.records,uid),dirty=Object.keys(pending).some(id=>pending[id].id!==state.pending[id]?.id);state.pending=pending;for(const id of Object.keys(state.conflicts))if(pending[id])state.conflicts[id].local=C.clone(pending[id]);observed=now;state.baseline=now;if(dirty)persist();updateStatus();}
  function changed(){if(!user||applying||!state?.approved)return;if(captureTimer)clearTimeout(captureTimer);captureTimer=setTimeout(()=>{captureTimer=null;try{capture();if(Object.keys(state.pending).some(id=>!state.conflicts[id]))schedule();}catch(_){lastError='同步变更未能保存，请先导出备份';updateStatus();}},250);}
  function schedule(){if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>{syncTimer=null;sync();},1200);}
  async function connect(){transport ||= await window.createQbankCloudbase(CONFIG);return transport;}
  async function getRemote(valid=()=>true){
    const rows=[],ids=new Set();let cursor=null;
    for(let page=0;page<1000;page++){
      const result=await transport.request({action:'pull',...(cursor?{cursor}:{})});
      if(!valid())throw Error('登录状态已变化，本次同步已停止');
      if(!Array.isArray(result.records)||result.records.length>100)throw Error('云端分页无效');
      for(const row of result.records){C.validateRecord(row);const id=C.recordId(row.key,row.field);if(ids.has(id))throw Error('云端分页包含重复记录');ids.add(id);rows.push(row);}
      if(!result.nextCursor)return rows;
      if(result.nextCursor===cursor)throw Error('云端分页重复');cursor=result.nextCursor;
    }
    throw Error('云端记录过多，请联系维护者');
  }
  async function safeApply(rows){if(!rows.length)return;const ticket=epoch;if(!home)throw Error('练习中暂缓接收，回首页后继续同步');applying=true;try{if(await app.apply(C.project(app.getStore(),app.questions(),rows))===false)throw Error('本机保存失败，已停止接收云端记录');if(ticket!==epoch||!state)return;observed=current();state.baseline=observed;}finally{if(ticket===epoch)applying=false;}}
  async function authenticate(next){
    if(!next?.uid)throw Error('邮箱登录未完成');
    const owner=localStorage.getItem(BINDING);
    if(owner&&owner!==next.uid){await transport.signOut();throw Error('此浏览器已有另一账号的学习记录。请使用独立浏览器资料登录另一账号，避免记录混在一起。');}
    const ticket=++epoch;busy=false;applying=false;user=next;lastError='';lastSync=0;
    try{
      const raw=localStorage.getItem(cacheKey());state=raw?C.restoreState(JSON.parse(raw),current()):{version:1,scopeVersion:2,approved:false,records:{},pending:{},conflicts:{}};if(state.scopeVersion!==2){if(state.approved)state.pending=C.capture(state.baseline||current(),current(),state.pending,state.records,uid);state.approved=false;}
      if(state.version!==1||!state.records||!state.pending||!state.conflicts)throw Error('同步缓存无效');
      Object.values(state.pending).forEach(C.validateOp);
    }catch(_){epoch++;user=null;state=null;throw Error('同步缓存无效，请先保留完整备份；本机学习记录未改变');}
    observed=state.approved&&state.baseline?state.baseline:current();
    if(!state.approved){try{const remote=await getRemote(()=>ticket===epoch&&user?.uid===next.uid);previewLocal=current();preview=C.bootstrap(previewLocal,remote,state.pending);render();}catch(error){if(ticket===epoch){lastError=error.message;render();}throw error;}}
    else{updateStatus();await sync();}
  }
  async function sync(){
    const ticket=epoch;
    if(activeSync?.epoch===ticket){await activeSync.promise;if(ticket!==epoch)return;if(user&&state?.approved){capture();if(Object.keys(state.pending).some(id=>!state.conflicts[id]))return sync();}return;}
    const promise=performSync();activeSync={epoch:ticket,promise};try{return await promise;}finally{if(activeSync?.promise===promise)activeSync=null;}
  }
  async function performSync(){
    if(!user||!state?.approved||busy||navigator.onLine===false)return;
    const ticket=epoch,owner=user.uid,valid=()=>ticket===epoch&&user?.uid===owner;
    busy=true;lastError='';
    try{
      capture();const operations=C.batch(Object.values(state.pending).filter(op=>!state.conflicts[C.recordId(op.key,op.field)]));
      if(operations.length){
        const response=await transport.request({action:'push',operations});if(!valid())return;
        // A local edit may happen before the 250ms capture timer fires.
        capture();const next=C.acknowledge(state.pending,state.records,state.conflicts,response.results);state={...state,...next};persist();
      }
      if(home){
        const rows=await getRemote(valid);if(!valid())return;capture();
        const download=[],nextRecords={...state.records};
        for(const row of rows){const id=C.recordId(row.key,row.field),known=state.records[id];if(known&&row.rev<known.rev)continue;
          if(state.pending[id]){if(row.rev>state.pending[id].baseRev&&!C.same(state.pending[id].value,row.value))state.conflicts[id]={local:C.clone(state.pending[id]),remote:C.clone(row)};}
          else download.push(row);nextRecords[id]=C.clone(row);
        }
        await safeApply(download);if(!valid())return;state.records=nextRecords;persist();
      }
      lastSync=Date.now();if(Object.keys(state.pending).some(id=>!state.conflicts[id]))schedule();
    }catch(error){if(valid())lastError=error.message||'同步失败，变更仍保留在本机';}
    finally{if(valid()){busy=false;updateStatus();if(document.querySelector('#cloudAccountDialog[open]'))render();}}
  }
  async function approve(){if(!preview||!home)return;const previousState=state;try{if(!C.same(previewLocal,current())){previewLocal=current();preview=C.bootstrap(previewLocal,await getRemote(),state.pending);render();message('本机记录已变化，已重新生成合并预览，请再次确认。');return;}const decisions={};for(const issue of preview.conflicts){const value=document.querySelector(`[data-cloud-choice="${issue.id}"]`)?.value;if(!['local','remote'].includes(value))throw Error('请为每条差异选择保留本机还是云端');decisions[issue.id]=value;}const apply=[...preview.download],pending={};for(const seed of preview.upload)pending[C.recordId(seed.key,seed.field)]={...seed,id:uid()};for(const issue of preview.conflicts){if(decisions[issue.id]==='remote')apply.push(issue.remote);else pending[issue.id]={...issue.local,baseRev:issue.remote.rev,id:uid()};}state={version:1,scopeVersion:2,approved:true,records:preview.records,pending,conflicts:{}};await safeApply(apply);state.baseline=current();persist();localStorage.setItem(BINDING,user.uid);preview=null;observed=current();render();await sync();}catch(error){state=previousState;try{persist();}catch(_){}message(error.message);}}
  async function logout(){
    capture();epoch++;busy=false;if(syncTimer)clearTimeout(syncTimer);syncTimer=null;
    await transport.signOut();user=null;state=null;preview=null;previewLocal=null;lastSync=0;lastError='';
    render();message('已退出登录。本机学习记录保留，同一账号再次登录后可继续同步。');updateStatus();
  }
  async function keepBoth(id){
    const issue=state?.conflicts[id];if(busy)throw Error('同步进行中，请稍后处理进度差异');if(!home||!issue||issue.local.field!=='activity'||!issue.local.value)throw Error('当前没有可保留的进度差异');
    const copy=C.forkActivity(issue.local.value,'copy-'+uid(),Math.max(Date.now(),...app.getStore().recentSessions.map(r=>r.time))+1),key=C.entityKey('activity',copy.id),row={key,field:'activity',value:copy,rev:1},ticket=epoch;
    await safeApply([issue.remote,row]);if(ticket!==epoch)return;
    delete state.pending[id];delete state.conflicts[id];state.records[id]=C.clone(issue.remote);state.pending[C.recordId(key,'activity')]={key,field:'activity',value:copy,baseRev:0,id:uid()};persist();render();await sync();
  }
  async function undoCloud(){
    if(!home||!user)throw Error('请先回首页');if(busy)throw Error('同步进行中，请稍后撤销');const saved=await window.CLOUD_SYNC_RECOVERY.load(cacheKey());if(!saved)throw Error('还没有可撤销的云端接收');
    if(!confirm('恢复到最近一次云端接收前，会撤回之后的本机修改，并作为新变更同步到同一账号。确定恢复吗？'))return;
    const previous=window.BANK_CORE?window.BANK_CORE.unpack(saved.store):saved.store,scopes=[...new Set([...(previous.recentSessions||[]),...(app.getStore().recentSessions||[])].map(r=>r.scopeKey))];
    if(await app.apply({...previous,__cloudActivityScopes:scopes})===false)throw Error('当前页面已变化，未撤销');capture();persist();render();await sync();
  }
  function label(item){const labels={favorite:'收藏',mastery:'掌握状态',wrong:'错题状态',learning:'学习与复习安排',seen:'看过记录',reviewFlags:'待复核标记',reviewNotes:'复核笔记',pendingPractice:'待练记录',difficultyProgress:'填空难度进度',rotation:'抽题覆盖',statistics:'全站累计统计',exam:'考试成绩与试卷',activity:'考试／背诵恢复点',preferences:'学习偏好',examRotation:'抽卷轮换',openStudy:'开放练习记录',easterEggs:'彩蛋与称号'};const q=app.questions().find(q=>C.key(q)===item.key);return q?(q.bankName||'题库')+' · '+(q.originalLabel||'原题'+(q.sourceQuestionId||q.id))+' · '+labels[item.field]:labels[item.field]||'学习记录';}
  function summary(item){
    const v=item.value;if(v===null)return '无记录';
    const time=n=>n?(window.BEIJING_CLOCK?.format(n)||new Date(n).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})):'未记录时间';
    if(item.field==='favorite')return v?'已收藏':'未收藏';if(item.field==='mastery')return {mastered:'已掌握',fuzzy:'不熟',new:'未掌握'}[v]||'未标记';
    if(item.field==='statistics')return `作答${v.totalAnswers||0}次，答对${v.totalCorrect||0}次，考试${v.totalExams||0}场，学习${Math.round((v.totalStudyMs||0)/60000)}分钟`;
    if(item.field==='exam')return `${v.mode||'考试'} · ${v.score}分 · ${v.count||v.ids?.length||0}题 · ${time(v.time)}`;
    if(item.field==='activity'){const snapshot=v.snapshot,item=v.kind==='exam'?null:snapshot.session?.items?.[snapshot.current||0],answer=v.kind==='exam'?snapshot.answers?.[snapshot.current||0]:item?.answer;return `${snapshot.title||snapshot.session?.title||'学习进度'} · 第${(snapshot.current||0)+1}题 · 当前作答：${Array.isArray(answer)?answer.join('、'):answer||'未答'} · ${time(v.time)}`;}
    if(item.field==='learning')return `作答${v.attempts||0}次，答对${v.correct||0}次 · 最近${time(v.last)}`;
    if(item.field==='wrong')return `${v.corrected?'已纠正':'待巩固'}，累计错${v.wrongTotal||v.count||0}次`;
    if(item.field==='reviewNotes')return [v.reason,v.note].filter(Boolean).join('：').slice(0,160)||'空笔记';
    if(item.field==='preferences')return `${v.theme==='dark'?'深色':'浅色'}主题 · 选项${v.shuffleOptions===false?'不乱序':'乱序'} · 背诵${v.reciteAnswers==='always'?'始终显示':'手动显示'}答案`;
    if(item.field==='difficultyProgress')return `难度${v.level||0}级 · 连对${v.streak||0}次 · ${v.review?'需复习':'正常'}`;
    if(item.field==='easterEggs')return `已发现${v.discovered?.length||0}项 · ${v.currentTitle||'暂无称号'}`;
    if(item.field==='examRotation')return `已轮换${v.round||0}轮`;if(item.field==='rotation')return `抽到${v.usage||0}次 · 最近第${v.lastSeenRound||0}轮`;
    if(item.field==='pendingPractice')return `${v.status==='seen-unanswered'?'看过未答':'尚未到达'} · ${time(v.time)}`;
    return typeof v==='number'?time(v):`已保存${Object.keys(v).length}项学习记录`;
  }
  function downloadConflict(id){const issue=state?.conflicts[id];if(!issue)return;const text=JSON.stringify({format:'shenrenliu-cloud-conflict',version:2,label:label(issue.local),local:issue.local,remote:issue.remote},null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='学习记录差异-'+Date.now()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function message(text){const node=document.querySelector('#cloudSyncMessage');if(node)node.textContent=text;}
  function render(){const dialog=document.querySelector('#cloudAccountDialog');if(!dialog)return;dialog.innerHTML=`<h2>学习账号与同步</h2><p>同步收藏、错题、掌握、学习记录、成绩统计，以及考试／背诵进度和学习偏好。成绩按试卷身份去重；累计统计有差异时确认保留哪份，不直接相加。原有完整备份继续可用。</p><p id="cloudSyncStatus" role="status">${esc(status())}</p>${!CONFIG.enabled?'<p>云端服务尚未启用，当前继续使用本机记录。</p>':!user?`<p class="muted">支持QQ／Foxmail、网易、 新浪及搜狐邮箱，不需要提供邮箱密码。</p><label>邮箱<input id="cloudEmail" type="email" autocomplete="email" value="${esc(otpEmail)}" placeholder="例如：你的QQ号@qq.com"></label><button class="btn" data-action="send">发送验证码</button><label>邮件验证码<input id="cloudCode" autocomplete="one-time-code" maxlength="12"></label><button class="btn primary" data-action="verify">验证并登录</button>`:preview?`<p>准备把本机${preview.upload.length}条已有状态加入账号，接收${preview.download.length}条云端状态。启用后，本机对这些学习数据的修改和删除会自动同步。先为差异选择保留哪份：</p>${preview.conflicts.map(issue=>`<label>${esc(label(issue.local))}<br>本机：${esc(summary(issue.local))}；云端：${esc(summary(issue.remote))}<select data-cloud-choice="${esc(issue.id)}"><option value="">请选择</option><option value="local">保留本机</option><option value="remote">保留云端</option></select></label>`).join('')}<button class="btn primary" data-action="approve">合并并启用同步</button>`:`<p>待上传${Object.keys(state.pending).length}条 · 差异${Object.keys(state.conflicts).length}条</p>${Object.entries(state.conflicts).map(([id,issue])=>`<div class="notice"><b>${esc(label(issue.local))}</b>${issue.reason?`<p class="muted">${esc(issue.reason)}</p>`:''}<p>本机：${esc(summary(issue.local))}；云端：${esc(summary(issue.remote))}</p><button class="btn" data-local="${esc(id)}">保留本机</button><button class="btn" data-remote="${esc(id)}">保留云端</button><button class="btn small" data-export-conflict="${esc(id)}">保存两份差异文件</button>${issue.local.field==='activity'&&issue.local.value?`<button class="btn" data-fork="${esc(id)}">保留两份进度</button>`:''}</div>`).join('')}<button class="btn primary" data-action="sync">立即同步</button><button class="btn" data-action="undoCloud">撤销最近一次云端接收</button>`}<p id="cloudSyncMessage" role="status"></p><div class="q-actions">${user?'<button class="btn" data-action="logout">退出登录</button>':''}<button class="btn" data-action="close">关闭</button></div>`;
    if(user&&!state?.approved&&!preview)dialog.innerHTML=`<h2>学习账号与同步</h2><p>邮箱已登录，尚未完成同步连接。本机学习记录保留，重试不需要再次获取验证码。</p><p id="cloudSyncStatus" role="status">${esc(status())}</p><button class="btn primary" data-action="retry">重试连接</button><p id="cloudSyncMessage" role="status"></p><div class="q-actions"><button class="btn" data-action="logout">退出登录</button><button class="btn" data-action="close">关闭</button></div>`;
    if(user)dialog.querySelector('h2').insertAdjacentHTML('afterend',`<div class="cloud-account-profile"><span class="cloud-account-avatar" aria-hidden="true">@</span><div><small>当前登录邮箱</small><strong>${esc(user.email||'我的学习账号')}</strong></div></div>`);
    dialog.querySelector('[data-action="close"]').onclick=()=>dialog.close();const bind=(action,fn)=>{const button=dialog.querySelector(`[data-action="${action}"]`);if(button)button.onclick=async()=>{button.disabled=true;try{await fn();}catch(error){message(error.message);}finally{if(button.isConnected)button.disabled=false;}};};
    bind('retry',()=>authenticate(user));
    bind('send',async()=>{if(Date.now()-codeSentAt<60000)throw Error('请稍等一分钟再获取验证码');const email=C.email(document.querySelector('#cloudEmail').value);await connect();await transport.sendCode(email);otpEmail=email;codeSentAt=Date.now();message('已请求发送验证码，请查收邮箱及垃圾邮件。');});bind('verify',async()=>{if(!transport)throw Error('请先获取验证码');const email=C.email(document.querySelector('#cloudEmail').value);const code=document.querySelector('#cloudCode').value.trim();await authenticate(await transport.verifyCode(email,code));});dialog.querySelectorAll('[data-export-conflict]').forEach(button=>button.onclick=()=>downloadConflict(button.dataset.exportConflict));bind('approve',approve);bind('sync',sync);bind('undoCloud',undoCloud);dialog.querySelectorAll('[data-fork]').forEach(button=>{button.onclick=async()=>{button.disabled=true;try{await keepBoth(button.dataset.fork);}catch(error){message(error.message);}finally{if(button.isConnected)button.disabled=false;}}});bind('logout',logout);dialog.querySelectorAll('[data-local],[data-remote]').forEach(button=>{button.onclick=async()=>{try{const choice=button.dataset.local?'local':'remote',id=button.dataset.local||button.dataset.remote,result=C.resolve(state,id,choice,uid);if(result.apply)await safeApply([result.apply]);state=result.state;if(result.apply){observed=current();state.baseline=observed;}persist();render();await sync();}catch(error){message(error.message);}};});updateStatus();
  }
  function open(){if(!home)return;if(!document.querySelector('#cloudAccountDialog')){const dialog=document.createElement('dialog');dialog.id='cloudAccountDialog';dialog.className='feedback-dialog cloud-account-dialog';document.body.append(dialog);}render();document.querySelector('#cloudAccountDialog').showModal();if(CONFIG.enabled&&!user){const ticket=epoch;(async()=>{try{const next=await(await connect()).currentUser();if(next&&ticket===epoch&&!user&&document.querySelector('#cloudAccountDialog')?.open)await authenticate(next);}catch(error){if(ticket===epoch){lastError=error.message;message(error.message);updateStatus();}}})();}}
  function onView(isHome){const wasHome=home;home=isHome;const notice=document.querySelector('#syncTestNotice');if(notice)notice.hidden=!isHome;if(home&&!wasHome&&user&&state?.approved)schedule();updateStatus();}
  async function attach(adapter){app=adapter;if(!CONFIG.enabled)return;let button=document.querySelector('#cloudAccountButton');if(!button){button=document.createElement('button');button.id='cloudAccountButton';button.className='btn small';button.onclick=open;const host=document.createElement('div');host.className='cloud-account-strip';host.append(button);document.querySelector('.topbar')?.append(host);}updateStatus();if(!localStorage.getItem(BINDING))return;try{await connect();const next=await transport.currentUser();if(next)await authenticate(next);}catch(error){lastError=error.message;updateStatus();}}
  function bulkWarning(){return CONFIG.enabled&&(user||localStorage.getItem(BINDING))?'账号同步已关联：导入、撤销或清空产生的学习记录、成绩统计、收藏和考试／背诵进度变更，会同步到同一账号的其他设备；暂时退出后，下次登录仍会识别变更。请先导出完整备份。':'';}
  window.CLOUD_SYNC={attach,changed,onView,open,sync,status,bulkWarning,logout,keepBoth,undoCloud,downloadConflict,connected:()=>!!(user&&state?.approved),recoveryKey:()=>user?cacheKey():null,sessionToken:()=>user?epoch+':'+user.uid:null};
  setInterval(()=>{if(home&&!document.hidden&&navigator.onLine!==false&&user&&state?.approved&&!busy)sync();},60000);
  window.addEventListener('online',()=>schedule());window.addEventListener('pagehide',()=>{try{capture();}catch(_){}});document.addEventListener('visibilitychange',()=>{if(document.hidden)try{capture();}catch(_){}else if(home)schedule();});
})();
