const assert=require('assert/strict'),{boot}=require('./scripts/test-app-harness.cjs');
const key='quick-entry-migrated-v2.2.9-fengshen-r3';
const x=boot({favorites:[12],wrong:{13:{count:2}},settings:{quickEntryMigration:key,quickEntryCustomized:true,homeShortcuts:['search','wrong','sequence','favorites']}});
assert.deepEqual(JSON.parse(JSON.stringify(x.t.getStore().settings.homeShortcuts)),['search','sequence','real','today']);
assert(x.t.getStore().favorites.includes(12));assert(x.t.getStore().wrong[13]);
const html=x.main.innerHTML,all=html.match(/<details class="more-modes[\s\S]*?<\/details>/)[0],titles=[...all.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1]);
assert(!titles.includes('顺序背题'));assert(titles.includes('随机刷题'));assert.equal(titles.length,5);for(const id of x.t.getStore().settings.homeShortcuts){const mode=x.w.__V22_TEST__.shortcutCatalog.find(m=>m.id===id);assert(!titles.includes(mode.title))}assert(!titles.includes('错题本'));assert(!titles.includes('收藏夹'));assert(html.match(/personal-entry[\s\S]*?错题本[\s\S]*?收藏夹/));
assert(!x.w.__V22_TEST__.shortcutCatalog.some(m=>['wrong','favorites'].includes(m.id)));x.w.openSettings();assert(!x.nodes['#shortcutSettings'].innerHTML.includes('value="wrong"'));assert(!x.nodes['#shortcutSettings'].innerHTML.includes('value="favorites"'));
const y=boot(JSON.parse(x.store.shenrenliu_qbank_v1));assert.equal(JSON.stringify(y.t.getStore().settings.homeShortcuts),JSON.stringify(x.t.getStore().settings.homeShortcuts));console.log('r4入口去重通过：快捷与折叠目录不重复、其余5项可用、错题收藏仅首页重点保留、候选过滤、旧快捷局部补齐、不改迁移key、不丢学习数据。');
