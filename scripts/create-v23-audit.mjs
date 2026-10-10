import fs from 'node:fs';
import vm from 'node:vm';

const questions=JSON.parse(fs.readFileSync('questions.json','utf8'));
const checked=new Set([
  110,111,112,113,114,115,116,117,118,
  132,133,134,135,136,139,
  169,170,171,174,308,
  399,405,412
]);
const context={window:{}};
vm.createContext(context);
for(const file of ['pedagogy.js','enhanced-fill.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const standard=context.window.HOS_PEDAGOGY.fillBank;
const enhanced=context.window.HOS_ENHANCED_FILL;
const records=questions.map(q=>({
  id:q.id,
  sourceImage:q.sourceImage,
  sourceChecked:checked.has(q.id),
  structureChecked:Array.isArray(q.options)&&q.answers.every(a=>q.options.includes(a))&&fs.existsSync(`source/image${q.sourceImage}.webp`),
  sourceReview:checked.has(q.id)?'已按本次修订包记录或本次目视原图核对':'尚未逐题对照原图，不保证逐字准确'
}));
const fillRecords=[
  ...Object.entries(standard).map(([id,x])=>({id:Number(id),pool:'standard',sourceChecked:checked.has(Number(id)),fillTextManuallyReviewed:false,variants:0})),
  ...Object.entries(enhanced).map(([id,x])=>({id:Number(id),pool:'enhanced',sourceChecked:checked.has(Number(id)),fillTextManuallyReviewed:false,variants:Array.isArray(x.variants)?x.variants.length:0}))
];
const report={
  version:'v2.3',
  note:'sourceChecked只代表该原题对应原图曾被目视核对；不代表507题或208道改写填空已逐字审核。旧填空文本逐题语义复核仍待完成。',
  summary:{originals:records.length,originalSourceChecked:records.filter(x=>x.sourceChecked).length,originalSourceUnchecked:records.filter(x=>!x.sourceChecked).length,existingFill:fillRecords.length,existingFillTextManuallyReviewed:0,variantCount:fillRecords.reduce((n,x)=>n+x.variants,0)},
  originals:records,
  existingFill:fillRecords
};
if(records.length!==507||records.some(x=>!x.structureChecked)||fillRecords.length!==208||report.summary.variantCount!==60)throw Error('题库或填空结构审计未通过');
fs.writeFileSync('v2.3逐题审计状态.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
