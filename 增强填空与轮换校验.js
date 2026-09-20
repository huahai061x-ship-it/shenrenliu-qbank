const fs=require('fs'),vm=require('vm');
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['questions.js','pedagogy.js','enhanced-fill.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const Q=ctx.window.QUESTION_BANK, standard=ctx.window.HOS_PEDAGOGY.fillBank, added=ctx.window.HOS_ENHANCED_FILL;
const full={...standard,...added}, errors=[];
if(Object.keys(standard).length!==104)errors.push('标准填空数量不是104');
if(Object.keys(full).length!==198)errors.push('增强填空总数不是198');
for(const [id,e] of Object.entries(full)){
  const q=Q.find(x=>x.id===Number(id));
  if(!q)errors.push(`#${id}不存在`);
  if(!e.stem||!e.stem.includes('______'))errors.push(`#${id}题干无填空线`);
  if(!Array.isArray(e.answers||q?.answers)||(e.answers||q?.answers).length===0)errors.push(`#${id}无答案`);
  if(q?.type==='judge'&&(!e.answers||e.answers.some(x=>x==='对'||x==='错')))errors.push(`#${id}判断改填空仍以对错作答`);
  if(e.originType==='multiple'&&JSON.stringify(e.answers)!==JSON.stringify(q.answers))errors.push(`#${id}多选改填空答案与原题不一致`);
  if(e.originType==='judge'&&q.answers[0]!=='对')errors.push(`#${id}错误判断题被直接改成填空`);
}
function clean(v){return String(v||'').normalize('NFKC').replace(/(\d)\s*[~～]\s*(\d)/g,'$1-$2').replace(/(\d)\s*(?:至|到)\s*(\d)/g,'$1-$2').replace(/\s+/g,'').replace(/[“”"'‘’。.!！?？,，、;；:：()（）\[\]【】]/g,'').toLowerCase()}
function stripFraming(v){return v.replace(/^(正确答案是|正确答案为|答案是|答案为|应填写|应填入|应为|填写|填入)/,'')}
function canonicalFillPass(answers,raw){let rest=stripFraming(clean(raw));for(const expected of answers.map(clean).sort((a,b)=>b.length-a.length)){const at=rest.indexOf(expected);if(at<0)return false;rest=rest.slice(0,at)+rest.slice(at+expected.length)}return rest.length===0}
function fillPass(entry,raw){return (entry.accepted||[]).some(x=>clean(x)===clean(raw))||canonicalFillPass(entry.answers,raw)}
for(const [id,e] of Object.entries(full)){
  const q=Q.find(x=>x.id===Number(id)),answers=e.answers||q.answers,canonical=answers.join('、');
  if(!canonicalFillPass(answers,canonical))errors.push(`#${id}标准答案不能被填空判题逻辑识别`);
  for(let missing=0;missing<answers.length;missing++)if(canonicalFillPass(answers,answers.filter((_,i)=>i!==missing).join('、')))errors.push(`#${id}漏答第${missing+1}项仍被判为正确`);
  if(canonicalFillPass(answers,canonical+'、错误内容'))errors.push(`#${id}夹带错误内容仍被判为正确`);
}
for(const [id,e] of Object.entries(full))for(const alt of e.accepted||[])if(!clean(alt))errors.push(`#${id}存在空白容错答案`);
if(!fillPass(standard[64],'人机物法')||!fillPass(standard[64],'人机料法'))errors.push('#64的“人机物法/人机料法”兼容回归失败');
if(!fillPass(added[145],'根据订单型号确定加注量、加油枪应放置稳妥，不滑脱、加注完成后清理洒落油渍'))errors.push('#145自然写法兼容回归失败');
if(clean('3～4')!==clean('3-4')||clean('3至4')!==clean('3-4'))errors.push('数字范围归一化回归失败');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('styles.css','utf8'),html=fs.readFileSync('index.html','utf8');
for(const token of ['class="quick-nav"','toggleAnswerPanel(true)','id="answerPanel"'])if(!app.includes(token))errors.push(`快捷导航结构缺少${token}`);
for(const token of ['.quick-nav','.answer-panel.open','.sheet-backdrop.open'])if(!css.includes(token))errors.push(`快捷导航样式缺少${token}`);
if(!html.includes('enhanced-fill.js'))errors.push('首页未加载增强填空题库');
const state={recent:[],usage:{}};
function pick(pool,n,blocked=new Set()){
  const recent5=new Set(state.recent.flat()),recent3=new Set(state.recent.slice(-3).flat());
  return pool.filter(q=>!blocked.has(q.id)).map(q=>({q,recent3:recent3.has(q.id)?1:0,recent5:recent5.has(q.id)?1:0,used:state.usage[q.id]||0,tie:Math.random()})).sort((a,b)=>a.recent3-b.recent3||a.used-b.used||a.recent5-b.recent5||a.tie-b.tie).slice(0,n).map(x=>x.q);
}
function pickRegular(type,n,blocked){const recent5=new Set(state.recent.flat()),recent3=new Set(state.recent.slice(-3).flat()),candidates=Q.filter(q=>q.type===type&&!blocked.has(q.id)).map(q=>({q,recent3:recent3.has(q.id)?1:0,recent5:recent5.has(q.id)?1:0,used:state.usage[q.id]||0,tie:Math.random()})).sort((a,b)=>a.recent3-b.recent3||a.used-b.used||a.recent5-b.recent5||a.tie-b.tie),out=[];for(const x of candidates){if(out.length>=n)break;const available=Q.filter(q=>full[q.id]&&!blocked.has(q.id)&&!out.some(y=>y.id===q.id)&&!recent3.has(q.id)).length;if(!x.recent3&&full[x.q.id]&&available<=20)continue;out.push(x.q)}return out}
const exams=[];
for(let round=0;round<20;round++){
  const used=new Set(),single=pickRegular('single',15,used);single.forEach(q=>used.add(q.id));
  const multi=pickRegular('multiple',10,used);multi.forEach(q=>used.add(q.id));
  const judge=pickRegular('judge',10,used);judge.forEach(q=>used.add(q.id));
  const fill=pick(Q.filter(q=>full[q.id]),20,used);fill.forEach(q=>used.add(q.id));
  const ids=[...fill,...single,...multi,...judge].map(q=>q.id);
  if(ids.length!==55||new Set(ids).size!==55)errors.push(`第${round+1}场题数或场内去重失败`);
  exams.push(ids);state.recent=[...state.recent,ids].slice(-5);for(const id of ids)state.usage[id]=(state.usage[id]||0)+1;
}
for(let i=0;i<exams.length;i++)for(let j=i+1;j<exams.length&&j-i<=3;j++){const overlap=exams[i].filter(x=>exams[j].includes(x));if(overlap.length)errors.push(`连续四场范围内第${i+1}/${j+1}场重复${overlap.length}题`)}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
const unique=new Set(exams.flat()).size;
if(unique!==507){console.error(`连续20场仅覆盖${unique}/507题`);process.exit(1)}
console.log(`校验通过：标准填空104题，增强填空198题（新增${Object.keys(added).length}题）；连续20场中任意相邻四场零重复，共覆盖${unique}道不同原题。`);
