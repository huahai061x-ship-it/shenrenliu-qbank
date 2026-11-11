(() => {
  'use strict';
  const C=window.STUDY_PLAN_CORE,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let A,draft=new Set(),banks=new Set(),catalog=new Map();
  const now=()=>window.BEIJING_CLOCK?.now?.()||Date.now(),today=()=>C.today(now()),store=()=>A.getStore(),plans=()=>Object.values(store().learningPlans||{}),label=q=>(q.bankName||'HOS 应知应会')+' · 原题 '+(q.sourceQuestionId||q.id)+(needsReview(q)?' · 待核验':''),qmap=()=>new Map(A.questions().map(q=>[C.questionKey(q),q]));
  const header=(title,subtitle)=>`<div class="section-title"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="btn" onclick="navHome()">返回首页</button></div>`;
  const theory=()=>`<details class="panel plan-theory"><summary>这个计划怎样安排复习？</summary><p>遗忘通常在初学后更快。先独立回想，再核对答案；复习顺序是到期旧题在前、新题在后。新计划答错约10分钟后再试，第二次仍忘记就留到次日；看提示后答对也会在次日再见。</p><p>独立答对后，间隔从约1、2、4、7、14到30天逐步拉长；同一天反复答对不会虚增间隔。新计划按选定的每日新题上限安排，漏学的新题分日补，已学题按到期日复习。目标日期后仍可继续巩固。旧计划沿用原来的截止日安排。短计划会压缩能安排的轮次；来不及形成长期记忆时会明确提醒。</p><p>这些是参考间隔练习与主动回忆研究的起始安排，并非人人一致的固定遗忘百分比。每天以实际作答更新，漏做的题留到今天，不会假装完成。</p><p><a href="https://doi.org/10.1111/j.1467-9280.2008.02209.x" target="_blank" rel="noopener">间隔与目标保留时间研究（Cepeda等，2008）</a> · <a href="https://doi.org/10.1126/science.1152408" target="_blank" rel="noopener">主动回忆研究（Karpicke与Roediger，2008）</a></p></details>`;
  function home(){const day=today(),due=plans().reduce((n,p)=>n+C.tasks(p,day,now()).length,0);return `<section class="panel plan-home"><div class="plan-home-icon" aria-hidden="true">🗓️</div><div><h2>定制计划</h2><p>${due?`今天有 ${due} 项学习任务，按安排慢慢来。`:'选好题目和日期，每天的新题与复习替你排好。'}</p></div><button class="btn primary" onclick="STUDY_PLANS.open()">${plans().length?'查看我的计划':'定制我的计划'}</button></section>`;}
  function open(){if(!A)return;const day=today();A.show(header('定制计划','按北京时间安排，每次主动回忆后更新复习日期。')+`<div class="q-actions"><button class="btn primary" onclick="STUDY_PLANS.createForm()">新建学习计划</button></div>${batchControl()}<div class="plan-list">${plans().sort((a,b)=>b.createdAt-a.createdAt).map(p=>{const tasks=C.tasks(p,day,now()),s=Object.values(C.states(p,day)),learned=s.filter(x=>x.introduced).length;return `<article class="panel pad"><h3>${esc(p.title)}</h3><p>${p.start} 至 ${p.end} · ${p.keys.length} 题 · 已开始 ${learned} 题</p><p class="muted">${day<p.start?'还未到开始日期':day>p.end?'目标日已过，可继续巩固与补学':`今天待学 ${tasks.length} 题（含未完成任务）`}</p><div class="q-actions"><button class="btn primary" onclick="STUDY_PLANS.start('${p.id}')" ${!tasks.length||day<p.start?'disabled':''}>${actionLabel(p)}</button><button class="btn" onclick="STUDY_PLANS.detail('${p.id}')">查看每日安排</button><button class="btn small" onclick="this.hidden=true;this.nextElementSibling.hidden=false">移除计划</button><span hidden><span>保留所有作答与成绩，只移除此计划？</span><button class="btn danger small" onclick="STUDY_PLANS.remove('${p.id}')">确认移除</button><button class="btn small" onclick="this.parentElement.hidden=true;this.parentElement.previousElementSibling.hidden=false">取消</button></span></div></article>`;}).join('')||'<div class="panel pad"><h3>从一个能坚持的小计划开始</h3><p>选好题库，再定一周、两周或自己的目标日期。每一天都能看到要学哪几题、复习第几遍。</p></div>'}</div>`+theory());}
  const el=id=>document.getElementById(id);
  const needsReview=q=>q?.analysis?.status==='needs_source';
  let candidate=null, matches=[],pickerPage=0,calendarRows=[],calendarLookup;
  const PAGE=30,BATCHES=[20,30,40,50];let batchPreference=30;
  try{const n=Number(localStorage.getItem('shenrenliu_plan_batch_v1'));if(BATCHES.includes(n))batchPreference=n;}catch{}
  const batchSize=()=>batchPreference;
  const actionLabel=p=>Object.values(p.events||{}).some(e=>e.day===today())?'继续今日计划':today()>p.end?'继续巩固':'开始今天的学习';
  const batchControl=(id='')=>`<label class="plan-batch-control">每轮 <select class="btn" aria-label="每轮题量" onchange="STUDY_PLANS.setBatch(this.value,'${id}')">${BATCHES.map(n=>`<option value="${n}" ${n===batchSize()?'selected':''}>${n} 题</option>`).join('')}</select></label>`;
  function setBatch(value,id){const n=Number(value);if(!BATCHES.includes(n))return;batchPreference=n;try{localStorage.setItem('shenrenliu_plan_batch_v1',String(n))}catch{A.toast('本轮题量已调整；本机暂时无法保存偏好')}id?detail(id):open();}
  function createForm(){
    catalog=qmap();banks=new Set(A.bankIds());candidate=null;pickerPage=0;
    draft=new Set([...catalog].filter(([,q])=>banks.has(q.bankId||'hos_2026')).map(([key])=>key));
    const groups=new Map();for(const q of catalog.values()){
      const id=q.bankId||'hos_2026';if(!groups.has(id))groups.set(id,{name:q.bankName||'HOS 应知应会',count:0});
      groups.get(id).count++;
    }
    const choices=[...groups].map(([id,g])=>`<label><input type="checkbox" data-plan-bank="${esc(id)}" ${banks.has(id)?'checked':''} onchange="STUDY_PLANS.bankChanged(this)"><span>${esc(g.name)} · ${g.count}题</span></label>`).join('');
    const topics=[...new Map([...catalog.values()].filter(q=>q.contentGroup).map(q=>[q.contentGroup,q.contentGroupName]))];
    A.show(header('新建学习计划','勾选题库即可纳入全部题目，也可以展开细选。')+`<form id="planForm" class="panel pad" onsubmit="event.preventDefault();STUDY_PLANS.preview()" oninput="STUDY_PLANS.invalidate()">
    <fieldset class="plan-banks"><legend>选择题库 · 可多选</legend>${choices}</fieldset>
    <p id="planSelectionCount" role="status"></p><details class="plan-theory" ontoggle="if(this.open) STUDY_PLANS.filter()"><summary>细选题目或按分类调整</summary>
      <div class="plan-filter"><label class="field">查找题目<input id="planSearch" type="search" placeholder="题干、原题号或知识点" oninput="STUDY_PLANS.filter()"></label><label class="field">内容分类<select id="planTopic" onchange="STUDY_PLANS.filter()"><option value="all">全部内容</option>${topics.map(([id,n])=>`<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select></label></div>
      <div class="q-actions"><button type="button" class="btn small" onclick="STUDY_PLANS.selectVisible(true)">加入筛选结果</button><button type="button" class="btn small" onclick="STUDY_PLANS.selectVisible(false)">移出筛选结果</button></div><div id="planQuestions" class="plan-question-picker"></div><div id="planPages" class="q-actions"></div></details>
    <div class="plan-form-grid"><label class="field">计划名称<input id="planTitle" maxlength="80" value="我的学习计划" required></label><label class="field">开始日期（北京时间）<input id="planStart" type="date" value="${today()}" min="${today()}" onchange="STUDY_PLANS.periodChanged()" required></label><label class="field">计划周期<select id="planPeriod" onchange="STUDY_PLANS.periodChanged()"><option value="7">一周（7天）</option><option value="14" selected>两周（14天）</option><option value="28">四周（28天）</option><option value="custom">自定截止日期</option></select></label><label class="field">目标日期<input id="planEnd" type="date" value="${C.add(today(),13)}" min="${today()}" onchange="STUDY_PLANS.periodChanged()" readonly required></label><label class="field">每日安排<select id="planPace" onchange="STUDY_PLANS.periodChanged()"><option value="auto">按目标日期自动分配</option><optgroup label="按每天可用时间">${[10,15,30,60].map(m=>`<option value="minutes-${m}">每天 ${m} 分钟</option>`).join('')}</optgroup><optgroup label="按每日新题量">${[10,20,40].map(n=>`<option value="${n}">最多 ${n} 道新题</option>`).join('')}</optgroup></select></label></div>
    <p id="planPaceInfo" class="muted"></p><p id="planError" role="alert"></p><button class="btn primary" type="submit">生成每日安排预览</button></form><section id="planPreview"></section>`+theory());count();
  }
  function invalidate(){candidate=null;el('planPreview')?.replaceChildren();}
  function bankChanged(input){
    const id=input.dataset.planBank;
    if(input.checked)banks.add(id);else banks.delete(id);
    for(const [key,q] of catalog)if((q.bankId||'hos_2026')===id)input.checked?draft.add(key):draft.delete(key);
    if(el('planQuestions').closest('details').open)filter();else count();
  }
  function filter(){
    const term=el('planSearch').value.trim().toLowerCase(),topic=el('planTopic').value;
    matches=[...catalog].filter(([,q])=>banks.has(q.bankId||'hos_2026')&&(topic==='all'||q.contentGroup===topic)&&(!term||String(q.sourceQuestionId||q.id)===term||[q.stem,...q.tags||[]].join(' ').toLowerCase().includes(term)));
    pickerPage=0;paintPicker();count();
  }
  function paintPicker(){
    const start=pickerPage*PAGE;
    el('planQuestions').innerHTML=matches.slice(start,start+PAGE).map(([key,q])=>`<label class="plan-question-row"><input type="checkbox" data-plan-key="${esc(key)}" ${draft.has(key)?'checked':''} onchange="STUDY_PLANS.toggle(this.dataset.planKey,this.checked)"><span><small>${esc(label(q))}</small><span>${esc(q.stem)}</span></span></label>`).join('')||'<p>没有符合条件的题目。</p>';
    el('planPages').innerHTML=matches.length>PAGE?`<button type="button" class="btn small" ${pickerPage?'':'disabled'} onclick="STUDY_PLANS.page(-1)">上一页</button><span>${pickerPage+1} / ${Math.ceil(matches.length/PAGE)}</span><button type="button" class="btn small" ${start+PAGE<matches.length?'':'disabled'} onclick="STUDY_PLANS.page(1)">下一页</button>`:'';
  }
  function page(n){pickerPage=Math.min(Math.max(pickerPage+n,0),Math.max(0,Math.ceil(matches.length/PAGE)-1));paintPicker();el('planQuestions').scrollTop=0;}
  function toggle(key,on){on?draft.add(key):draft.delete(key);count();}
  function selectVisible(on){for(const [key] of matches)on?draft.add(key):draft.delete(key);paintPicker();count();}
  function budget(){
    const value=el('planPace').value;
    if(!value.startsWith('minutes-'))return null;
    const dailyMinutes=Number(value.slice(8));
    const history=store().learning||{};
    const time=C.estimateTime([...draft].map(key=>history[catalog.get(key)?.id]));
    return {dailyMinutes,...time,dailyNew:Math.floor(dailyMinutes*60/time.secondsPerTask)};
  }
  function pace(){return el('planPace').value==='auto'?C.suggestedNew(draft.size,el('planStart').value,el('planEnd').value):Number(el('planPace').value);}
  function periodChanged(){
    const period=el('planPeriod').value,start=el('planStart').value;el('planEnd').readOnly=period!=='custom';el('planEnd').min=start;
    if(start&&period!=='custom')el('planEnd').value=C.add(start,Number(period)-1);
    count();
  }
  function count(){
    invalidate();
    const pending=[...draft].filter(key=>needsReview(catalog.get(key))).length;
    el('planSelectionCount').textContent=`已选 ${draft.size} 题${pending?' · 含 '+pending+' 道待核验题':''}`;
    const time=budget();
    if(time){
      el('planPaceInfo').textContent=draft.size?`每次约 ${time.secondsPerTask} 秒（${time.personal?'按所选题目的作答记录':'暂无足够的计时记录，暂按作答 30 秒'}，另留 15 秒看解析）。每天约 ${time.dailyNew} 次新学或复习。`:'';
      return;
    }
    try{const span=C.ordinal(el('planEnd').value)-C.ordinal(el('planStart').value)+1,limit=pace(),over=Math.max(0,draft.size-span*limit);
      el('planPaceInfo').textContent=draft.size&&span>0?`每天最多 ${limit} 道新题，到期复习另计，每轮最多 ${BATCH} 题。${over?'按此节奏，截止时至少有 '+over+' 道新题尚未开始；可延长周期、调高题量或在目标日后继续。':''}`:'';
    }catch(_){el('planPaceInfo').textContent='';}
  }
  function preview(){
    const err=el('planError');try{
      if(plans().length>=24)throw Error('最多保留24个计划，请先移除已结束的旧计划');
      if(!draft.size)throw Error('请至少选择一个有可学习题目的题库，或在细选中加入题目');
      const start=el('planStart').value,end=el('planEnd').value;if(start<today())throw Error('开始日期不能早于今天');
      const uid=globalThis.crypto?.randomUUID?.()?.replaceAll('-','')||Date.now().toString(36)+Math.random().toString(36).slice(2);
      const time=budget();
      if(time&&!time.dailyNew)throw Error('按当前作答用时，每天的时间不足一次练习，请增加每日分钟数或按题量安排。');
      candidate=C.create({id:'plan_'+uid,title:el('planTitle').value,keys:C.orderedKeys([...draft].map(k=>catalog.get(k))),start,end,...(time||{dailyNew:pace()}),now:now()});
      err.textContent='';const forecast=C.schedule(candidate,start,!!time);
      const box=el('planPreview'),calendar=calendarMarkup(candidate,start,forecast.rows),peak=Math.max(...calendarRows.map(r=>r.items.length)),span=C.ordinal(end)-C.ordinal(start)+1;
      const summary=time
        ? `每天 ${time.dailyMinutes} 分钟，按每天完成安排且独立答对估算，到 ${end} 可学到 ${forecast.coveredAtEnd} / ${candidate.keys.length} 道原题。预计 ${forecast.firstPass} 完成所选题目的首轮学习。${forecast.firstPass>end?'到目标日后仍可继续这个计划。':''}目标日前最忙的一天约 ${peak} 次新学和复习。`
        : `共 ${candidate.keys.length} 题，每日新题上限 ${candidate.dailyNew}。按每天独立答对估计，最忙的一天约有 ${peak} 道新学和复习任务，可分轮完成。`;
      box.innerHTML=`<div class="notice"><h3>${esc(candidate.title)} · ${span}天</h3><p>${summary}</p><button class="btn primary" onclick="STUDY_PLANS.saveCandidate()">确认保存这个计划</button></div>${calendar}`;
      box.scrollIntoView({block:'start',behavior:'auto'});
    }catch(e){invalidate();err.textContent=e.message;}
  }
  function calendarMarkup(p,from,rows=C.calendar(p,from)){
    calendarLookup=qmap();calendarRows=rows;
    return `<div class="plan-calendar">${calendarRows.map((row,i)=>{const n=row.items.filter(s=>!s.introduced).length;return `<details class="panel plan-day" ontoggle="if(this.open)STUDY_PLANS.openDay(this,${i})"><summary><b>${row.day}${row.day===today()?' · 今天':''}</b><span>新题 ${n} · 复习 ${row.items.length-n}</span></summary><div class="plan-day-items"></div></details>`;}).join('')}</div>`;
  }
  function openDay(details,index,limit=30){
    const row=calendarRows[index],list=details.querySelector('.plan-day-items');
    if(!row||!list)return;
    list.innerHTML=`<ol>${row.items.slice(0,limit).map(s=>{const q=calendarLookup.get(s.key);return `<li><span class="tag">${s.introduced?'第 '+(s.repetitions+1)+' 遍':'初学'}</span><b>${esc(q?label(q):s.key)}</b><p>${esc(q?.stem||'请加载相同题库。')}</p></li>`;}).join('')||'<li>当天暂无到期题。</li>'}</ol>${row.items.length>limit?`<button class="btn small" onclick="STUDY_PLANS.openDay(this.closest('details'),${index},${limit+30})">再显示30题</button>`:''}`;
  }
  function saveCandidate(){if(!candidate)return A.toast('请按当前设置重新预览');const p=candidate;store().learningPlans||={};store().learningPlans[p.id]=p;if(!A.save()){delete store().learningPlans[p.id];return;}candidate=null;detail(p.id);A.toast('计划已保存');}
  function detail(id){const p=store().learningPlans?.[id];if(!p)return open();const day=today(),lookup=qmap(),tasks=C.tasks(p,day,now()),waiting=Object.values(C.states(p,day)).filter(s=>s.retryAt>now()),retryAt=waiting.length?Math.min(...waiting.map(s=>s.retryAt)):0;A.show(header(p.title,`${p.start} 至 ${p.end} · ${p.keys.length} 题`)+`<div class="q-actions plan-start-actions"><button class="btn" onclick="STUDY_PLANS.open()">全部计划</button>${batchControl(id)}<button class="btn primary" onclick="STUDY_PLANS.start('${id}')" ${tasks.length&&day>=p.start?'':'disabled'}>${actionLabel(p)}（本轮${Math.min(batchSize(),tasks.length)}题）</button></div>${retryAt?`<div class="notice">刚才忘记的题将在北京时间 ${new Date(retryAt+8*3600000).toISOString().slice(11,16)} 起陆续到期。<button class="btn small" onclick="STUDY_PLANS.detail('${id}')">刷新任务</button></div>`:''}<div class="notice">${p.dailyMinutes?`每天 ${p.dailyMinutes} 分钟，约 ${p.dailyNew} 次新学和复习；超过当日预算的任务顺延。`:'先复习到期与错题，再学新题。'}答对后安排下一次回忆；只翻页或看答案不会算作完成。未来安排按独立答对估计，实际题量会随表现变化。${day>p.end?'已超过目标日，可继续按到期日期巩固。':''}</div>${Object.values(p.events).length?`<details class="panel plan-theory"><summary>已完成的回忆记录（${Object.keys(p.events).length}次）</summary><ol>${Object.entries(p.events).sort((a,b)=>b[1].at-a[1].at).slice(0,100).map(([,e])=>`<li>${e.day} · ${esc(lookup.has(e.key)?label(lookup.get(e.key)):e.key)} · ${{remembered:'独立想起',assisted:'提示后想起',again:'还没记住'}[e.rating]}</li>`).join('')}</ol></details>`:''}${day>p.end?`<section class="panel pad"><h3>今天已到期 ${tasks.length} 题</h3><ol>${tasks.map(s=>`<li>${esc(lookup.has(s.key)?label(lookup.get(s.key)):s.key)}</li>`).join('')}</ol></section>`:calendarMarkup(p,day)}${theory()}`);}
  function start(id){const p=store().learningPlans?.[id];if(!p)return A.toast('计划不存在，请回首页重新查看');const tasks=C.tasks(p,today(),now());if(!tasks.length){detail(id);return A.toast('暂时没有到期任务，可查看下次复习安排');}const lookup=qmap();if(tasks.slice(0,batchSize()).some(s=>!lookup.has(s.key)))return A.toast('需要的题库未加载，请先导入相同题库，原计划仍保留');A.start(tasks.slice(0,batchSize()).map(s=>lookup.get(s.key)),id);}
  function remove(id){const p=store().learningPlans?.[id];if(!p)return;delete store().learningPlans[id];if(!A.save()){store().learningPlans[id]=p;return;}open();}
  function recordQuestion(q,rating,eventId){const key=C.questionKey(q);for(const p of plans()){if(!p.keys.includes(key)||today()<p.start)continue;store().learningPlans[p.id]=C.record(p,{id:eventId,key,rating,at:now()});}}
  window.STUDY_PLANS={attach(adapter){A=adapter;},home,open,setBatch,createForm,bankChanged,periodChanged,openDay,invalidate,page,filter,toggle,selectVisible,preview,saveCandidate,detail,start,remove,recordQuestion};
})();
