const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

async function main() {
  const [oldDir, newDir] = process.argv.slice(2).map(p => path.resolve(p));
  if (!oldDir || !newDir) throw Error('Supply the old and new built dist directories.');
  const release = dir => JSON.parse(fs.readFileSync(path.join(dir,'release.json'),'utf8'));
  const oldVersion=release(oldDir).version, newRelease=release(newDir);
  assert.notEqual(oldVersion,newRelease.version);
  let dir=oldDir, badAsset=false, corrupted=0;
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const rel=decodeURIComponent(url.pathname).replace(/^\/shenrenliu-qbank\//,'') || 'index.html';
    const file=path.resolve(dir,rel);
    if(!file.startsWith(dir+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
    if(badAsset&&url.searchParams.has('__build')&&rel.endsWith('/banks/sinotruk-culture-official.js')){
      corrupted++;return res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end('<html>过期代理响应</html>');
    }
    const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json','.html':'text/html','.json':'application/json'};
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox','--disable-gpu']});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    const home='http://127.0.0.1:'+server.address().port+'/shenrenliu-qbank/?banks=sinotruk_culture_2025_official';
    const ready=async version=>p.waitForFunction(v=>!!(window.BANK_RUNTIME?.app&&navigator.serviceWorker.controller&&document.querySelector('meta[name="build-version"]').content===v),version,{timeout:60000});
    await p.goto(home);await ready(oldVersion);
    await p.waitForFunction(()=>PWA_INSTALL.state.updateStatus==='latest'&&!PWA_INSTALL.state.checking);
    const exam=await p.evaluate(()=>{
      renderRealExamSetup();beginRealExam();chooseOption(0);
      const s=BANK_RUNTIME.app.getSession();return {id:s.paperId,answer:s.items[0].answer};
    });
    dir=newDir;badAsset=true;
    await p.evaluate(()=>PWA_INSTALL.checkUpdate({manual:true}));
    await p.waitForFunction(()=>PWA_INSTALL.state.updateStatus==='error'&&!PWA_INSTALL.state.checking);
    assert(corrupted>=2);assert.equal(await p.locator('#requiredUpdate').isVisible(),false);
    assert.equal(await p.evaluate(()=>PWA_INSTALL.state.currentVersion),oldVersion);
    assert(!await p.evaluate(async version=>(await caches.keys()).some(k=>k.endsWith('-'+version)),newRelease.version));
    badAsset=false;
    await p.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
    await p.locator('#requiredUpdate').waitFor({state:'visible',timeout:60000});
    assert.equal(await p.locator('#requiredUpdateTitle').innerText(),newRelease.announcement.title);
    const saved=await p.evaluate(()=>{
      const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('simulated quota');};
      try{return applyPwaUpdate();}finally{Storage.prototype.setItem=original;}
    });
    assert.equal(saved,false);assert.equal(await p.evaluate(()=>PWA_INSTALL.state.reloadRequested),false);
    await Promise.all([p.waitForEvent('load'),p.locator('#requiredUpdateButton').click()]);
    await ready(newRelease.version);
    assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getStore().lastSession.paperId),exam.id);
    assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getStore().lastSession.answers[0]),exam.answer);
    await p.locator('#homeReleaseNote').waitFor({state:'visible'});
    await p.locator('#homeReleaseNote summary').click();
    assert.deepEqual(await p.locator('#homeReleaseNote li').allTextContents(),newRelease.announcement.items);
    await p.locator('#homeReleaseNote button').click();await p.reload();await ready(newRelease.version);
    await p.waitForFunction(()=>PWA_INSTALL.state.updateStatus==='latest'&&!PWA_INSTALL.state.checking);
    assert.equal(await p.locator('#homeReleaseNote').isVisible(),false);
    await ctx.setOffline(true);assert.equal(await p.evaluate(()=>PWA_INSTALL.checkUpdate({manual:true})),'offline');
    await p.reload();await ready(newRelease.version);
    await p.evaluate(()=>resumeLastSession());
    assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getSession().items.length),45);
    assert.equal(await p.evaluate(()=>BANK_RUNTIME.app.getSession().items[0].answer),exam.answer);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({oldVersion,newVersion:newRelease.version,corruptedRetries:corrupted,result:'错批200响应不激活、旧卷保留、重回前台发现公告、保存失败阻止更新、同源升级和离线恢复、公告已读持久化通过。'}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
