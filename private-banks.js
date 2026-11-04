// User-selected banks are verified and stored in this browser only.
(() => {
  'use strict';
  const expected = {
    forming_forging_2026: 'c7fa42357655249fb571b5eeecbf0ba016f1819d4e6e4d14df088047edfa0f3b',
    forming_casting_2026: 'a4d8421b6537342c700fe7d07ed552e2117812cad7f709be1acfeacf99d901b9'
  };
  const prefix = 'srl_local_library_v1/';
  const packageKey = 'srl_verified_local_pair_v1';
  const ids = Object.keys(expected);
  const active = new URL(location.href).searchParams.get('localBanks') === '1';
  const isBank = id => Object.hasOwn(expected, id);
  let raw, unavailable;
  // Cloud features and ALL learning storage are isolated before any application script runs.
  if (active) window.QBANK_CLOUD_CONFIG = {enabled:false};
  try {
    raw = window.localStorage;
    if (active) {
      const keys = () => Object.keys(raw).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
      const scoped = new Proxy(Object.create(null), {
        get(_, k) {
          if(k==='getItem')return name => raw.getItem(prefix+name);
          if(k==='setItem')return (name,value) => raw.setItem(prefix+name,value);
          if(k==='removeItem')return name => raw.removeItem(prefix+name);
          if(k==='key')return i => keys()[i]??null;
          if(k==='length')return keys().length;
          if(k==='clear')return () => keys().forEach(name => raw.removeItem(prefix+name));
          if(typeof k==='string')return raw.getItem(prefix+k)??undefined;
        },
        ownKeys:keys,
        getOwnPropertyDescriptor:(_,k)=>typeof k==='string'&&raw.getItem(prefix+k)!==null?{enumerable:true,configurable:true}:undefined
      });
      Object.defineProperty(window,'localStorage',{value:scoped,configurable:true});
    }
  } catch (error) { unavailable=true; }
  async function validate(pack) {
    if(pack?.format!=='qbank-private-pair/v1'||!Array.isArray(pack.banks)||pack.banks.length!==ids.length)throw Error('请选取完整的双题库导入文件（JSON）。');
    const found=new Set();
    for (const b of pack.banks) {
      const id=b?.meta?.id;
      if(!isBank(id)||found.has(id))throw Error('两个题库的身份缺失或重复。');
      const bytes=new TextEncoder().encode(JSON.stringify(b));
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
      if(digest!==expected[id])throw Error('文件与此版已核验题库不一致，请重新选择原始导入文件。');
      found.add(id);
    }
    return pack.banks;
  }
  function checkStorage(){if(!raw||unavailable)throw Error('当前浏览器无法使用独立本机存储，请允许站点保存数据后再试。');}
  function installed(){try{return !unavailable&&!!raw?.getItem(packageKey);}catch(_){return false;}}
  async function read(){checkStorage();const data=raw.getItem(packageKey);return data?validate(JSON.parse(data)):[];}
  async function install(pack){
    checkStorage();
    if(!globalThis.crypto?.subtle)throw Error('请通过 HTTPS 正式网址或本机 localhost 打开后导入。');
    const verified=await validate(pack);
    raw.setItem(packageKey,JSON.stringify({format:'qbank-private-pair/v1',banks:verified}));
  }
  function url(toPrivate){
    const target=new URL(location.href);target.search='';target.hash='';
    if(toPrivate){target.searchParams.set('localBanks','1');target.searchParams.set('banks',ids.join(','));}
    return target.href;
  }
  window.QBANK_PRIVATE={active,unavailable,isBank,installed,read,install,url};
})();
