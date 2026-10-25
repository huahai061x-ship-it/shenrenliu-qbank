const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/86151/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||path.join(root,'../../outputs/interaction-layout-2026-10-26'));
fs.mkdirSync(out,{recursive:true});
const old={};for(const name of ['app.js','styles.css','index.html'])old[name]=cp.execFileSync('git',['show','7cb67a5:'+name],{cwd:root});
const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),before=name.startsWith('before/');if(before)name=name.slice(7);name||='index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(before&&old[name]?old[name]:fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),results=[],errors=[],layouts=[],timings={};
try{
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'}),p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.clock.setFixedTime(new Date('2026-10-26T14:00:00+08:00'));
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const ready=async()=>{await p.waitForFunction(()=>!!window.BANK_RUNTIME?.app);await settle();};
 await p.goto(base+'?banks=hos_2026');await ready();
 for(const width of [320,350,360,375,390,430,560,600,720,768,820,1024,1280,1440]){
  await p.setViewportSize({width,height:width>=768?900:844});await settle();
  const m=await p.evaluate(()=>{const boxes=[...document.querySelectorAll('.top-actions .btn')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,right:r.right}}),head=document.querySelector('.topbar').getBoundingClientRect(),brand=document.querySelector('.brand').getBoundingClientRect(),actions=document.querySelector('.top-actions').getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerHeight:head.height,overlap:brand.right>actions.left+1&&brand.top===actions.top,boxes,version:document.querySelector('#siteVersionLine').innerText};});
  assert(m.scrollWidth<=width,JSON.stringify(m));assert.equal(new Set(m.boxes.map(b=>Math.round(b.y))).size,1,JSON.stringify(m));assert(m.boxes.every(b=>b.x>=0&&b.right<=width),JSON.stringify(m));assert(!m.overlap,JSON.stringify(m));assert(m.headerHeight<=(width<=350?170:135),JSON.stringify(m));assert(m.version.includes('v3.0'));layouts.push(m);
  if([320,390,820,1440].includes(width))await p.screenshot({path:path.join(out,`首页-${width}.png`)});
 }
 assert.equal(await p.locator('[data-beijing-clock]').count(),0);assert.equal(await p.locator('.home-text-links button').count(),0);
 assert.equal(await p.evaluate(()=>BEIJING_CLOCK.parts(Date.UTC(2026,9,25,23,1)).hour),7);
 results.push('14种宽度的四个工具图标同排、无横向溢出、版本时间可见；首页去除重复入口与可见时钟，内部北京时间继续工作');
 await p.setViewportSize({width:390,height:844});await p.locator('#luluHomeButton').click();await settle();
 const before=await p.evaluate(()=>JSON.stringify(BANK_RUNTIME.app.getStore()));
 assert.equal(await p.locator('.lulu-room-entries .mode-card').count(),3);const note=await p.locator('#luluOrangeNote').innerText();await p.getByRole('button',{name:'再抽一句',exact:true}).click();assert.notEqual(await p.locator('#luluOrangeNote').innerText(),note);assert.equal(await p.evaluate(()=>JSON.stringify(BANK_RUNTIME.app.getStore())),before);
 await p.screenshot({path:path.join(out,'噜噜小屋-390.png'),fullPage:true});
 await p.locator('[onclick="openLuluPage(\'history\')"]').click();await p.getByRole('button',{name:'返回噜噜小屋',exact:true}).click();await p.locator('[onclick="openLuluPage(\'mastery\')"]').click();await p.getByRole('button',{name:'返回噜噜小屋',exact:true}).click();
 results.push('噜噜小屋三入口可达、学习记录与地图可返回；橘子签点换不连句、不更改学习记录');
 await p.evaluate(()=>{navHome(true);startStudy('sequence')});await settle();
 await p.evaluate(()=>{window.__stableCard=document.querySelector('.question-card');window.__stableOption=document.querySelector('.option');document.querySelector('.pre-confidence').open=true;});
 const y=await p.evaluate(()=>scrollY),startAnswer=await p.evaluate(()=>__V22_TEST__.getSession().items[0].answer);
 await p.locator('.option').first().click();await settle();
 assert(await p.evaluate(()=>window.__stableCard===document.querySelector('.question-card')&&window.__stableOption===document.querySelector('.option')));assert.equal(await p.locator('.option').first().getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.pre-confidence').getAttribute('open'),'');
 assert(Math.abs(await p.evaluate(()=>scrollY)-y)<2);assert.notEqual(await p.evaluate(()=>__V22_TEST__.getSession().items[0].answer),startAnswer);
 await p.evaluate(()=>checkStudy());await settle();assert.equal(await p.locator('.immediate-feedback').count(),1);const qid=await p.evaluate(()=>__V22_TEST__.getSession().items[0].q.id);await p.evaluate(id=>setMastery(id,'mastered'),qid);await settle();assert.equal(await p.locator('.sheet-item').first().getAttribute('data-mastery'),'mastered');assert.equal(await p.locator('.sheet-mastery-mark').count(),0);assert(!await p.locator('.sheet-legend').innerText().then(t=>t.includes('✓')));
 await p.evaluate(()=>nextQ());await settle();await p.evaluate(()=>prevQ());await settle();assert.equal(await p.locator('.option[aria-pressed="true"]').count(),1);
 results.push('实际点击仅更新选项和当前题格，保留节点、焦点区、展开状态与滚动；提交、判分、掌握底色及前后翻题答案保留');
 await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>{navHome(true);startStudy('sequence',BANK_RUNTIME.ctx.questions.filter(q=>q.type==='multiple'));revealStudyOptions();});await settle();
 await p.locator('.answer-sheet').evaluate(e=>{e.scrollTop=500;e.dispatchEvent(new Event('scroll'))});const sheetY=await p.locator('.answer-sheet').evaluate(e=>e.scrollTop);assert(sheetY>0);
 await p.locator('.option').first().click();await p.locator('.option').nth(1).click();await settle();assert.equal(await p.locator('.option[aria-pressed="true"]').count(),2);assert.equal(await p.locator('.answer-sheet').evaluate(e=>e.scrollTop),sheetY);await p.locator('.option').first().click();assert.equal(await p.locator('.option[aria-pressed="true"]').count(),1);
 await p.evaluate(()=>{setMastery(__V22_TEST__.getSession().items[1].q.id,'mastered');jumpQ(1)});await settle();await p.screenshot({path:path.join(out,'平板答题卡-1280.png')});
 results.push('多选点选与取消正确，长答题卡手动位置保留；掌握只用底色、当前题外框与对错边框独立');
 await p.evaluate(()=>{navHome(true);renderRealExamSetup();beginRealExam();});await settle();await p.locator('.option').first().click();const exam=await p.evaluate(()=>({answer:__V22_TEST__.getSession().items[0].answer,id:__V22_TEST__.getSession().paperId}));assert((await p.locator('.sheet-progress').innerText()).startsWith('已答 1/'));await p.reload();await ready();await p.evaluate(()=>resumeLastSession());await settle();assert.equal(await p.evaluate(()=>__V22_TEST__.getSession().items[0].answer),exam.answer);assert.equal(await p.evaluate(()=>__V22_TEST__.getSession().paperId),exam.id);
 results.push('考试选项即时更新已答数量，刷新后原卷身份与选择恢复，未延后关键保存');
 await p.evaluate(()=>navHome(true));await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>openSettings());assert.equal(await p.locator('#settingsModal .modal-card').evaluate(e=>getComputedStyle(e).animationName),'none');await p.locator('#settingsModal .modal-head button').click();await p.emulateMedia({reducedMotion:'no-preference'});
 await p.addStyleTag({content:'.brand{font-size:18px!important}.brand .brand-version{font-size:13px!important}'});await p.setViewportSize({width:390,height:844});await settle();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 results.push('减少动态效果时关闭动画；放大文字下无横向溢出');
 // Identical local desktop engine comparison; these are handler timings, not real-device benchmarks.
 if(!process.env.LIVE_URL)for(const variant of ['before','after']){await p.goto((variant==='before'?base+'before/':base)+'?banks=hos_2026');await ready();timings[variant]=await p.evaluate(()=>{startStudy('sequence',BANK_RUNTIME.ctx.questions.filter(q=>q.type==='multiple'));revealStudyOptions();const samples=[];for(let i=0;i<12;i++){const t=performance.now();chooseOption(i%4);samples.push(performance.now()-t)}return {medianMs:samples.sort((a,b)=>a-b)[6],samplesMs:samples}});}
 for(const device of [{name:'手机触控',width:375,height:812,mobile:true},{name:'平板触控',width:1024,height:768,mobile:false}]){const touch=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:true,isMobile:device.mobile,serviceWorkers:'block'}),tp=await touch.newPage();tp.on('pageerror',e=>errors.push(e.message));await tp.clock.setFixedTime(new Date('2026-10-26T14:00:00+08:00'));await tp.goto(base+'?banks=hos_2026');await tp.waitForFunction(()=>!!window.BANK_RUNTIME?.app);assert(await tp.evaluate(()=>matchMedia('(pointer:coarse)').matches));await tp.evaluate(()=>startStudy('sequence'));await tp.locator('.option').first().tap();assert.equal(await tp.locator('.option').first().getAttribute('aria-pressed'),'true');assert(await tp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await tp.locator('.quick-nav button').last().tap();assert.equal(await tp.locator('.question-position').innerText(),'2 / 507');await touch.close();}results.push('手机与平板触控环境实际tap可选择和翻题，触摸悬停不覆盖选中状态');
 assert.deepEqual(errors,[]);const report={base,results,layouts,timings,errors,limitations:'本机Edge引擎尺寸与触控模拟，不代表夸克、微信、QQ或真实平板实测'};fs.writeFileSync(path.join(out,process.env.LIVE_URL?'live-browser-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:results.length,timings,errors},null,2));
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
