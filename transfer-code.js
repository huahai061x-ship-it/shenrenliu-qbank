// Local-only portable learning progress. No network, identity service or third-party library.
(() => {
'use strict';
const MAX_BYTES=512*1024,MAX_CODE=128*1024,WRONG_FIELDS=['count','wrongTotal','wrongStreak','lastWrong','lastCorrect','independentCorrectStreak','assistedCorrect'],STATS_FIELDS=['attempts','correct','wrong','totalMs','timedAttempts','assistedCorrect','lowConfidenceCorrect'],PROGRESS_FIELDS=[...STATS_FIELDS,'last','due','streak','fillExposure','regularExposure','totalExposure','lastSeenRound'];
const ids=new Set(window.QUESTION_BANK.map(q=>q.id));
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function mapRecords(value,fn){if(!object(value)||Object.keys(value).length>507)throw Error('迁移码记录格式不正确');const out={};for(const [id,v] of Object.entries(value)){if(!/^\d+$/.test(id)||String(Number(id))!==id||!ids.has(Number(id)))throw Error('迁移码包含不属于本题库的题号');out[id]=fn(v);}return out;}
function integer(v,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(v)||v<0||v>max)throw Error('迁移码包含无效的进度数值');return v;}
function numbers(v,fields){if(!object(v))throw Error('迁移码记录格式不正确');return Object.fromEntries(fields.map(f=>[f,integer(v[f]??0)]));}
function validate(v){
 if(!object(v)||v.format!=='SLQ-LITE'||v.version!==1||v.bankSchemaVersion!==1)throw Error('不是支持的神人刘题库精简迁移码');
 const madeAt=integer(v.createdAt);if(!Array.isArray(v.favorites)||v.favorites.length>507||v.favorites.some(id=>!Number.isInteger(id)||!ids.has(id))||new Set(v.favorites).size!==v.favorites.length)throw Error('收藏题号格式不正确');
 return {format:'SLQ-LITE',version:1,bankSchemaVersion:1,createdAt:madeAt,favorites:[...v.favorites],wrong:mapRecords(v.wrong,x=>{let out=numbers(x,WRONG_FIELDS);if(typeof x.corrected!=='boolean'||!['','wrong','assistedCorrect','independentCorrect'].includes(x.recentResult))throw Error('错题状态格式不正确');return {...out,corrected:x.corrected,recentResult:x.recentResult};}),mastery:mapRecords(v.mastery,x=>{if(!['mastered','fuzzy','new'].includes(x))throw Error('掌握状态格式不正确');return x;}),reviewFlags:mapRecords(v.reviewFlags,x=>integer(x)),seen:mapRecords(v.seen,x=>integer(x)),learning:mapRecords(v.learning,x=>numbers(x,PROGRESS_FIELDS))};
}
function makeLite(state,createdAt=Date.now()){
 const pick=(v,fields)=>Object.fromEntries(fields.map(f=>[f,Number.isSafeInteger(v?.[f])&&v[f]>=0?v[f]:0]));
 return validate({format:'SLQ-LITE',version:1,bankSchemaVersion:1,createdAt,favorites:[...(state.favorites||[])],wrong:Object.fromEntries(Object.entries(state.wrong||{}).map(([id,v])=>[id,{...pick(v,WRONG_FIELDS),corrected:!!v.corrected,recentResult:['wrong','assistedCorrect','independentCorrect'].includes(v.recentResult)?v.recentResult:''}])),mastery:Object.fromEntries(Object.entries(state.mastery||{}).filter(([,v])=>['mastered','fuzzy','new'].includes(v))),reviewFlags:{...(state.reviewFlags||{})},seen:{...(state.seen||{})},learning:Object.fromEntries(Object.entries(state.learning||{}).map(([id,v])=>[id,pick(v,PROGRESS_FIELDS)]))});
}
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return ((n^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unbase64(s){if(s.length%4===1)throw Error('迁移码不完整');let decoded;try{decoded=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));}catch(e){throw Error('迁移码格式不正确');}const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));if(base64(bytes)!==s)throw Error('迁移码编码不完整');return bytes;}
async function readLimited(stream){const reader=stream.getReader(),chunks=[];let n=0;try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>MAX_BYTES){await reader.cancel();throw Error('迁移码数据过大，请使用文件备份');}chunks.push(value);}}finally{reader.releaseLock();}let all=new Uint8Array(n),offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return all;}
async function encode(data,compatible=false){const raw=new TextEncoder().encode(JSON.stringify(validate(data)));if(raw.length>MAX_BYTES)throw Error('迁移数据过大，请使用文件备份');let bytes=raw,codec='R';if(!compatible&&typeof CompressionStream==='function'&&typeof DecompressionStream==='function'){try{bytes=await readLimited(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')));codec='G';}catch(e){bytes=raw;codec='R';}}const code=`SLQ1.${codec}.${base64(bytes)}.${crc(raw)}`;if(code.length>MAX_CODE)throw Error('迁移码过长，请改用文件备份');return code;}
async function decode(input){
 if(typeof input!=='string'||input.length>MAX_CODE*2)throw Error('迁移码过长，请使用文件备份');const code=input.replace(/[\s\u200b-\u200d\ufeff]/g,'');if(code.length>MAX_CODE)throw Error('迁移码过长');const match=/^SLQ1\.([GR])\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/.exec(code);if(!match)throw Error('迁移码格式不正确，请完整复制从SLQ1开始的内容');let bytes=unbase64(match[2]);
 if(match[1]==='G'){if(typeof DecompressionStream!=='function')throw Error('此浏览器不支持压缩码，请让旧设备生成“兼容码”，或使用文件导入');try{bytes=await readLimited(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));}catch(e){if(e.message.includes('过大'))throw e;throw Error('迁移码损坏或被截断，请重新复制');}}
 if(bytes.length>MAX_BYTES)throw Error('迁移码数据过大');if(crc(bytes)!==match[3])throw Error('迁移码校验失败，内容可能被截断或改动');let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch(e){throw Error('迁移码内容无法读取');}return validate(data);
}
function preview(data){data=validate(data);return {favorites:data.favorites.length,wrong:Object.values(data.wrong).filter(w=>w.count>0).length,mastery:Object.keys(data.mastery).length,review:Object.keys(data.reviewFlags).length,seen:Object.keys(data.seen).length,progress:Object.keys(data.learning).length,createdAt:data.createdAt};}
function merge(state,data,mode='merge'){
 data=validate(data);if(!['merge','replace'].includes(mode))throw Error('导入方式无效');const out=structuredClone(state);
 out.favorites=mode==='replace'?[...data.favorites]:[...new Set([...(state.favorites||[]),...data.favorites])];
 out.mastery=mode==='replace'?{...data.mastery}:{...(state.mastery||{}),...data.mastery};
 out.reviewFlags=mode==='replace'?{...data.reviewFlags}:{...(state.reviewFlags||{})};if(mode==='merge')for(const [id,time] of Object.entries(data.reviewFlags))out.reviewFlags[id]=Math.max(out.reviewFlags[id]||0,time);
 out.seen=mode==='replace'?{...data.seen}:{...(state.seen||{})};if(mode==='merge')for(const [id,count] of Object.entries(data.seen))out.seen[id]=Math.max(out.seen[id]||0,count);
 out.wrong=mode==='replace'?structuredClone(data.wrong):structuredClone(state.wrong||{});
 if(mode==='merge')for(const [id,src] of Object.entries(data.wrong)){const local=out.wrong[id];if(!local||Math.max(src.lastWrong,src.lastCorrect)>Math.max(local.lastWrong||0,local.lastCorrect||0))out.wrong[id]={...src};if(local)out.wrong[id].wrongTotal=Math.max(local.wrongTotal||0,src.wrongTotal);}
 out.learning=structuredClone(state.learning||{});
 if(mode==='replace')for(const rec of Object.values(out.learning))for(const field of PROGRESS_FIELDS)rec[field]=0;
 for(const [id,src] of Object.entries(data.learning)){const local=out.learning[id]||{};const incoming=mode==='replace'||!state.learning?.[id]||src.last>(local.last||0);out.learning[id]={...local,...(incoming?src:{})};if(mode==='merge'){const statistics=src.attempts>(local.attempts||0)?src:local;for(const field of STATS_FIELDS)out.learning[id][field]=statistics[field]||0;for(const field of ['fillExposure','regularExposure','totalExposure'])out.learning[id][field]=Math.max(local[field]||0,src[field]);}}
 return out;
}
window.QBANK_TRANSFER={makeLite,encode,decode,preview,merge,MAX_CODE};
})();
