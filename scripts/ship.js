#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path'); const fs = require('fs'); const crypto = require('crypto');
function run(cmd,args,env={}){ const res=spawnSync(cmd,args,{stdio:'inherit', env:{...process.env, ...env}}); if(res.status!==0){ console.error(`✖ Command failed: ${cmd} ${args.join(' ')}`); process.exit(res.status||1); } }
function existsEnv(keys){ return keys.every(k=>!!process.env[k]); }
function fileHash(p){ const h=crypto.createHash('sha256'); h.update(fs.readFileSync(p)); return h.digest('hex'); }
const outDir = path.join(process.cwd(), 'outputs'); if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
const traceId = Math.random().toString(36).slice(2,10); process.env.TRACE_ID = traceId;
console.log('▶ validate:answers (trace:', traceId, ')'); run('node',['scripts/validate-answers.js']);
console.log('▶ generate deliverable'); run('npm',['run','gen']);
console.log('▶ export:html'); run('node',['scripts/export-html.js','outputs/generated-deliverable.md','outputs/generated-deliverable.html']);
console.log('▶ export:pdf'); run('node',['scripts/export-pdf.js','outputs/generated-deliverable.html','outputs/generated-deliverable.pdf']);
const mdPath='outputs/generated-deliverable.md', htmlPath='outputs/generated-deliverable.html', pdfPath='outputs/generated-deliverable.pdf';
if(!fs.existsSync(mdPath) || fs.statSync(mdPath).size<500){ console.error('✖ Markdown missing/too small (trace:', traceId, ')'); process.exit(2); }
if(!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size<5000){ console.error('✖ PDF missing/too small (trace:', traceId, ')'); process.exit(2); }
console.log('• Sizes OK: md', fs.statSync(mdPath).size, 'pdf', fs.statSync(pdfPath).size);
if(existsEnv(['GITHUB_TOKEN','GITHUB_OWNER','GITHUB_REPO'])){ console.log('▶ export:github'); run('node',['scripts/export-github.js','outputs','docs']); } else { console.log('• Skip GitHub export'); }
if(existsEnv(['NOTION_TOKEN','NOTION_PARENT_PAGE_ID'])){ console.log('▶ export:notion'); run('node',['scripts/export-notion.js','outputs/generated-deliverable.md']); } else { console.log('• Skip Notion export'); }
if(process.env.SHIP_LOCAL_DIR){ console.log('▶ export:local →', process.env.SHIP_LOCAL_DIR); run('node',['scripts/export-local.js',process.env.SHIP_LOCAL_DIR,'outputs','docs']); } else { console.log('• Skip local export'); }
const manifest = { trace_id: traceId, timestamp: new Date().toISOString(), env: { node_version: process.version, platform: process.platform },
  artifacts: { md:{ path:mdPath, size:fs.statSync(mdPath).size, sha256:fileHash(mdPath)}, html:{ path:htmlPath, size:fs.statSync(htmlPath).size, sha256:fileHash(htmlPath)}, pdf:{ path:pdfPath, size:fs.statSync(pdfPath).size, sha256:fileHash(pdfPath)} },
  template_selection: "auto via rules; see templates/report_*.md", rules_applied_hint: "See rules/rules.json and inputs in answers.json" };
fs.writeFileSync('outputs/manifest.json', JSON.stringify(manifest,null,2)); console.log('✔ Ship complete. Trace:', traceId);
