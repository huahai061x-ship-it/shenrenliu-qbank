const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');const root=path.resolve(__dirname,'../dist'),release=JSON.parse(fs.readFileSync(path.join(root,'release.json'))),version=release.version;
assert(/^[\w.-]+$/.test(version));assert.equal(release.page,`releases/${version}.html`);assert.equal(release.assetBase,`assets/${version}/`);
assert.equal(typeof release.announcement.title,'string');assert(release.announcement.items.length>0);assert(!Number.isNaN(Date.parse(release.publishedAt)));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),fixed=fs.readFileSync(path.join(root,release.page),'utf8');assert(html.includes(`name="build-version" content="${version}"`));assert(html.includes('name="build-time"'));assert(!html.includes('<base data-release-root'));assert(fixed.includes('<base data-release-root href="../">'));
for(const match of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g)){assert(match[1].startsWith(release.assetBase));assert(fs.readFileSync(path.join(root,match[1]),'utf8').startsWith('/* ShenRenLiu build: '+version+' */'));}
const context={self:{addEventListener(){}},URL,Set};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8')+';globalThis.packageFiles={REQUIRED,VERSIONED,RELEASE_PAGE}',context);const list=[...context.packageFiles.REQUIRED,...context.packageFiles.VERSIONED,context.packageFiles.RELEASE_PAGE];for(const f of list){let rel=f.slice(2).split('?')[0]||'index.html';assert(fs.existsSync(path.join(root,rel)),f)}assert(!context.packageFiles.REQUIRED.includes('./lulu-mascot.png'));assert(!context.packageFiles.REQUIRED.includes('./culture-insights.js'));assert(!html.includes('src="culture-insights.js"'));
assert(fs.existsSync(path.join(root,'latest.html')));assert(!fs.existsSync(path.join(root,'banks/sinotruk-culture.js')));assert(!fs.existsSync(path.join(root,'tests')));assert(!fs.existsSync(path.join(root,'README.md')));console.log('PASS 当前批次页面与脚本绑定、离线包别名齐全、入口存在、装饰图不阻塞更新、旧题库与开发历史不进入网站');

for(const match of html.matchAll(/src="([^"]+\.js)"/g))assert(context.packageFiles.VERSIONED.includes("./"+match[1]),"Offline entry missing: "+match[1]);

const publicBankFiles=['catalog.js','forming_casting_2026.js','forming_forging_2026.js','sinotruk-culture-official.js','sinotruk-culture-official.json'];
assert.deepEqual(fs.readdirSync(path.join(root,'banks')).sort(),publicBankFiles);
assert.deepEqual(fs.readdirSync(path.join(root,release.assetBase,'banks')).sort(),publicBankFiles.filter(name=>name.endsWith('.js')));
const meta={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'banks/catalog.js'),'utf8'),meta);
assert.deepEqual(Array.from(meta.window.QBANK_BANKS,m=>m.id),["hos_2026","sinotruk_culture_2025_official","forming_forging_2026","forming_casting_2026"]);
assert.deepEqual(Array.from(context.packageFiles.REQUIRED).filter(ref=>ref.startsWith('./banks/')).sort(),publicBankFiles.filter(name=>name.endsWith('.js')).map(name=>'./banks/'+name));
assert.deepEqual(fs.readdirSync(path.join(root,'source')).sort(),Array.from({length:111},(_,n)=>'image'+(n+1)+'.webp').sort());
assert(fs.existsSync(path.join(root,release.assetBase,'private-banks.js')));
assert(!fs.readdirSync(root,{recursive:true}).some(name=>/\.(?:xlsx?|csv|zip|tsv)$/i.test(name)));
console.log('PASS 四个内置库、版本目录和离线清单一致，原有111张原图齐全，未包含工作簿和导入压缩包。');
