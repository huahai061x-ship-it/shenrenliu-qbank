const fs=require('fs');
const assert=require('assert/strict');
const {boot}=require('./scripts/test-app-harness.cjs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const help=fs.readFileSync('②使用说明.txt','utf8');
const x=boot(),expected='v2.2.6 正式版';
assert.equal(x.t.APP_VERSION,'v2.2.6','核心应用版本不一致');
assert.equal(x.t.SESSION_SCHEMA_VERSION,3);assert.equal(x.t.BANK_SCHEMA_VERSION,1);assert.equal(x.t.STORE_SCHEMA_VERSION,2);
const home=x.main.innerHTML;x.w.openSettings();
const displays={
  pageTitle:html.match(/<title>[^<]*(v\d+\.\d+\.\d+ 正式版)<\/title>/)?.[1],
  pageHeader:html.match(/SHENREN LIU · HOS 应知应会 · (v\d+\.\d+\.\d+ 正式版)/)?.[1],
  homeHero:home.match(/class="pill">HOS 应知应会 · (v\d+\.\d+\.\d+ 正式版)/)?.[1],
  settings:x.nodes['#versionStats'].innerHTML.match(/<b>版本与完整性<\/b><br>(v\d+\.\d+\.\d+ 正式版)/)?.[1],
  manifest:manifest.description.match(/^(v\d+\.\d+\.\d+)正式版/)?.[1],
  help:help.match(/^(?:神人刘题库训练站 )?(v\d+\.\d+\.\d+ 正式版)/)?.[1]
};
for(const [place,version] of Object.entries(displays))assert.equal(version,place==='manifest'?'v2.2.6':expected,`${place}版本不一致`);
assert(!/v2\.2\.[245] ?正式版/.test(app+html),'仍有旧版显示文字');
assert(!/\bBANK_VERSION\s*=/.test(app),'仍使用应用版本字符串作为数据兼容标识');
console.log('版本一致性校验通过：标题、页眉、实际首页/设置、安装清单、说明及核心APP_VERSION为v2.2.6；独立session/bank/store schema为3/1/2。');
