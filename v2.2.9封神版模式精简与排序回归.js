const assert=require('assert/strict'),fs=require('fs'),{boot:rawBoot}=require('./scripts/test-app-harness.cjs');
function boot(initial={}){return rawBoot({...initial,settings:{...initial.settings,quickEntryMigration:'quick-entry-migrated-v2.2.9-fengshen-r3'}})}
const equal=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b)),defaults=['fillStrong','real','today','random'];
let x=boot();equal(x.t.getStore().settings.homeShortcuts,defaults);assert.equal(x.t.getStore().settings.quickEntryCustomized,false);
const more=x.main.innerHTML.match(/<details class="more-modes[\s\S]*?<\/details>/)[0];equal([...more.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1]),['真实模拟PLUS','真实模拟','专项模拟','专项背诵','今日复习','随机刷题','顺序背题','全库均衡复习','待复核清单','题库搜索','学习记录','507题掌握地图']);
assert(!x.w.__V22_TEST__.shortcutCatalog.some(s=>s.id==='mixedExam'));assert(!more.includes('模拟考试'));assert(!fs.readFileSync('index.html','utf8').includes('ratioSetting'));
for(const spec of [
 {settings:{},want:defaults,flag:false},
 {settings:{quickEntryCustomized:false,homeShortcuts:['today','real','sequence','review']},want:defaults,flag:false},
 {settings:{quickEntryCustomized:true,homeShortcuts:['today','real','sequence','review']},want:['today','real','sequence','review'],flag:true},
 {settings:{homeShortcuts:['today','real','sequence','review']},want:['today','real','sequence','review'],flag:true},
 {settings:{homeShortcuts:['search','specialRecite','review','balanced']},want:['search','specialRecite','review','balanced'],flag:true},
 {settings:{quickEntryCustomized:true,homeShortcuts:['search','mixedExam','review','balanced']},want:['search','review','balanced','real'],flag:true},
 {settings:{homeShortcuts:['mixedExam','real','search','review']},want:['real','search','review','fillStrong'],flag:true}
]){x=boot({settings:spec.settings});equal(x.t.getStore().settings.homeShortcuts,spec.want);assert.equal(x.t.getStore().settings.quickEntryCustomized,spec.flag);let y=boot(JSON.parse(x.store.shenrenliu_qbank_v1));equal(y.t.getStore().settings.homeShortcuts,spec.want)}
x=boot();x.w.renderExamSetup('mixed');assert.equal(x.t.getSession(),null);assert(!x.main.innerHTML.includes('id="fillRatio"'));x.w.beginExam('mixed');assert.equal(x.t.getSession(),null);
const initial={settings:{quickEntryCustomized:true,homeShortcuts:['search','specialRecite','review','balanced']}};
x=boot(initial);let sels=initial.settings.homeShortcuts.map(value=>({value}));x.c.document.querySelectorAll=s=>s==='.shortcutSetting'?sels:[];x.w.openSettings();x.w.saveSettings();equal(x.t.getStore().settings.homeShortcuts,initial.settings.homeShortcuts);assert(x.t.getStore().settings.quickEntryCustomized);
x.w.restoreDefaultShortcuts();equal(sels.map(s=>s.value),defaults);x.w.saveSettings();assert.equal(x.t.getStore().settings.quickEntryCustomized,false);equal(x.t.getStore().settings.homeShortcuts,defaults);
x.w.openSettings();sels.forEach((s,i)=>s.value=['today','real','sequence','review'][i]);x.w.markShortcutsCustomized();x.w.saveSettings();assert(x.t.getStore().settings.quickEntryCustomized);let y=boot(JSON.parse(x.store.shenrenliu_qbank_v1));equal(y.t.getStore().settings.homeShortcuts,['today','real','sequence','review']);
const catalog=x.w.__V22_TEST__.shortcutCatalog;assert(catalog.find(s=>s.id==='fillStrong').action.includes("renderRealExamSetup('fillStrong')"));assert(catalog.find(s=>s.id==='real').action.includes("renderRealExamSetup('real')"));assert(catalog.find(s=>s.id==='random').action.includes("startStudy('random')"));
assert(fs.readFileSync('sw.js','utf8').includes('fengshen-r4-${BUILD_VERSION}'));console.log('兼容回归通过：12入口排序、新默认顺序、自定义标记/未知旧默认保守保留、废弃项局部迁移、刷新/保存/恢复默认、旧模式入口拦截、共享目标、新缓存。');
