#!/usr/bin/env node
const fs=require('fs'); const path=require('path');
function copyFile(src,dst){ fs.mkdirSync(path.dirname(dst), {recursive:true}); fs.copyFileSync(src,dst); console.log('✔ copied', src, '→', dst); }
function copyDir(srcDir,dstDir){ if(!fs.existsSync(srcDir)) return; for(const name of fs.readdirSync(srcDir)){ const s=path.join(srcDir,name); const d=path.join(dstDir,name); const st=fs.statSync(s); if(st.isDirectory()) copyDir(s,d); else copyFile(s,d); } }
const target = process.argv[2]; if(!target){ console.error('✖ Provide a target dir, e.g., `node scripts/export-local.js ../my-repo`'); process.exit(1); }
const paths = process.argv.slice(3); const items = paths.length ? paths : ['outputs','docs'];
for(const it of items){ const p=path.resolve(it); if(!fs.existsSync(p)) continue; const st=fs.statSync(p); if(st.isDirectory()) copyDir(p, path.join(target,it)); else copyFile(p, path.join(target, path.basename(p))); }
console.log('✔ Export complete to', target);
