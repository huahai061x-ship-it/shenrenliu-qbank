'use strict';
const P=require('./cloud-sync-payload.js');
const ID=/^\d{13}-[a-f0-9-]{36}$/;
const CATEGORIES=['题目或答案','功能故障','界面显示','登录与同步','建议与其他'];
function text(v,max,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('反馈文字不完整或过长');return v.trim();}
function validate(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['category','description','steps','expected','context','images'].includes(k)))throw Error('反馈格式无效');
  if(!CATEGORIES.includes(v.category))throw Error('请选择反馈类型');
  const context={};if(!v.context||typeof v.context!=='object'||Array.isArray(v.context))throw Error('反馈位置无效');
  const limits={page:80,bank:240,question:100,version:100,viewport:40,platform:120};
  for(const [k,value] of Object.entries(v.context)){if(!limits[k])throw Error('反馈环境信息无效');context[k]=text(value,limits[k]);}
  if(!Array.isArray(v.images)||v.images.length>3)throw Error('最多附加3张截图');
  const images=v.images.map(src=>{if(typeof src!=='string'||src.length>560000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src))throw Error('截图格式或大小无效');const [head,body]=src.split(','),b=Buffer.from(body,'base64');if(b.length<12||!(head.includes('jpeg')?b[0]===255&&b[1]===216&&b[2]===255:head.includes('png')?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'))throw Error('截图内容无效');return src;});
  return {category:v.category,description:text(v.description,3000,true),steps:text(v.steps||'',2000),expected:text(v.expected||'',1000),context,images};
}
function summary(row){return {id:row.id,category:row.category,summary:row.summary,createdAt:row.createdAt,status:['new','reviewing','resolved','needs_info'].includes(row.status)?row.status:'new',reply:typeof row.reply==='string'?row.reply.slice(0,4000):'',imageCount:row.imageCount||0,context:row.context||{}};}
async function service(repo,request,uid){
  const owner='feedback/'+uid;
  if(request.action==='listFeedback'){
    if(request.cursor!==undefined&&!ID.test(request.cursor))throw Error('反馈分页位置无效');
    const rows=await repo.feedbackList(owner,request.cursor||'',21);
    return {feedback:rows.slice(0,20).map(summary),nextCursor:rows.length>20?rows[19].id:null};
  }
  if(!ID.test(request.id))throw Error('反馈编号无效');
  if(request.action==='feedbackDetail'){
    const result=await repo.transaction(owner,request.id,record=>({changed:false,record}));
    if(result.record?.kind!=='feedback')throw Error('未找到这条反馈');
    return {feedbackItem:{...summary(result.record),value:result.record.value}};
  }
  let value=request.value;
  if(P.manifest(value)){
    const ref=P.validateManifest(value);if(ref.bytes>1800000||ref.parts>130)throw Error('截图总量过大，请减少截图');
    const chunks=[];for(let i=0;i<ref.parts;i+=8)chunks.push(...await Promise.all(Array.from({length:Math.min(8,ref.parts-i)},(_,n)=>repo.getBlob(uid,ref.hash,i+n,ref.parts))));
    value=P.decode(ref,chunks);
  }
  const validated=validate(value);if(P.length(JSON.stringify(validated))>1800000)throw Error('反馈内容过大');
  const row={kind:'feedback',id:request.id,category:validated.category,summary:validated.description.slice(0,120),createdAt:Date.now(),status:'new',reply:'',imageCount:validated.images.length,context:validated.context,fingerprint:P.fingerprint(validated),value:request.value};
  const saved=await repo.feedbackCreate(owner,request.id,row);
  return {feedbackItem:summary(saved)};
}
module.exports={service,validate,summary};
