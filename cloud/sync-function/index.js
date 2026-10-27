'use strict';
const crypto=require('node:crypto'),Core=require('./cloud-sync-core.js'),Payload=require('./cloud-sync-payload.js');
function storageNames(scope=process.env.QBANK_SYNC_SCOPE||'test'){
  if(scope==='test')return {collection:'qbank_sync_v1',blobs:'qbank_sync_payload_v2'};
  if(scope==='production')return {collection:'qbank_prod_v1',blobs:'qbank_prod_payload_v2'};
  throw Error('同步存储环境配置无效');
}
function createService(repo){
  return async function(request,identity){
    if(typeof identity?.uid!=='string'||!identity.uid||identity.uid.length>128||identity.isAnonymous!==false)throw Error('请先通过邮箱验证码登录');
    const actions={prepareBlob:['action','manifest'],pull:['action','cursor'],push:['action','operations'],putBlob:['action','hash','index','total','content'],getBlob:['action','hash','index','total'],putBlobs:['action','hash','total','chunks'],getBlobs:['action','hash','total','indices']};
    if(!request||!actions[request.action]||Object.keys(request).some(k=>!actions[request.action].includes(k)))throw Error('同步请求无效');
    if(Buffer.byteLength(JSON.stringify(request))>262144)throw Error('同步批次过大');
    const owner=identity.uid,response=data=>({schemaVersion:1,protocolVersion:2,...data});
    if(request.action==='prepareBlob'){const ref=Payload.validateManifest(request.manifest);if(!ref.chunkHashes)throw Error('分块清单缺少内容索引');return response({missing:await repo.prepareBlob(owner,ref)});}
    if(['putBlobs','getBlobs'].includes(request.action)){
      if(!/^[a-f0-9]{64}$/.test(request.hash)||!Number.isSafeInteger(request.total)||request.total<1||request.total>2000)throw Error('同步分块清单无效');
      const parts=request.action==='putBlobs'?request.chunks:request.indices;
      if(!Array.isArray(parts)||!parts.length||parts.length>4)throw Error('每批最多传输4块');
      const indices=parts.map(p=>request.action==='putBlobs'?p?.index:p);
      if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=request.total))throw Error('同步分块位置无效');
      if(request.action==='putBlobs'){for(const part of parts){if(typeof part.content!=='string'||Buffer.byteLength(part.content)>48000||Object.keys(part).some(k=>!['index','content'].includes(k)))throw Error('同步分块无效');}for(const part of parts)await repo.putBlob(owner,request.hash,part.index,request.total,part.content);return response({stored:true});}
      const chunks=await Promise.all(indices.map(async index=>({index,content:await repo.getBlob(owner,request.hash,index,request.total)})));
      if(chunks.some(p=>typeof p.content!=='string'))throw Error('学习进度尚未上传完整，请稍后重试');return response({chunks});
    }
    if(['putBlob','getBlob'].includes(request.action)){
      if(!/^[a-f0-9]{64}$/.test(request.hash)||!Number.isSafeInteger(request.total)||request.total<1||request.total>2000||!Number.isSafeInteger(request.index)||request.index<0||request.index>=request.total)throw Error('同步分块位置无效');
      if(request.action==='putBlob'){
        if(typeof request.content!=='string'||Buffer.byteLength(request.content)>48000)throw Error('同步分块过大');
        await repo.putBlob(owner,request.hash,request.index,request.total,request.content);return response({stored:true});
      }
      const content=await repo.getBlob(owner,request.hash,request.index,request.total);if(typeof content!=='string')throw Error('学习进度尚未上传完整，请稍后重试');return response({content});
    }
    if(request.action==='pull'){
      const cursor=request.cursor||'';if(typeof cursor!=='string'||cursor.length>120)throw Error('分页位置无效');
      const source=await repo.list(owner,cursor,100),rows=[];let bytes=0;
      for(const row of source){Core.validateRecord(row);const size=Buffer.byteLength(JSON.stringify(row))+1;if(rows.length&&bytes+size>240000)break;if(size>240000)throw Error('单条旧记录过大，请先迁移到分块格式');rows.push(row);bytes+=size;}
      const more=rows.length<source.length||source.length===100;return response({records:rows,nextCursor:more&&rows.length?Core.recordId(rows.at(-1).key,rows.at(-1).field):null});
    }
    if(!Array.isArray(request.operations)||request.operations.length>50)throw Error('每次最多同步50条变更');
    const logicalValues=new Map();
    for(const op of request.operations){
      Core.validateOp(op);logicalValues.set(op.id,op.value);
      if(Payload.manifest(op.value)){
        const ref=Payload.validateManifest(op.value),chunks=[];for(let i=0;i<ref.parts;i+=8)chunks.push(...await Promise.all(Array.from({length:Math.min(8,ref.parts-i)},(_,n)=>repo.getBlob(owner,ref.hash,i+n,ref.parts))));
        const value=Payload.decode(ref,chunks);Core.validateOp({...op,value});logicalValues.set(op.id,value);
      }
    }
    const results=[];for(const op of request.operations){const id=Core.recordId(op.key,op.field),value=logicalValues.get(op.id),guardId=op.field==='activity'&&value?.kind==='exam'?Core.recordId(Core.entityKey('paper',value.id),'exam'):null;results.push(await repo.transaction(owner,id,(current,completed)=>{if(guardId&&completed?.value!=null){const result=Core.applyOperation(current,{...op,value:null,baseRev:current?.rev||0});return {...result,status:'conflict',reason:'此试卷已交卷，未完成进度不会覆盖成绩；可以保留为独立副本'};}return Core.applyOperation(current,op);},guardId));}
    return response({results});
  };
}
function cloudbaseRepository(app,scope){
  const {collection:COLLECTION,blobs:BLOBS}=storageNames(scope);
  const db=app.database(),hash=(owner,id)=>crypto.createHash('sha256').update(owner+'\0'+id).digest('hex'),one=result=>Array.isArray(result.data)?result.data[0]:result.data,manifests=new Map();
  const chunkId=(owner,digest)=>hash(owner,'chunk:'+digest),manifestId=(owner,digest)=>hash(owner,'manifest:'+digest);
  async function manifest(owner,digest){const key=owner+'|'+digest;if(manifests.has(key))return manifests.get(key);const stored=one(await db.collection(BLOBS).doc(manifestId(owner,digest)).get());if(!stored)return null;if(stored.owner!==owner||stored.manifest?.hash!==digest)throw Error('分块清单所属账号无效');if(manifests.size>=64)manifests.delete(manifests.keys().next().value);manifests.set(key,stored.manifest);return stored.manifest;}
  async function chunk(owner,digest){const stored=one(await db.collection(BLOBS).doc(chunkId(owner,digest)).get());if(!stored)return null;if(stored.owner!==owner||stored.digest!==digest)throw Error('同步分块所属账号无效');return stored.content;}
  return {
    async list(owner,cursor,limit){const where={owner};if(cursor)where.recordId=db.command.gt(cursor);const result=await db.collection(COLLECTION).where(where).orderBy('recordId','asc').limit(limit).get();return (result.data||[]).map(row=>row.record);},
    async transaction(owner,id,update,guardId=null){return db.runTransaction(async tx=>{const doc=tx.collection(COLLECTION).doc(hash(owner,id)),stored=one(await doc.get());if(stored&&stored.owner!==owner)throw Error('记录所属账号无效');const guarded=guardId?one(await tx.collection(COLLECTION).doc(hash(owner,guardId)).get()):null;if(guarded&&guarded.owner!==owner)throw Error('试卷所属账号无效');const change=update(stored?.record||null,guarded?.record||null);if(change.changed)await doc.set({owner,recordId:id,record:change.record,updatedAt:Date.now()});return change;});},
    async prepareBlob(owner,ref){
      await db.runTransaction(async tx=>{const doc=tx.collection(BLOBS).doc(manifestId(owner,ref.hash)),stored=one(await doc.get());if(stored){if(stored.owner!==owner||!Core.same(stored.manifest,ref))throw Error('分块清单内容冲突');return;}await doc.set({owner,manifest:ref,createdAt:Date.now()});});
      if(manifests.size>=64)manifests.delete(manifests.keys().next().value);manifests.set(owner+'|'+ref.hash,ref);
      const missing=[];for(let i=0;i<ref.parts;i+=8){const found=await Promise.all(ref.chunkHashes.slice(i,i+8).map(digest=>chunk(owner,digest)));found.forEach((value,n)=>{if(value===null)missing.push(i+n);});}return missing;
    },
    async putBlob(owner,digest,index,total,content){
      const registered=await manifest(owner,digest),contentHash=Payload.hash(content);
      if(registered){if(registered.parts!==total||registered.chunkHashes[index]!==contentHash)throw Error('同步分块与清单不匹配');const docId=chunkId(owner,contentHash);return db.runTransaction(async tx=>{const doc=tx.collection(BLOBS).doc(docId),stored=one(await doc.get());if(stored){if(stored.owner!==owner||stored.digest!==contentHash||stored.content!==content)throw Error('同步分块内容冲突');return;}await doc.set({owner,digest:contentHash,content,createdAt:Date.now()});});}
      return db.runTransaction(async tx=>{const doc=tx.collection(BLOBS).doc(hash(owner,digest+':'+index)),stored=one(await doc.get());if(stored){if(stored.owner!==owner||stored.digest!==digest||stored.index!==index||stored.total!==total||stored.content!==content)throw Error('同步分块内容冲突');return;}await doc.set({owner,digest,index,total,content,createdAt:Date.now()});});
    },
    async getBlob(owner,digest,index,total){const registered=await manifest(owner,digest);if(registered){if(registered.parts!==total)return null;return chunk(owner,registered.chunkHashes[index]);}const stored=one(await db.collection(BLOBS).doc(hash(owner,digest+':'+index)).get());if(!stored||stored.owner!==owner||stored.digest!==digest||stored.index!==index||stored.total!==total)return null;return stored.content;}
  };
}
let runtime;
// callFunction may append userInfo and tcbContext to the event. They are transport metadata,
// never a source of authority; identity comes only from the runtime SDK.
function syncRequest(event){if(!event||typeof event!=='object'||Array.isArray(event))return event;const {userInfo:ignoredUserInfo,tcbContext:ignoredContext,...request}=event;return request;}
exports.main=async event=>{try{if(!runtime){const sdk=require('@cloudbase/node-sdk'),app=sdk.init({env:sdk.SYMBOL_CURRENT_ENV});runtime={app,service:createService(cloudbaseRepository(app))};}const identity=runtime.app.auth().getUserInfo();return {ok:true,...await runtime.service(syncRequest(event),identity)};}catch(error){if(error.message==='同步请求无效')console.warn('SYNC_REQUEST_INVALID',JSON.stringify({keys:Object.keys(event||{}).map(k=>k.replace(/[^a-zA-Z0-9_]/g,'').slice(0,40)).slice(0,16),actionType:typeof event?.action}));return {ok:false,error:String(error.message||'同步失败').slice(0,180)};}};
exports.createService=createService;exports.cloudbaseRepository=cloudbaseRepository;
exports.syncRequest=syncRequest;
exports.storageNames=storageNames;
