const assert=require('node:assert/strict');
const H=require('../exam-history-core');
const rows=[];
for(const [scope,mode,type,title] of [
 ['forging','real','','锻造模拟'],['casting','real','','铸造模拟'],['forging','special_exam','multiple','多选专项'],['forging','collection_exam','','错题本测试']
]){
 for(let n=0;n<40;n++)rows.push({time:rows.length,examScope:[scope],examMode:mode,questionType:type,mode:title});
}
rows.reverse();
const saved=H.retain(rows);
for(const row of rows){
 const same=x=>H.scope(x.examScope)===H.scope(row.examScope)&&H.category(x)===H.category(row);
 assert.deepEqual(saved.filter(same).slice(0,30),rows.filter(same).slice(0,30));
}
assert.deepEqual(H.retain(Array.from({length:55},(_,i)=>({time:i}))).length,50);
console.log('PASS 四个题库/类别组合各保留近 30 份答卷，同时保护既有最近 50 场记录。');
