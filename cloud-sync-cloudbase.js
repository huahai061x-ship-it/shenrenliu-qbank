(() => {
  'use strict';
  let loading;
  const failure=result=>{if(result?.error){const hints={invalid_argument:'验证码不正确或已过期，请重新获取',too_many_requests:'请求较频繁，请稍后重试',rate_limit_exceeded:'请求较频繁，请稍后重试',unreachable:'网络暂不可用，本机记录仍保留'};throw Error(hints[result.error.code]||'云服务未完成操作，请检查配置或稍后重试');}return result?.data;};
  window.createQbankCloudbase=async config=>{
    if(!config.enabled||!config.envId||! /^[a-zA-Z0-9_-]+$/.test(config.functionName))throw Error('云同步尚未配置');
    if(!window.cloudbase){const url=new URL(config.sdkURL,document.baseURI);if(url.origin!==location.origin)throw Error('登录组件必须由本站提供');loading ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url.href;const timer=setTimeout(()=>reject(Error('登录组件下载超时，本机学习记录仍保留')),30000);script.onload=()=>{clearTimeout(timer);window.cloudbase?resolve():reject(Error('登录组件无效'));};script.onerror=()=>{clearTimeout(timer);loading=null;reject(Error('登录组件暂不可用，本机学习记录仍保留'));};document.head.append(script);});try{await loading;}catch(error){loading=null;throw error;}}
    const app=window.cloudbase.init({env:config.envId,region:config.region}),auth=typeof app.auth==='function'?app.auth():app.auth;let verification=null,verificationEmail='',verificationEpoch=0;const payloadCache=new Map(),chunkCache=new Map();let chunkBytes=0;
    function rememberChunk(hash,text){if(chunkCache.has(hash))return;const size=window.CLOUD_SYNC_PAYLOAD.length(text);while(chunkBytes+size>8*1024*1024&&chunkCache.size){const key=chunkCache.keys().next().value;chunkBytes-=window.CLOUD_SYNC_PAYLOAD.length(chunkCache.get(key));chunkCache.delete(key);}chunkCache.set(hash,text);chunkBytes+=size;}
    const timeoutMs=Math.min(45000,Math.max(500,Number(config.requestTimeoutMs)||15000));
    async function timed(task){let timer;try{return await Promise.race([task(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('网络响应超时，本机记录与待同步变更仍保留，请稍后重试')),timeoutMs);})]);}finally{clearTimeout(timer);}}
    async function user(){const data=failure(await timed(()=>auth.getUser()));if(!data?.user)return null;const uid=data.user.id||data.user.uid;if(!uid)throw Error('登录身份无效');return {uid,email:data.user.email||''};}
    return {
      async currentUser(){const result=await timed(()=>auth.getSession());if(result?.error?.code==='unauthenticated')return null;const data=failure(result);return data?.session?user():null;},
      async sendCode(email){const clean=window.CLOUD_SYNC_CORE.email(email);const ticket=++verificationEpoch;verification=null;verificationEmail='';const data=failure(await timed(()=>auth.signInWithOtp({email:clean})));if(ticket!==verificationEpoch)throw Error('验证码请求已变化，请重新获取');if(typeof data?.verifyOtp!=='function')throw Error('验证码通道尚未开通');verification=data.verifyOtp;verificationEmail=clean;},
      async verifyCode(email,code){if(!verification||window.CLOUD_SYNC_CORE.email(email)!==verificationEmail)throw Error('请先为当前邮箱获取验证码');if(! /^[a-zA-Z0-9]{4,12}$/.test(code))throw Error('请输入邮件中的验证码');failure(await timed(()=>verification({token:code})));verification=null;return user();},
      async signOut(){payloadCache.clear();chunkCache.clear();chunkBytes=0;verificationEpoch++;verification=null;verificationEmail='';failure(await timed(()=>auth.signOut()));},
      async request(data){
        const P=window.CLOUD_SYNC_PAYLOAD;
        const raw=async payload=>{const response=await timed(()=>app.callFunction({name:config.functionName,data:payload})),result=response?.result;if(!result?.ok||result.schemaVersion!==1)throw Error(result?.error||'云同步暂不可用');if(result.protocolVersion!==2)throw Error('云同步服务版本过旧，请联系维护者更新');return result;};
        const expand=async row=>{
          if(!P.manifest(row.value))return row;const ref=P.validateManifest(row.value);let value=payloadCache.get(ref.hash);
          if(value===undefined){const chunks=new Array(ref.parts),missing=[];for(let i=0;i<ref.parts;i++){const cached=ref.chunkHashes?chunkCache.get(ref.chunkHashes[i]):undefined;if(cached!==undefined)chunks[i]=cached;else missing.push(i);}
            for(let i=0;i<missing.length;i+=4){const indices=missing.slice(i,i+4),result=await raw({action:'getBlobs',hash:ref.hash,indices,total:ref.parts});if(!Array.isArray(result.chunks)||result.chunks.length!==indices.length||result.chunks.some((p,n)=>p.index!==indices[n]))throw Error('学习进度分块顺序无效');for(const part of result.chunks){if(typeof part.content!=='string'||P.length(part.content)>48000)throw Error('学习进度分块无效');chunks[part.index]=part.content;}}
            value=P.decode(ref,chunks);if(ref.chunkHashes)chunks.forEach((text,i)=>rememberChunk(ref.chunkHashes[i],text));if(payloadCache.size>=8)payloadCache.delete(payloadCache.keys().next().value);payloadCache.set(ref.hash,value);
          }
          return {...row,value:JSON.parse(JSON.stringify(value))};
        };
        if(data.action==='push'){
          const operations=[];
          for(const op of data.operations){const encoded=P.encode(op.value);if(encoded.chunks.length){const prepared=await raw({action:'prepareBlob',manifest:encoded.value}),missing=prepared.missing;if(!Array.isArray(missing)||new Set(missing).size!==missing.length||missing.some(i=>!Number.isSafeInteger(i)||i<0||i>=encoded.chunks.length))throw Error('同步分块索引无效');for(let i=0;i<missing.length;i+=4)await raw({action:'putBlobs',hash:encoded.value.hash,total:encoded.chunks.length,chunks:missing.slice(i,i+4).map(index=>({index,content:encoded.chunks[index]}))});}operations.push({...op,value:encoded.value});if(encoded.chunks.length){encoded.chunks.forEach((text,i)=>rememberChunk(encoded.value.chunkHashes[i],text));if(payloadCache.size>=8)payloadCache.delete(payloadCache.keys().next().value);payloadCache.set(encoded.value.hash,op.value);}}
          data={...data,operations};
        }
        const result=await raw(data);
        if(result.records)result.records=await Promise.all(result.records.map(expand));
        if(result.results)for(const item of result.results)if(item.record)item.record=await expand(item.record);
        return result;
      }
    };
  };
})();
