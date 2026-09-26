import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const version = (process.env.BUILD_VERSION || 'local').replace(/[^a-zA-Z0-9._-]/g, '-');
const files = [
  'index.html', '①点我打开题库.html', 'styles.css', 'questions.js',
  'pedagogy.js', 'enhanced-fill.js', 'app.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-192-maskable.png', 'icon-512-maskable.png'
];

await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of files) await cp(path.join(root, file), path.join(output, file));
await cp(path.join(root, 'source'), path.join(output, 'source'), {recursive: true});
await writeFile(path.join(output, '.nojekyll'), '', 'utf8');

const serviceWorker = (await readFile(path.join(root, 'sw.js'), 'utf8'))
  .replaceAll('__BUILD_VERSION__', version);
await writeFile(path.join(output, 'sw.js'), serviceWorker, 'utf8');
console.log(`Built dist/ with cache version ${version}`);
