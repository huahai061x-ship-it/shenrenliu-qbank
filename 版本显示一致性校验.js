const fs=require('fs');
const assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const help=fs.readFileSync('②使用说明.txt','utf8');
const expected='v2.2.5 正式版';
const displays={
  pageTitle:html.match(/<title>[^<]*(v\d+\.\d+\.\d+ 正式版)<\/title>/)?.[1],
  pageHeader:html.match(/SHENREN LIU · HOS 应知应会 · (v\d+\.\d+\.\d+ 正式版)/)?.[1],
  homeHero:app.match(/class="pill">HOS 应知应会 · (v\d+\.\d+\.\d+ 正式版)/)?.[1],
  settings:app.match(/<b>版本与完整性<\/b><br>(v\d+\.\d+\.\d+ 正式版)/)?.[1],
  manifest:manifest.description.match(/^(v\d+\.\d+\.\d+)正式版/)?.[1],
  help:help.match(/^(?:神人刘题库训练站 )?(v\d+\.\d+\.\d+ 正式版)/)?.[1]
};
for(const [place,version] of Object.entries(displays))assert.equal(version,place==='manifest'?'v2.2.5':expected,`${place}版本不一致`);
assert(!app.includes('v2.2.4 正式版')&&!html.includes('v2.2.4 正式版'),'仍有旧版显示文字');
console.log('版本显示一致性校验通过：页面标题、页眉、首页、设置、安装清单、使用说明均为 v2.2.5 正式版。');
