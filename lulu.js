// The inline preview appears immediately; optional full artwork never blocks updates.
(() => {
'use strict';
const LINES=Object.freeze(['点击我试试吧～','学习记录和掌握地图，藏在我这里！','我是水豚噜噜，你的摸鱼搭子。','今天也慢慢来，答对一题是一题。','橘子帽戴好了，开刷！','先喝口水，再和题目碰个面。','我的帽子不是零食，不许偷吃。','你负责进步，我负责可爱。','这道题不会？先别急，回头再见。','噜噜今日计划：晒太阳，陪你刷题。','偷偷告诉你：点我有个学习小屋。','我刚发了会儿呆，你呢？','别和昨天的自己吵架，今天接着学。','学习记录我看家，错题还得你拿下。','天气不重要，橘子帽一直在线。','点点噜噜，看看你的掌握地图。']);
let nextTimer=null,hideTimer=null,lastLine=-1;
function stop(){if(nextTimer!==null)clearTimeout(nextTimer);if(hideTimer!==null)clearTimeout(hideTimer);nextTimer=hideTimer=null;const bubble=document.querySelector('#luluSpeech');bubble?.classList.add('lulu-quiet');}
function nextLine(){let i=Math.floor(Math.random()*LINES.length);if(i===lastLine)i=(i+1)%LINES.length;lastLine=i;return LINES[i];}
function active(){return !document.hidden&&!!document.querySelector('#luluHomeButton')?.isConnected;}
function show(line){const bubble=document.querySelector('#luluSpeech');if(!active()||!bubble)return;bubble.textContent=line;bubble.classList.remove('lulu-quiet');hideTimer=setTimeout(()=>{bubble.classList.add('lulu-quiet');hideTimer=null},6500);}
function schedule(){nextTimer=setTimeout(()=>{nextTimer=null;if(!active())return;show(nextLine());schedule()},22000+Math.floor(Math.random()*14000));}
function imageMarkup(width,height,alt=''){const art=window.LULU_ART;return `<img src="${art?.preview||'lulu-mascot.png'}" ${art?`data-lulu-src="${art.src}"`:''} width="${width}" height="${height}" alt="${alt}" draggable="false">`;}
const pending=new Map(),ready=new Map();
function loadImages(){for(const element of document.querySelectorAll?.('img[data-lulu-src]')||[]){const src=new URL(element.dataset.luluSrc,document.baseURI).href;if(ready.has(src)){element.src=src;continue;}if(!pending.has(src)){pending.set(src,new Promise(resolve=>{const picture=new Image();picture.onload=()=>{ready.set(src,true);resolve(true);};picture.onerror=()=>resolve(false);picture.src=src;}).finally(()=>pending.delete(src)));}pending.get(src).then(ok=>{if(ok&&element.isConnected)element.src=src;});}}
function mount(){loadImages();stop();if(!active())return;window.LULU_PORTRAIT?.mount();show('点击我试试吧～');schedule();}
window.addEventListener?.('online',loadImages);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else mount();});
window.LULU={mount,stop,nextLine,LINES,imageMarkup,loadImages};
})();

(() => {
  'use strict';
  if(typeof URL!=='function'||typeof matchMedia!=='function'||!document.baseURI)return;
  const asset = new URL('media/lulu-188a3aa87a4b6676.webp',document.baseURI).href;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const style=document.querySelector('#lulu-home-motion');
  const originalStop=window.LULU.stop;
  let stage, observer, visible=false, texture, loaded=false;

  function update(){
    if(!stage)return;
    const live=visible && !document.hidden && !reduce.matches;
    stage.toggleAttribute('data-live',live && loaded);
    stage.toggleAttribute('data-layered',loaded && !reduce.matches);
    if(!live || texture)return;
    texture=new Image();
    texture.onload=()=>{loaded=true;update()};
    texture.onerror=()=>{texture=null};
    texture.src=asset;
  }
  function stop(){
    if(!stage)return;
    observer?.disconnect();observer=null;
    stage.removeAttribute('data-live');stage.removeAttribute('data-pressed');
    stage=null;visible=false;
    style.media='not all';
    document.removeEventListener('visibilitychange',update);
    window.LULU.stop=originalStop;
  }
  function leaveHome(){stop();originalStop()}
  function mount(){
    stop();
    const button=document.querySelector('#luluHomeButton');
    const picture=button?.querySelector('img');
    if(!picture)return;
    style.media='all';
    window.LULU.stop=leaveHome;
    document.addEventListener('visibilitychange',update);
    stage=button.querySelector('.lulu-scene');
    if(!stage){
      stage=document.createElement('span');
      stage.className='lulu-scene';
      stage.setAttribute('aria-hidden','true');
      stage.style.setProperty('--lulu-texture','url("'+asset+'")');
      picture.before(stage);
      stage.innerHTML='<span class="lulu-water"></span><span class="lulu-water-back"></span><span class="lulu-figure"><span class="lulu-torso"></span><span class="lulu-look"><span class="lulu-nod"><span class="lulu-head"><span class="lulu-sprout"><span></span></span><span class="lulu-eyes"><span></span></span><span class="lulu-mouth"><span></span></span></span></span></span></span><span class="lulu-wake"></span>';
      stage.prepend(picture);
      const scene=stage;
      button.addEventListener('pointerdown',event=>{
        if(event.isPrimary && event.button===0 && scene.hasAttribute('data-live'))scene.setAttribute('data-pressed','');
      },{passive:true});
      for(const event of ['pointerup','pointercancel','pointerleave','lostpointercapture','blur']){
        button.addEventListener(event,()=>scene.removeAttribute('data-pressed'),{passive:true});
      }
    }
    if('IntersectionObserver' in window){
      const current=stage;
      observer=new IntersectionObserver(entries=>{
        if(current!==stage)return;
        visible=entries[entries.length-1].isIntersecting;update();
      });
      observer.observe(stage);
    }else{
      // Keep the original illustration on browsers without viewport visibility tracking.
      visible=false;
    }
    update();
  }
  reduce.addEventListener?.('change',update);
  window.LULU_PORTRAIT={mount,stop};
})();
