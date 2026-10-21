const assert=require('node:assert/strict'),{boot}=require('./test-app-harness.cjs');
const x=boot(),focus=x.w.$('.question-focus'),scrolls=[];focus.scrollIntoView=()=>scrolls.push('question');x.w.$('.topbar').getBoundingClientRect=()=>({height:92});x.w.scrollTo=()=>scrolls.push('preserve');
x.w.startStudy();let html=x.main.innerHTML;
const positions=['question-focus','class="q-stem"','class="options"','question-secondary-tools','question-preferences'].map(s=>html.indexOf(s));assert(positions.every(p=>p>=0));assert(positions.every((p,i)=>!i||p>positions[i-1]));assert.equal(scrolls.at(-1),'question');assert.equal(focus.style.scrollMarginTop,'102px');assert(!html.includes('class="question-preferences" open'));
x.w.chooseOption(0);assert.equal(scrolls.at(-1),'preserve');const answer=x.t.getSession().items[0].answer;x.w.nextQ();assert.equal(scrolls.at(-1),'question');x.w.prevQ();assert.equal(x.t.getSession().items[0].answer,answer);x.w.jumpQ(9);assert.equal(scrolls.at(-1),'question');
x.w.rememberQuestionPreferences(true);x.w.nextQ();assert(x.main.innerHTML.includes('class="question-preferences" open'));x.w.setStudyScope('unmastered');let id=x.t.getSession().items.find(i=>i.q.id===x.t.getSession().items[10].q.id).q.id;x.w.setMastery(id,'mastered');assert.equal(scrolls.at(-1),'question');
// A queued scroll from an obsolete render cannot override the most recent preserve request.
let frames=[];x.c.requestAnimationFrame=f=>frames.push(f);scrolls.length=0;x.w.nextQ();x.w.chooseOption(0);for(const f of frames)f();assert.deepEqual(scrolls,['preserve']);
x.c.requestAnimationFrame=f=>f();x.w.beginRealExam();html=x.main.innerHTML;assert(!html.includes('class="question-preferences"'));assert.equal((html.match(/id="examTimer"/g)||[]).length,1);assert.equal((html.match(/id="questionTimer"/g)||[]).length,1);
console.log('PASS 题目优先DOM、辅助控制后置折叠、动态页头偏移、翻题定位、选择保留位置、答案保留、自动移除定位、过期滚动取消、考试计时');
