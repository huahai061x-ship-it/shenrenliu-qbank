(()=>{'use strict';
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const filler=/(不符合题目要求|与正确答案不一致|与标准答案不一致|该选项错误所以不选|正确项应选|错误项不选|解析待补充|此处填写|TODO)/i;
function check(q,a){
 if(q.type==='fill')return [];
 let errors=[],tag='#'+q.id+'：';
 const text=(v,min)=>typeof v==='string'&&v.trim().length>=min&&!filler.test(v);
 if(!plain(a))return [tag+'缺少结构化解析analysis'];
 if(!text(a.topic,2))errors.push(tag+'缺少具体考点topic');
 if(!text(a.why,12))errors.push(tag+'依据why过短或包含空话');
 if(!['ready','needs_source'].includes(a.status))errors.push(tag+'必须明确ready或needs_source核验状态');
 if(a.references!==undefined&&(!Array.isArray(a.references)||a.references.some(r=>!plain(r)||!text(r.title,2)||!/^https:\/\/[^\s]+$/.test(r.url)||!text(r.support,8))))errors.push(tag+'来源须含有效标题、HTTPS链接和具体支持范围');
 if(a.connections!==undefined&&(!Array.isArray(a.connections)||a.connections.some(r=>!plain(r)||!Number.isInteger(r.questionId)||r.questionId<1||!text(r.reason,12))))errors.push(tag+'库内互证须含原题号及具体关系说明');
 if(q.type==='judge'){
  if(q.answers[0]==='错'&&!text(a.correction,12))errors.push(tag+'错题必须提供具体改正表述correction');
 }else{
  if(!plain(a.optionReasons))return [...errors,tag+'缺少逐项辨析optionReasons'];
  if(Object.keys(a.optionReasons).length!==q.options.length||Object.keys(a.optionReasons).some(o=>!q.options.includes(o)))errors.push(tag+'逐项辨析必须以全部原选项文本为键，不能按A/B位置绑定');
  for(const o of q.options)if(!text(a.optionReasons[o],8))errors.push(tag+'选项“'+o.slice(0,25)+'”缺少具体理由或含空话');
  if(new Set(Object.values(a.optionReasons)).size!==q.options.length)errors.push(tag+'多个选项不能复用同一句理由');
 }
 return errors;
}
function validateBank(bank,{allowPending=false}={}){
 let errors=[];
 for(const q of bank.questions||[]){let a=q.analysis||bank.explanations?.[q.id];errors.push(...check(q,a));if(q.type!=='fill'&&!allowPending&&a?.status!=='ready')errors.push('#'+q.id+'：未核准的题目不能作为新题库导入');}
 if(errors.length)throw Error('解析验收失败：'+errors.slice(0,5).join('；')+(errors.length>5?'；另有'+(errors.length-5)+'项':''));
 return true;
}
window.EXPLANATION_CORE={check,validateBank,version:1};
})();
