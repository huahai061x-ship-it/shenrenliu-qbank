// Serve a built package as successive releases, changing only its stamped build identity.
const fs=require('node:fs'),path=require('node:path');
function packageFiles(root){
  const original=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).version;
  return function resource(name,version){
    const mapped=name.replace(/^assets\/[^/]+\//,'assets/'+original+'/').replace(/^releases\/[^/]+\.html$/,'releases/'+original+'.html');
    const file=path.resolve(root,mapped);
    if(!file.startsWith(root+path.sep))throw Error('Invalid fixture path');
    const bytes=fs.readFileSync(file);
    if(name==='release.json'){
      const release=JSON.parse(bytes);return JSON.stringify({...release,version,page:'releases/'+version+'.html',assetBase:'assets/'+version+'/'});
    }
    if(!/\.(js|css|html)$/.test(name))return bytes;
    return bytes.toString().replaceAll('assets/'+original+'/','assets/'+version+'/')
      .replaceAll('releases/'+original+'.html','releases/'+version+'.html')
      .replaceAll('/* ShenRenLiu build: '+original+' */','/* ShenRenLiu build: '+version+' */')
      .replace('name="build-version" content="'+original+'"','name="build-version" content="'+version+'"')
      .replace("const BUILD_VERSION = '"+original+"'","const BUILD_VERSION = '"+version+"'");
  };
}
module.exports={packageFiles};
