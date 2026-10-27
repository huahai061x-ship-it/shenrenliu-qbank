// Content-addressed, account-private payloads keep long study queues out of small requests.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CLOUD_SYNC_PAYLOAD=api;})(typeof window!=='undefined'?window:globalThis,()=>{
  'use strict';
  const MAX_BYTES=20*1024*1024,CHARS=14000,INLINE=48000;
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes=s=>new TextEncoder().encode(s),length=s=>bytes(s).length,rotate=(x,n)=>(x>>>n)|(x<<(32-n));
  function hash(text){
    const src=bytes(text),data=new Uint8Array(Math.ceil((src.length+9)/64)*64);data.set(src);data[src.length]=128;
    const view=new DataView(data.buffer);view.setUint32(data.length-8,Math.floor(src.length/0x20000000));view.setUint32(data.length-4,(src.length*8)>>>0);
    const h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
    for(let block=0;block<data.length;block+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(block+i*4);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))>>>0;}let [a,b,c,d,e,f,g,z]=h;
      for(let i=0;i<64;i++){const t1=(z+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      [a,b,c,d,e,f,g,z].forEach((x,i)=>h[i]=(h[i]+x)>>>0);
    }return [...h].map(x=>x.toString(16).padStart(8,'0')).join('');
  }
  function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
  const fingerprint=v=>hash(canonical(v));
  function manifest(v){return !!v&&v._qbankBlob===2;}
  function validateManifest(v){if(!manifest(v)||!/^[a-f0-9]{64}$/.test(v.hash)||!Number.isSafeInteger(v.parts)||v.parts<1||v.parts>2000||!Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>MAX_BYTES||(v.chunkHashes!=null&&(!Array.isArray(v.chunkHashes)||v.chunkHashes.length!==v.parts||v.chunkHashes.some(h=>! /^[a-f0-9]{64}$/.test(h))))||Object.keys(v).some(k=>!['_qbankBlob','hash','parts','bytes','chunkHashes'].includes(k)))throw Error('同步分块清单无效');return v;}
  const encodedCache=new WeakMap();
  function splitText(text){const parts=[];for(let i=0;i<text.length;){let end=Math.min(text.length,i+CHARS);if(end<text.length&&text.charCodeAt(end-1)>=0xd800&&text.charCodeAt(end-1)<=0xdbff)end--;parts.push(text.slice(i,end));i=end;}return parts;}
  function encode(value){
    if(value&&typeof value==='object'&&encodedCache.has(value))return encodedCache.get(value);
    const text=JSON.stringify(value),size=length(text);if(size>MAX_BYTES)throw Error('单份学习记录超过20MB，请先完整备份');if(size<=INLINE)return {value,chunks:[]};
    let chunks=[],small='';const flush=()=>{if(small){chunks.push(...splitText(small));small='';}},write=s=>{small+=s;if(small.length>=CHARS)flush();},block=s=>{flush();chunks.push(...splitText(s));};
    // Stable groups of question/items keep later groups unchanged when an answer changes length.
    function visit(v){
      if(Array.isArray(v)){write('[');if(v.length>=32){for(let i=0;i<v.length;i+=16)block(JSON.stringify(v.slice(i,i+16)).slice(1,-1)+(i+16<v.length?',':''));}else v.forEach((item,i)=>{if(i)write(',');visit(item);});write(']');}
      else if(v&&typeof v==='object'){const keys=Object.keys(v);write('{');if(keys.length>=32){for(let i=0;i<keys.length;i+=16){const group=Object.fromEntries(keys.slice(i,i+16).map(k=>[k,v[k]]));block(JSON.stringify(group).slice(1,-1)+(i+16<keys.length?',':''));}}else keys.forEach((key,i)=>{if(i)write(',');write(JSON.stringify(key)+':');visit(v[key]);});write('}');}
      else write(JSON.stringify(v));
    }
    visit(JSON.parse(text));flush();if(chunks.length>2000)chunks=splitText(text);
    const result={value:{_qbankBlob:2,hash:hash(text),parts:chunks.length,bytes:size,chunkHashes:chunks.map(hash)},chunks};validateManifest(result.value);
    if(value&&typeof value==='object')encodedCache.set(value,result);return result;
  }
  function decode(ref,chunks){validateManifest(ref);if(chunks.length!==ref.parts||chunks.some(x=>typeof x!=='string'||length(x)>48000))throw Error('同步分块不完整');if(ref.chunkHashes&&chunks.some((s,i)=>hash(s)!==ref.chunkHashes[i]))throw Error('学习记录分块校验失败，已保留本机记录');const text=chunks.join('');if(length(text)!==ref.bytes||hash(text)!==ref.hash)throw Error('学习记录完整性校验失败，已保留本机记录');return JSON.parse(text,(k,v)=>{if(['__proto__','prototype','constructor'].includes(k))throw Error('同步记录字段无效');return v;});}
  return {MAX_BYTES,INLINE,length,hash,fingerprint,canonical,manifest,validateManifest,encode,decode};
});
