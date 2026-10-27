import {createRequire} from 'node:module';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(path.join(root,'cloud/client-sdk/package.json')),esbuild=require('esbuild');
await mkdir(path.join(root,'cloud/build/client'),{recursive:true});
await esbuild.build({entryPoints:[path.join(root,'cloud/client-sdk/entry.js')],bundle:true,platform:'browser',format:'iife',target:['es2020'],minify:true,outfile:path.join(root,'cloud/build/client/cloudbase-auth-functions-3.10.3.js')});
await copyFile(path.join(root,'cloud/build/client/cloudbase-auth-functions-3.10.3.js'),path.join(root,'cloud/build/client/cloudbase-3.10.3.js'));
console.log('Built optional CloudBase client. It is not loaded while cloud sync is disabled.');
