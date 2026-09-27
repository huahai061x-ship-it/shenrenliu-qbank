const assert=require('assert/strict'),fs=require('fs');
const {boot}=require('./scripts/test-app-harness.cjs');
const {w,t}=boot(),Q=w.QUESTION_BANK,q=id=>Q.find(x=>x.id===id),json=v=>JSON.parse(JSON.stringify(v));
const checks=[
 [55,13,'options',3,'送交质检部门','送交质量部门'],
 [76,18,'options',2,'工厂各车间负责人','工三各车间负责'],
 [127,32,'stem',null,'严禁厂家混用','严禁三家混用'],
 [146,36,'options',0,'工件上方','工作上方'],
 [151,37,'stem',null,'再进行打紧，在打紧过程中套筒与螺栓（ ）。','再进行打'],
 [169,41,'options',0,'亏折','弓折'],
 [170,42,'options',0,'插接到位，不得漏气','插接到位，不得漏插'],
 [170,42,'options',1,'管路无亏折干涉碰磨现象','管路无弓折干涉碰磨现象'],
 [171,42,'options',0,'亏折','弓折'],
 [179,44,'stem',null,'进入厂区','进入矿区'],
 [241,58,'options',2,'问题可视化，便于监督管理','问题可视化，便于监督管理(正太公案)'],
 [243,59,'options',2,'人事等有关基本厂规的事项','人事等有人基本厂规的事项'],
 [297,71,'options',3,'零件图片','零件图月'],
 [305,73,'options',3,'工装用完擦净交回工装库。','工装用完控净交回工装库。'],
 [362,83,'stem',null,'设备使用时，应严格按照设备使用要求，严禁经验行事。','处理现场异常时严禁经验行事。'],
 [368,84,'stem',null,'生产关注重点','生产作业重点'],
 [402,90,'stem',null,'实现生产信息的透明化','实现生产信息的目视化管理'],
 [426,95,'stem',null,'二是大环套小环','二 大环套小环'],
 [457,101,'stem',null,'电闸上挂牌','电源上挂牌'],
 [490,107,'stem',null,'刃部有隔、长刀具竖放、不得随意摆放','刃部有隔、长刀具不得随意摆放']
];
assert.equal(new Set(checks.map(x=>x[0])).size,19);
for(const [id,page,field,index,want,old] of checks){assert.equal(q(id).sourceImage,page);const value=index===null?q(id)[field]:q(id)[field][index];assert(value.includes(want),`#${id} 原图文字修正缺失`);if(field==='options')assert(!q(id).options.includes(old));if(q(id).answers.includes(want))assert(!q(id).answers.includes(old));}
assert.equal(q(151).stem,'在装配空间允许的情况下，打紧工具、套筒和螺栓的轴线应当（ ）再进行打紧，在打紧过程中套筒与螺栓（ ）。');
assert.deepEqual(json(Q),JSON.parse(fs.readFileSync('questions.json','utf8')));
const enhanced=w.HOS_ENHANCED_FILL;
assert(!JSON.stringify(enhanced[171]).includes('弓折'));
assert(!JSON.stringify(enhanced[179]).includes('矿区'));
assert(fs.readFileSync('app.js','utf8').includes('是否存在亏折、悬垂或交叉'));
assert(!fs.readFileSync('app.js','utf8').includes('是否存在弓折'));
assert(enhanced[362].stem.includes('设备使用时，应严格按照设备使用要求'));
let count=0;
for(const [level,bank] of [['standard',w.HOS_PEDAGOGY.fillBank],['enhanced',enhanced]])for(const [id,e] of Object.entries(bank))for(const v of e.variants||[{key:''}]){const item={q:q(+id),renderType:'fill',fillLevel:level,fillVariantKey:v.key};const s=t.capturePresentation(item);assert(s.stem&&s.correctAnswer.length);assert(t.answerCorrect(item,s.correctAnswer.join('、')),`${id}/${v.key} 标准答案不能判对`);count++;}
assert.equal(count,250);
const bendItem={q:q(171),renderType:'fill',fillLevel:'enhanced',fillVariantKey:'bend'};
assert(t.answerCorrect(bendItem,'亏折'));assert(!t.answerCorrect(bendItem,'弓折'));
// Verify old snapshots are repaired by exact question-specific corrections without losing variant/blank positions or option order.
function oldText(id,text){for(const row of checks.filter(x=>x[0]===id)){const [,,,index,want,old]=row;if(index!==null||id!==151)text=text.replaceAll(want,old);else if(text.includes(want))text='在装配空间允许的情况下，打紧工具、套筒和螺栓的轴线应当（ ） 再进行打';}return text;}
for(const id of new Set(checks.map(x=>x[0]))){const cur=t.capturePresentation({q:q(id),renderType:q(id).type,fillLevel:'standard',fillVariantKey:''});const old={...json(cur),stem:oldText(id,cur.stem),options:cur.options.map(s=>oldText(id,s)),correctAnswer:cur.correctAnswer.map(s=>oldText(id,s))};assert.deepEqual(json(t.sanitizePresentation(old,q(id))),json(cur),`#${id} 历史快照修复异常`);}
const current=t.capturePresentation(bendItem),oldBend=json(current);oldBend.options[0]='弓折';oldBend.correctAnswer=['弓折'];oldBend.blankConfig.accepted=['弓折'];oldBend.why=oldBend.why.replaceAll('亏折','弓折');
const history={ids:[171],renderTypes:['fill'],fillLevels:['enhanced'],fillVariantKeys:['bend'],optionOrders:[oldBend.options],presentationSnapshots:[oldBend],userAnswers:['弓折'],score:100,count:1,correct:1,paperId:'old-text-paper'};
const lastSession={...history,kind:'exam',schemaVersion:3,bankSchemaVersion:1,answers:['弓折'],current:0};
const seeded=boot({schemaVersion:2,favorites:[171,179],learning:{171:{attempts:5,fillExposure:4}},wrong:{171:{count:1,wrongTotal:2,lastPresentation:oldBend,lastUserAnswer:'弓折'}},history:[history],lastSession});
const S=seeded.t.getStore();
assert.deepEqual(json(S.favorites),[171,179]);assert.equal(S.learning[171].attempts,5);assert.equal(S.learning[171].fillExposure,4);
assert.equal(S.history[0].score,100);assert.equal(S.history[0].correct,1);assert.equal(S.history[0].paperDamaged,false);
assert.deepEqual(json(S.history[0].userAnswers),['弓折'],'历史实际输入不得伪造为正确字');
assert.deepEqual(json(S.history[0].presentationSnapshots[0]),json(current));assert.deepEqual(json(S.wrong[171].lastPresentation),json(current));assert.equal(S.wrong[171].wrongTotal,2);
assert(S.lastSession);assert.deepEqual(json(S.lastSession.presentationSnapshots[0]),json(current));assert.deepEqual(json(S.lastSession.answers),['弓折']);
seeded.w.resumeLastSession();assert.equal(seeded.t.getSession().items[0].fillVariantKey,'bend');assert.equal(seeded.t.getSession().items[0].answer,'弓折');
// Original-option answers and shuffled order are migrated, not dropped or reshuffled.
const oldOrders=['缠绕','穿插','磨碰','干涉','弓折'];
const original=seeded.t.sanitizeLastSession({...lastSession,renderTypes:['multiple'],fillLevels:['standard'],fillVariantKeys:[''],answers:[['弓折','干涉']],optionOrders:[oldOrders],presentationSnapshots:[null]});
assert.deepEqual(json(original.answers),[['亏折','干涉']]);assert.deepEqual(json(original.optionOrders),[['缠绕','穿插','磨碰','干涉','亏折']]);
assert.equal(t.sanitizePresentation({...oldBend,questionId:179},q(171)),null);
console.log('原图文字修正通过：19题20项、250个填空呈现与答案判定、171亏折正判/弓折拒判、历史快照/成绩/作答/收藏/学习进度/错题/未完成考试/选项顺序兼容。');
