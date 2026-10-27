(()=>{'use strict';
let pending=null,ticket=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=s=>{let n=document.querySelector('#backupStatus');if(n)n.textContent=s};
function dialog(){return document.querySelector('#backupDialog')}
function open(){
 const R=window.BANK_RUNTIME;document.querySelector('#bankDialog')?.close();document.querySelector('#settingsModal')?.classList.add('hidden');
 let d=dialog();if(!d){d=document.createElement('dialog');d.id='backupDialog';d.className='bank-dialog backup-dialog';d.setAttribute('aria-labelledby','backupTitle');document.body.appendChild(d)}
 pending=null;ticket++;
 d.innerHTML=`<div class="backup-heading"><h2 id="backupTitle">备份与换设备</h2><button class="btn small" onclick="document.querySelector('#backupDialog').close()">关闭</button></div><p>${window.CLOUD_SYNC?.connected?.()?'学习记录已关联账号；完整文件备份仍可用于离线迁移和恢复。':'学习记录保存在当前浏览器。换设备只需下面两步。'}</p>${window.CLOUD_SYNC?.bulkWarning?.()?`<p class="notice">${esc(window.CLOUD_SYNC.bulkWarning())}</p>`:''}<section class="backup-step"><span class="backup-step-number">1</span><h3>旧设备：导出备份</h3><p>导出一个TXT文件，用微信或QQ以<b>文件</b>发送到新设备。</p><div class="backup-actions"><button class="btn primary" onclick="BACKUP_UI.exportFile()">导出备份文件</button><button id="backupShare" class="btn" hidden onclick="BACKUP_UI.exportFile(true)">直接分享文件</button></div><small>包含全部题库的学习记录与保留的考试历史。</small></section><section class="backup-step"><span class="backup-step-number">2</span><h3>新设备：导入备份</h3><p>先下载收到的文件，再在本站选择它。以前的JSON备份也能使用。</p><button class="btn primary" onclick="document.querySelector('#backupFile').click()">选择备份文件</button><input id="backupFile" type="file" accept=".txt,.json,text/plain,application/json" hidden onchange="BACKUP_UI.preview(this.files[0])"><div id="backupPreview" class="backup-preview" aria-live="polite">尚未选择文件</div><p class="muted">默认合并，保留本机掌握标签和未交试卷；导入前自动保留一份本机记录。</p><button id="backupApply" class="btn primary" disabled onclick="BACKUP_UI.apply()">导入并合并</button><details class="backup-advanced"><summary>合并规则与其他恢复方式</summary><p>默认合并：收藏取合集，同题累计次数取较大值、练习状态参考较新记录；本机已设置的掌握标签保留。历史试卷去重，最多保留50场；本机未交试卷优先保留。重复导入不会把次数相加。</p><p>覆盖仅替换备份所含题库的记录。导入前自动保留一份本机记录，可在下方撤销。</p><button id="backupReplace" class="btn danger" disabled onclick="BACKUP_UI.apply('replace')">覆盖备份所含题库记录</button></details></section><p id="backupStatus" role="status" aria-live="polite"></p><details class="backup-advanced"><summary>撤销与高级导出</summary><p>撤销会恢复到最近一次导入之前，也会撤回之后的新增记录。</p><div class="backup-actions"><button class="btn" onclick="BANK_RUNTIME.undoBackup()" ${localStorage.getItem(window.BANK_CORE.KEY+'_before_import')?'':'disabled'}>撤销最近一次导入</button><button class="btn" onclick="BANK_RUNTIME.exportSelected()">仅导出所选题库记录（JSON）</button></div></details>`;
 try{if(navigator.canShare&&navigator.canShare({files:[new File(['backup'],'backup.txt',{type:'text/plain'})]}))d.querySelector('#backupShare').hidden=false}catch(_){}
 if(!d.open)d.showModal();
}
async function exportFile(share=false){
 try{
  const R=window.BANK_RUNTIME,e=R.getBackup();if(!e)return;
  const text=window.BACKUP_CORE.encode(e),name='神人刘_学习备份_'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt',file=new File([text],name,{type:'text/plain;charset=utf-8'});
  if(share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'神人刘学习备份'});
  else{let url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
  R.noteBackup();status(share?'文件已交给系统分享。请在目标设备下载后导入。':'已生成TXT备份文件。请在下载列表中找到它，通过微信或QQ以文件发送。');
 }catch(e){if(e.name!=='AbortError')status('备份未完成：'+e.message)}
}
async function preview(file){
 const n=++ticket;pending=null;for(const id of ['backupApply','backupReplace'])document.getElementById(id).disabled=true;
 if(!file)return;status('正在检查文件…');
 try{if(file.size>window.BACKUP_CORE.MAX_BYTES)throw Error('文件超过20MB');let info=window.BACKUP_CORE.decode(await file.text());if(n!==ticket)return;let s=window.BACKUP_CORE.summary(info);pending=file;
 document.querySelector('#backupPreview').innerHTML=`<b>${esc(file.name)}</b><dl><dt>备份时间</dt><dd>${esc(s.createdAt?new Date(s.createdAt).toLocaleString():'旧文件未记录导出时间')}</dd><dt>包含数据</dt><dd>${s.banks.length}个题库 · 练习记录${s.practiced}题 · 错题${s.wrong}题 · 收藏${s.favorites}题 · 历史${s.history}场 · 未交试卷${s.sessions}场</dd></dl><small>${s.checked?'文件完整性校验通过':'旧JSON格式，已完成基本格式检查'}</small>`;
 for(const id of ['backupApply','backupReplace'])document.getElementById(id).disabled=false;status('文件已就绪。确认下面的导入方式后恢复。');
 }catch(e){if(n!==ticket)return;document.querySelector('#backupPreview').textContent='文件检查未通过';status(e.message+'；本机记录没有改变。')}
}
async function apply(mode='merge'){
 if(!pending)return;const f=pending;for(const id of ['backupApply','backupReplace'])document.getElementById(id).disabled=true;
 try{await window.BANK_RUNTIME.importBackup(f,mode)}finally{if(dialog()?.open&&!window.BANK_RUNTIME.reloading)for(const id of ['backupApply','backupReplace'])document.getElementById(id).disabled=false}
}
window.BACKUP_UI={open,exportFile,preview,apply,status};
})();
