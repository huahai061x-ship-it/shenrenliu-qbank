// Lively local mascot: no network requests, audio, popups or learning-data changes.
(() => {
'use strict';
const LINES=Object.freeze(['点击我试试吧～','学习记录和掌握地图，藏在我这里！','我是水豚噜噜，你的摸鱼搭子。','今天也慢慢来，答对一题是一题。','橘子帽戴好了，开刷！','先喝口水，再和题目碰个面。','我的帽子不是零食，不许偷吃。','你负责进步，我负责可爱。','这道题不会？先别急，回头再见。','噜噜今日计划：晒太阳，陪你刷题。','偷偷告诉你：点我有个学习小屋。','我刚发了会儿呆，你呢？','别和昨天的自己吵架，今天接着学。','学习记录我看家，错题还得你拿下。','天气不重要，橘子帽一直在线。','点点噜噜，看看你的掌握地图。']);
let nextTimer=null,hideTimer=null,lastLine=-1;
function stop(){if(nextTimer!==null)clearTimeout(nextTimer);if(hideTimer!==null)clearTimeout(hideTimer);nextTimer=hideTimer=null;const bubble=document.querySelector('#luluSpeech');bubble?.classList.add('lulu-quiet');}
function nextLine(){let i=Math.floor(Math.random()*LINES.length);if(i===lastLine)i=(i+1)%LINES.length;lastLine=i;return LINES[i];}
function active(){return !document.hidden&&!!document.querySelector('#luluHomeButton')?.isConnected;}
function show(line){const bubble=document.querySelector('#luluSpeech');if(!active()||!bubble)return;bubble.textContent=line;bubble.classList.remove('lulu-quiet');hideTimer=setTimeout(()=>{bubble.classList.add('lulu-quiet');hideTimer=null},6500);}
function schedule(){nextTimer=setTimeout(()=>{nextTimer=null;if(!active())return;show(nextLine());schedule()},22000+Math.floor(Math.random()*14000));}
function mount(){stop();if(!active())return;show('点击我试试吧～');schedule();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else mount();});
window.LULU={mount,stop,nextLine,LINES};
})();
