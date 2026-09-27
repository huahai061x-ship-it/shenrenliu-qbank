const fs=require('fs'),assert=require('assert/strict'),{boot}=require('./scripts/test-app-harness.cjs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
let x=boot();assert(!x.main.innerHTML.includes('符号英文专项'));for(const title of ['专项背诵','专项模拟','真实模拟'])assert(x.main.innerHTML.includes(title));
assert(!app.includes('startTechnicalStudy'));assert(!app.includes('technicalQuestions'));
const counts={};
for(const type of ['single','multiple','judge','fill']){
  x=boot();x.w.$('#specialType').value=type;x.w.$('#fillLevel').value='enhanced';x.w.startSpecialRecite();
  let s=x.t.getSession();counts[type]=s.items.length;assert(s.items.length>0);assert(s.items.every(i=>i.renderType===type));assert.equal(s.mode,'special_recite');assert.equal(s.questionType,type);
  const id=s.items[0].q.id;x.w.showAnswer();assert(x.main.innerHTML.includes('正确答案'));x.w.toggleFav(id);assert(x.t.getStore().favorites.includes(id));x.w.toggleReviewFlag(id);assert(x.t.getStore().reviewFlags[id]);x.w.nextQ();x.w.prevQ();
  x=boot();x.w.$('#specialType').value=type;x.w.$('#fillLevel').value='enhanced';x.w.$('#countBtns .active').dataset.n='20';x.w.beginSpecialExam();s=x.t.getSession();
  assert.equal(s.items.length,20);assert(s.items.every(i=>i.renderType===type));assert.equal(s.mode,'special_exam');assert.equal(s.questionType,type);assert.equal(new Set(s.items.map(i=>i.q.id)).size,20);
  let snap=x.t.getStore().lastSession;assert.equal(snap.questionType,type);x.w.resumeLastSession();s=x.t.getSession();assert.equal(s.questionType,type);
  x.w.submitExam();let r=x.t.getStore().history[0];assert.equal(r.examMode,'special_exam');assert.equal(r.questionType,type);assert.equal(r.correct,0);assert(r.userAnswers.every(a=>a===null));assert(r.questionTimes.every(i=>!i.answered&&!i.correct));
  x.w.retryWrongCurrent();assert.equal(x.t.getSession().items.length,20);assert(x.main.innerHTML.includes('未作答'));assert(x.t.getSession().items.every(i=>i.renderType===type));
  const clean=x.t.sanitizeHistory([r])[0];assert.equal(clean.questionType,type);assert.equal(clean.fillLevel,r.fillLevel);assert.equal(clean.paperDamaged,false);
}
for(const level of ['standard','enhanced']){x=boot();x.w.$('#specialType').value='fill';x.w.$('#fillLevel').value=level;x.w.startSpecialRecite();assert.equal(x.t.getSession().items.length,level==='standard'?104:208);assert(x.t.getSession().items.every(i=>i.fillLevel===level))}
for(const type of ['single','multiple','judge']){x=boot();x.w.$('#specialType').value=type;x.w.$('#countBtns .active').dataset.n=String(counts[type]);x.w.beginSpecialExam();assert.equal(x.t.getSession().items.length,counts[type]);x=boot();x.w.$('#specialType').value=type;x.w.$('#countBtns .active').dataset.n=String(counts[type]+1);x.w.beginSpecialExam();assert.equal(x.t.getSession(),null)}
x=boot();x.w.$('#specialType').value='single';x.w.beginSpecialExam();x.t.getSession().strict=true;x.w.submitExam();assert(!x.t.getSession().finished);assert.equal(x.t.getStore().history.length,0);
for(const [mode,total,fill,title] of [['real',45,10,'真实模拟'],['fillStrong',55,20,'真实模拟PLUS']]){x=boot();x.w.beginRealExam(mode);const s=x.t.getSession();assert.equal(s.title,title);assert.equal(s.items.length,total);for(const [type,n] of [['single',15],['multiple',10],['judge',10],['fill',fill]])assert.equal(s.items.filter(i=>i.renderType===type).length,n)}
x=boot({history:[{mode:'真实考试模拟',examMode:'real',count:45,score:80},{mode:'纯填空模拟',examMode:'fill',count:30,score:50}],settings:{homeShortcuts:['technical','enhancedFillExam','enhancedFillStudy','wrong']}});assert.equal(x.t.getStore().history.length,2);assert.equal(x.t.getStore().history[1].mode,'纯填空模拟');assert(!x.t.getStore().settings.homeShortcuts.includes('technical'));assert(!x.t.getStore().settings.homeShortcuts.includes('enhancedFillExam'));
assert(html.includes('v2.2.9 封神版'));assert(html.includes('app.js?v=2.2.9-fengshen-r5'));assert(fs.readFileSync('sw.js','utf8').includes('v2.2.9-fengshen-r5-${BUILD_VERSION}'));
console.log('封神版专项回归通过：四题型背诵/模拟、标准104增强208、题量上限/全部、收藏复核翻题、保存恢复/新旧历史/快捷入口、未答交卷及严格模式/本场复盘、45/55结构与命名、版本与唯一缓存。',counts);
