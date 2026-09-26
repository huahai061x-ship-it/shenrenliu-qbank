const assert=require('assert/strict'),{boot}=require('./scripts/test-app-harness.cjs');
const x=boot(),Q=x.w.QUESTION_BANK,errors=[],spacing=[];
// Existing raw line-wrap spacing is retained, not a license to rewrite words or answers.
// The protected-file SHA additionally locks these raw texts; display/search must normalize them.
const spacingBaseline=[62,76,88,114,116,118,119,125,204,207,210,213,219,221,241,242,259,262,265,305,334,350,359,365,370,373,377,400,404,408,412,414,416,417,418,419,426,440,441,442,443,444,450,452,453,454,455,458,459,460,461,463,472,479,480,483,484,487,489,493,494,500,502,503,504,508,511];
const chineseGap=/[\u3400-\u9fff]\s+[\u3400-\u9fff]/;
const risk=/[�□\u0000-\u0008]|[?!？！]{2,}|[，,。.;；:：]{2,}|[（(]\s*[（(]|[）)]\s*[）)]|(?:^|[\s（(])[A-Za-z](?:$|[\s）)])|正确等完|正确等罕|正确到衬|无估|牌斜|炸贴|翘边突(?!出)|用族|不期营|电亲|账短|周转条类|肥和|手棍/;
for(const q of Q){
  const texts=[q.stem,...q.options,...q.answers];
  if(texts.some(t=>typeof t!=='string'||!t.trim()))errors.push(`#${q.id}题干/选项/答案为空`);
  if(new Set(q.options).size!==q.options.length)errors.push(`#${q.id}重复选项`);
  if(q.answers.some(a=>!q.options.includes(a)))errors.push(`#${q.id}答案不属于选项`);
  if(q.type==='single'&&q.answers.length!==1)errors.push(`#${q.id}单选答案数错误`);
  if(q.type==='multiple'&&q.answers.length<2)errors.push(`#${q.id}多选答案数异常`);
  if(q.type==='judge'&&(JSON.stringify(q.options)!==JSON.stringify(['对','错'])||q.answers.length!==1||!['对','错'].includes(q.answers[0])))errors.push(`#${q.id}判断题结构异常`);
  if(!['single','multiple','judge'].includes(q.type))errors.push(`#${q.id}未知题型`);
  if((q.sourceImages||[q.sourceImage]).some(p=>!Number.isInteger(p)||p<1||p>111))errors.push(`#${q.id}原图页码越界`);
  if(texts.some(t=>risk.test(t)))errors.push(`#${q.id}存在高风险乱码/断裂/异常符号，必须对照原图`);
  if(texts.some(t=>chineseGap.test(t))){spacing.push(q.id);for(const text of texts.filter(t=>chineseGap.test(t))){const normalized=x.t.normalizeSearchText(text);if(chineseGap.test(normalized.normalized)||!x.t.searchTextMatches(text,normalized.compact))errors.push(`#${q.id}已有OCR空白未被显示/搜索归一化`)}}
}
assert.equal(Q.length,507);assert.deepEqual(Array.from({length:511},(_,i)=>i+1).filter(id=>!Q.some(q=>q.id===id)),[1,2,3,335]);
assert.deepEqual(spacing,spacingBaseline,'出现新的OCR空白疑点，需复核原图并明确处理，不得自动扩充白名单');
// source/image3.webp visually verified: original reads 办公会, correct answer 更衣室.
const q12=Q.find(q=>q.id===12);assert.equal(q12.sourceImage,3);assert.equal(q12.options[0],'办公会');assert.equal(q12.answers.join(''),'更衣室');
if(errors.length)throw Error(errors.join('\n'));
console.log(`题库文本质量校验通过：507题结构/答案/页码合法，高风险疑点0；67题既有OCR空白原文保留并归一化；#12原图文字锁通过。`);
