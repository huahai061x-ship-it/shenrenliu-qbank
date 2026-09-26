const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),zlib=require('zlib'),crypto=require('crypto');
const base='https://example.test/shenrenliu-qbank/',handlers={},stores=new Map(),fetchUrls=[];
let online=true,revision='new-image';
const urlOf=r=>new URL(typeof r==='string'?r:r.url,base).href;
class BrowserRequest extends Request{constructor(input,options){super(typeof input==='string'?urlOf(input):input,options)}}
function cache(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async put(r,response){data.set(urlOf(r),response.clone())},async match(r){return data.get(urlOf(r))?.clone()},async keys(){return [...data.keys()].map(u=>new BrowserRequest(u))}}}
const caches={open:async name=>cache(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async(r,{cacheName}={})=>cache(cacheName).match(r)};
const self={location:{origin:new URL(base).origin},clients:{async claim(){}},async skipWaiting(){},addEventListener:(name,fn)=>handlers[name]=fn};
const context={self,caches,Request:BrowserRequest,Response,URL,fetch:async request=>{fetchUrls.push(urlOf(request));if(!online)throw Error('offline');return new Response(urlOf(request).includes('/source/')?revision:'asset',{status:200})}};
vm.createContext(context);vm.runInContext(fs.readFileSync('sw.js','utf8'),context);
async function lifecycle(name){let pending;handlers[name]({waitUntil:p=>pending=p});await pending}
async function fetchImage(name='image3.webp'){let pending;handlers.fetch({request:new BrowserRequest(base+'source/'+name),respondWith:p=>pending=p});return pending}
function decodeRgba(file){const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(0),0x89504e47);const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.equal(png[24],8);assert.equal(png[25],6);let parts=[];for(let at=8;at<png.length;){let len=png.readUInt32BE(at),type=png.toString('ascii',at+4,at+8);if(type==='IDAT')parts.push(png.subarray(at+8,at+8+len));at+=len+12}const raw=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(width*height*4),stride=width*4;const paeth=(a,b,c)=>{let p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};for(let y=0;y<height;y++){let filter=raw[y*(stride+1)];for(let i=0;i<stride;i++){let at=y*stride+i,v=raw[y*(stride+1)+1+i],a=i>=4?pixels[at-4]:0,b=y?pixels[at-stride]:0,c=y&&i>=4?pixels[at-stride-4]:0;pixels[at]=(v+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255}}return {width,height,pixels}}
(async()=>{
  await cache('shenrenliu-qbank-images-v1').put(base+'source/image3.webp',new Response('old-image'));
  await lifecycle('install');assert(!fetchUrls.some(u=>u.includes('/source/')),'预缓存了原图');await lifecycle('activate');assert(!stores.has('shenrenliu-qbank-images-v1'),'旧图片缓存未清理');
  online=false;assert.equal(await (await fetchImage()).text(),'old-image','旧缓存迁移后离线图片丢失');
  online=true;assert.equal(await (await fetchImage()).text(),'new-image','在线仍读旧图');revision='updated-same-name';assert.equal(await (await fetchImage()).text(),revision,'同名图片更新未生效');
  online=false;assert.equal(await (await fetchImage()).text(),revision,'离线未回退新版缓存');assert.equal((await fetchImage('never-viewed.webp')).status,503);
  const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
  const anyHashes={192:'f3e3bb738c9c7483f599171dd62e68d6143856e0084f84cf289c13290c54cb5f',512:'acc9e7fb4d0e8b65313607ea451362581c49bbb4f525bd3f848afc03f3516765'};
  for(const size of [192,512]){
    assert(manifest.icons.some(x=>x.src===`icon-${size}.png`&&x.purpose==='any'));
    assert(manifest.icons.some(x=>x.src===`icon-${size}-maskable.png`&&x.purpose==='maskable'));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`icon-${size}.png`)).digest('hex'),anyHashes[size],'原any图标被改动');
    const icon=decodeRgba(`icon-${size}-maskable.png`);assert.equal(icon.width,size);assert.equal(icon.height,size);let mark=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){let i=(y*size+x)*4;assert.equal(icon.pixels[i+3],255,'maskable背景不透明');if(Math.min(icon.pixels[i],icon.pixels[i+1],icon.pixels[i+2])<240){mark++;assert(Math.hypot(x+.5-size/2,y+.5-size/2)<=size*.4,'品牌内容超出80%安全圆')}}
    assert(mark>size*size*.1,'maskable图标内容缺失');
  }
  console.log('v2.2.6 PWA回归通过：在线同名图更新、离线回退、旧图缓存迁移清理、零原图预缓存、any保留及两种maskable安全区。');
})().catch(e=>{console.error(e);process.exit(1)});
