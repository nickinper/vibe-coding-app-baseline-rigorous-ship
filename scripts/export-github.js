#!/usr/bin/env node
const fs = require('fs'); const path = require('path'); const { Octokit } = require('@octokit/rest');
const token = process.env.GITHUB_TOKEN; const owner = process.env.GITHUB_OWNER; const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || 'deliverable';
if (!token || !owner || !repo) { console.error('✖ Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO'); process.exit(1); }
const octokit = new Octokit({ auth: token });
async function ensureRepo(){ try{ await octokit.repos.get({ owner, repo }); return true; } catch(e){ if(e.status===404){ await octokit.repos.createForAuthenticatedUser({ name: repo, private: true }); return true; } throw e; } }
async function getDefaultBranch(){ const { data } = await octokit.repos.get({ owner, repo }); return data.default_branch || 'main'; }
async function ensureBranch(fromBranch,toBranch){ const base = await octokit.git.getRef({ owner, repo, ref: `heads/${fromBranch}` });
  try{ await octokit.git.getRef({ owner, repo, ref:`heads/${toBranch}`}); } catch(e){ if(e.status===404){ await octokit.git.createRef({ owner, repo, ref:`refs/heads/${toBranch}`, sha: base.data.object.sha }); } else { throw e; } } }
function listFiles(targets){ const files=[]; for(const t of targets){ const p=path.resolve(t); if(!fs.existsSync(p)) continue; const st=fs.statSync(p);
  if(st.isFile()) files.push({rel:path.basename(p),abs:p}); else if(st.isDirectory()){ for(const name of fs.readdirSync(p,{withFileTypes:true})){ const ap=path.join(p,name.name); const s=fs.statSync(ap); if(s.isFile()) files.push({rel:path.join(path.basename(t),name.name),abs:ap}); } } } return files; }
async function putFiles(branch, files, message){ for(const file of files){ const content=fs.readFileSync(file.abs,'base64'); let sha=undefined; try{ const {data}=await octokit.repos.getContent({ owner, repo, path:file.rel, ref:branch }); sha=data.sha; }catch(e){}
  await octokit.repos.createOrUpdateFileContents({ owner, repo, path:file.rel, branch, message, content, sha, committer:{ name:'vibe-exporter', email:'no-reply@example.com'} });
  console.log('✔ committed', file.rel); } }
(async () => {
  await ensureRepo(); const def = await getDefaultBranch(); await ensureBranch(def, branch);
  const args = process.argv.slice(2); const targets = args.length ? args : ['outputs/generated-deliverable.md'];
  const files = listFiles(targets); if (!files.length){ console.error('✖ No files to export.'); process.exit(1); }
  await putFiles(branch, files, 'chore: export deliverable'); console.log(`✔ Exported ${files.length} file(s) to ${owner}/${repo}@${branch}`);
})().catch(e => { console.error(e); process.exit(1); });
