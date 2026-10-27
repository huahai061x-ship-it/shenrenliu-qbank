const C=require('../../cloud-sync-core.js'),P=require('../../cloud-sync-payload.js');
exports.createMemoryRepository=()=>{
  const records=new Map(),blocks=new Map(),manifests=new Map(),chunks=new Map(),locks=new Map();
  const repo={
    async list(owner,cursor,n){return [...records.entries()].filter(([k])=>k.startsWith(owner+'|')).map(([,v])=>C.clone(v)).filter(v=>C.recordId(v.key,v.field)>cursor).sort((a,b)=>C.recordId(a.key,a.field).localeCompare(C.recordId(b.key,b.field))).slice(0,n);},
    async transaction(owner,id,fn,guardId=null){const key=owner+'|'+id,prior=locks.get(key)||Promise.resolve(),run=prior.then(()=>{const result=fn(records.get(key)||null,guardId?records.get(owner+'|'+guardId)||null:null);if(result.changed)records.set(key,C.clone(result.record));return result;});locks.set(key,run.catch(()=>{}));return run;},
    async prepareBlob(owner,ref){const key=owner+'|'+ref.hash,old=manifests.get(key);if(old&&!C.same(old,ref))throw Error('分块清单内容冲突');manifests.set(key,C.clone(ref));return ref.chunkHashes.map((h,i)=>chunks.has(owner+'|'+h)?-1:i).filter(i=>i>=0);},
    async putBlob(owner,hash,index,total,content){const ref=manifests.get(owner+'|'+hash);if(ref){const digest=P.hash(content);if(ref.parts!==total||ref.chunkHashes[index]!==digest)throw Error('同步分块与清单不匹配');const key=owner+'|'+digest,old=chunks.get(key);if(old!=null&&old!==content)throw Error('同步分块内容冲突');chunks.set(key,content);return;}const key=owner+'|'+hash+'|'+index,old=blocks.get(key);if(old&&(old.total!==total||old.content!==content))throw Error('同步分块内容冲突');blocks.set(key,{total,content});},
    async getBlob(owner,hash,index,total){const ref=manifests.get(owner+'|'+hash);if(ref)return ref.parts===total?chunks.get(owner+'|'+ref.chunkHashes[index])??null:null;const row=blocks.get(owner+'|'+hash+'|'+index);return row?.total===total?row.content:null;}
  };
  return {repo,records,blocks,manifests,chunks};
};
