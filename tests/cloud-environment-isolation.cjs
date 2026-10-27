const assert=require('node:assert/strict'),{storageNames,cloudbaseRepository,createService}=require('../cloud/build/sync/index.js');
assert.deepEqual(storageNames('test'),{collection:'qbank_sync_v1',blobs:'qbank_sync_payload_v2'});
assert.deepEqual(storageNames('production'),{collection:'qbank_prod_v1',blobs:'qbank_prod_payload_v2'});
for(const invalid of ['prod','',null,'qbank_sync_v1'])assert.throws(()=>storageNames(invalid),/配置无效/);
assert.throws(()=>cloudbaseRepository({database(){throw Error('must not connect');}},'invalid'),/配置无效/);
(async()=>{let called=false;const service=createService({list(){called=true;return[];}});await assert.rejects(()=>service({action:'pull',scope:'production'},{uid:'a',isAnonymous:false}),/同步请求无效/);assert.equal(called,false);console.log('PASS 正式与测试集合分别固定，错误配置拒绝启动，客户端不能指定存储环境');})().catch(e=>{console.error(e);process.exitCode=1;});
