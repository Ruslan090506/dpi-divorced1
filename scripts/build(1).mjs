import fs from 'node:fs';
import path from 'node:path';
import './test.mjs';
const root=process.cwd();
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const sourceFiles=['package.json','vercel.json','.gitignore','README.md',...walk('scripts').map(p=>p.replaceAll('\\','/'))];
for(const file of sourceFiles){const dest=path.join('public','deploy',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
const files=walk('public').map(p=>p.replaceAll('\\','/')).filter(p=>!p.startsWith('public/deploy/')&&p!=='public/package-manifest.json').map(p=>({path:p,url:'/'+p.slice(7)}));
files.push({path:'public/package-manifest.json',url:'/package-manifest.json'});
for(const p of sourceFiles)files.push({path:p,url:'/deploy/'+p});
fs.writeFileSync('public/package-manifest.json',JSON.stringify({files},null,2));
// Only public assets are deployed; no private environment or source secrets are used.
fs.mkdirSync('dist',{recursive:true});
fs.cpSync('public','dist',{recursive:true});
console.log(`Built ${files.length} portable project files into ${path.join(root,'dist')}`);
