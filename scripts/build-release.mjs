import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const version = (process.env.BUILD_VERSION || 'local').replace(/[^a-zA-Z0-9._-]/g, '-');
const publishedAt=new Date().toISOString();
const files = [
  'index.html', '①点我打开题库.html', 'release-notes.md', 'styles.css', 'questions.js',
  'culture-insights.js', 'hos-analysis.js', 'explanation-core.js', 'backup-core.js', 'backup-ui.js', 'bank-core.js', 'bank-runtime.js', 'pedagogy.js', 'enhanced-fill.js', 'transfer-code.js', 'lulu.js', 'lulu-art.js', 'lulu-avatar.js', 'routine-eggs.js', 'beijing-clock.js', 'ultra-content.js', 'ultra-core.js', 'lulu-mascot.png', 'app.js', 'pwa-install.js', 'manifest.webmanifest',
  'icon-source.svg', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-64.png', 'icon-128.png', 'icon-256.png', 'icon-192.png', 'icon-512.png', 'icon-192-maskable.png', 'icon-512-maskable.png'
];

await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of files) await cp(path.join(root, file), path.join(output, file));
await cp(path.join(root,'media'),path.join(output,'media'),{recursive:true});
const assetBase=`assets/${version}/`;
let html = (await readFile(path.join(output,'index.html'),'utf8')).replaceAll('__BUILD_VERSION__',version);
html=html.replace('<meta name="build-version"',`<meta name="asset-base" content="${assetBase}"><meta name="build-time" content="${publishedAt}"><meta name="build-version"`);
html=html.replace(/\b(src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g,(match,attribute,file)=>`${attribute}="${assetBase}${file}"`);
await writeFile(path.join(output,'index.html'),html,'utf8');
await mkdir(path.join(output,'releases'),{recursive:true});
const releasePage=`releases/${version}.html`;
await writeFile(path.join(output,releasePage),html.replace('<head>','<head><base data-release-root href="../">'),'utf8');
await cp(path.join(root,'latest.html'),path.join(output,'latest.html'));
await writeFile(path.join(output,'release.json'),JSON.stringify({schemaVersion:1,version,appVersion:'v3.0',page:releasePage,assetBase,publishedAt}),'utf8');
await cp(path.join(root, 'source'), path.join(output, 'source'), {recursive: true});
await cp(path.join(root, 'banks'), path.join(output, 'banks'), {recursive: true});
for(const file of [...files.filter(f=>/\.(js|css)$/.test(f)&&f!=='culture-insights.js'), 'banks/catalog.js','banks/sinotruk-culture-official.js']){
  const target=path.join(output,assetBase,file);await mkdir(path.dirname(target),{recursive:true});
  const content=await readFile(path.join(root,file),'utf8');await writeFile(target,`/* ShenRenLiu build: ${version} */\n${content}`,'utf8');
}
// Retired 35-question bank stays only as a migration test fixture, not a deployed bank.
for(const f of ['sinotruk-culture.js','sinotruk-culture.json'])await rm(path.join(output,'banks',f),{force:true});
await cp(path.join(root, 'licenses'), path.join(output, 'licenses'), {recursive: true});
await writeFile(path.join(output, '.nojekyll'), '', 'utf8');

const serviceWorker = (await readFile(path.join(root, 'sw.js'), 'utf8'))
  .replaceAll('__BUILD_VERSION__', version);
await writeFile(path.join(output, 'sw.js'), serviceWorker, 'utf8');
console.log(`Built dist/ with cache version ${version}`);
