// Deliberately simple syntax: this recovery UI must work even when later scripts cannot start.
(function () {
  'use strict';
  var ready = false, timer, stage = '基础程序', loaded = {}, lastError = null;
  function label(name) {
    if (name.indexOf('forming_forging')>=0) return '锻造题库';
    if (name.indexOf('forming_casting')>=0) return '铸造题库';
    if (name.indexOf('sinotruk')>=0) return '企业文化题库';
    if (name==='app.js') return '学习主界面';
    if (name.indexOf('cloud-')>=0) return '账号功能';
    if (name.indexOf('bank-')>=0) return '题库与学习记录';
    return '基础学习功能';
  }
  function panel() { return document.getElementById('bootStatus'); }
  function detail() {
    var meta = document.querySelector('meta[name="build-version"]');
    return '启动诊断\n版本：' + (meta ? meta.content : 'local') + '\n阶段：' + stage + '\n错误：' + (lastError || '等待资源') + '\n浏览器：' + navigator.userAgent;
  }
  function fail(error) {
    if (ready) return;
    clearTimeout(timer); if(!lastError)lastError = String(error && error.message ? error.name + ': ' + error.message : error || '启动未完成').slice(0,240);
    var box = panel(); if (!box) return;
    box.querySelector('h2').textContent = '题库还没有打开成功';
    box.querySelector('[data-boot-message]').textContent = '“' + label(stage) + '”暂时未能准备好。可以重试加载；已有学习记录不会被清除。';
    var info = box.querySelector('[data-boot-detail]'); info.hidden = false; info.querySelector('textarea').value = detail();
  }
  function progress(name) {
    if (ready) return;
    stage = name; clearTimeout(timer);
    var box = panel(); if (box && !lastError) box.querySelector('[data-boot-message]').textContent = '正在准备' + label(name) + '…';
    timer = setTimeout(function () {
      var scripts = document.querySelectorAll('script[data-boot]');
      for (var i=0;i<scripts.length;i++) if (!loaded[scripts[i].src]) {stage=scripts[i].getAttribute('data-boot');break;}
      fail('资源加载超时');
    }, 25000);
  }
  function exportOriginal() {
    try {
      var raw = localStorage.getItem('shenrenliu_qbank_workspace_v1') || localStorage.getItem('shenrenliu_qbank_v1');
      if (!raw) { panel().querySelector('[data-boot-message]').textContent = '当前浏览器里没有找到学习记录。'; return; }
      var a=document.createElement('a'), url=URL.createObjectURL(new Blob([raw], {type:'application/json'}));
      a.href=url; a.download='神人刘_原始学习记录备份.json'; a.click(); setTimeout(function(){URL.revokeObjectURL(url);},60000);
    } catch (error) { fail(error); }
  }
  window.QBANK_BOOT = {progress:progress, fail:fail, exportOriginal:exportOriginal, ready:function(){ready=true;clearTimeout(timer);}};
  document.addEventListener('load', function(event) {
    var el=event.target;
    if (el.tagName==='SCRIPT' && el.hasAttribute('data-boot')) {loaded[el.src]=true; progress(el.getAttribute('data-boot'));}
  }, true);
  window.addEventListener('error', function(event) {
    var el=event.target;
    if (el && el.tagName==='SCRIPT') {stage=el.getAttribute('data-boot') || el.src.split('/').pop();fail('资源未能下载');}
    else if (event.error) fail(event.error);
  }, true);
  var box=panel();
  if(box) box.querySelector('[data-boot-backup]').onclick=exportOriginal;
  progress('基础程序');
})();
