(() => {
  'use strict';
  let opening;
  function open(){
    if(!window.indexedDB)return Promise.reject(Error('此浏览器无法保存云端接收前副本，请继续使用本机学习和完整备份'));
    return opening ||= new Promise((resolve,reject)=>{
      const request=indexedDB.open('shenrenliu_cloud_recovery_v2',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('checkpoints');
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};
      request.onerror=()=>{opening=null;reject(Error('无法准备接收前副本，本机学习记录未改变'));};
      request.onblocked=()=>{opening=null;reject(Error('恢复副本存储暂被占用，请关闭其他旧页面后重试'));};
    });
  }
  async function save(key,store){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('checkpoints','readwrite');tx.objectStore('checkpoints').put({savedAt:Date.now(),store},key);tx.oncomplete=()=>resolve(true);tx.onabort=tx.onerror=()=>reject(Error('接收前副本保存失败，本机学习记录未改变'));});}
  async function load(key){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('checkpoints','readonly'),request=tx.objectStore('checkpoints').get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(Error('读取接收前副本失败'));});}
  window.CLOUD_SYNC_RECOVERY={save,load};
})();
