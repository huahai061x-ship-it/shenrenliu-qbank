const assert=require('node:assert/strict');
require('node:child_process').execFileSync(process.execPath,[require('node:path').resolve(__dirname,'../scripts/prepare-cloud-sync.mjs')],{stdio:'pipe'});
const {syncRequest,createService}=require('../cloud/build/sync');
const {createMemoryRepository}=require('./fixtures/cloud-memory-repository.cjs');
(async()=>{
 const {repo}=createMemoryRepository(),service=createService(repo),identity={uid:'real-runtime-user',isAnonymous:false};
 const input={action:'pull',userInfo:{uid:'forged-user',isAnonymous:false},tcbContext:{uid:'another-forged-user',isAnonymous:false}};
 assert.deepEqual(syncRequest(input),{action:'pull'});assert.equal(input.userInfo.uid,'forged-user');
 assert.deepEqual((await service(syncRequest(input),identity)).records,[]);
 await assert.rejects(()=>service(syncRequest(input),{uid:'',isAnonymous:false}),/邮箱/);
 await assert.rejects(()=>service(syncRequest(input),{uid:'anonymous',isAnonymous:true}),/邮箱/);
 await assert.rejects(()=>service(syncRequest({...input,uid:'forged-user'}),identity),/请求无效/);
 await assert.rejects(()=>service(syncRequest({...input,action:'unknown'}),identity),/请求无效/);
 assert.deepEqual(syncRequest({action:'pull',tcbContext:{uid:'forged'}}),{action:'pull'});
 console.log('PASS 原生平台附带的userInfo/tcbContext从业务参数中移除；不能伪造身份，未知字段和动作仍拒绝');
})().catch(e=>{console.error(e);process.exitCode=1;});
