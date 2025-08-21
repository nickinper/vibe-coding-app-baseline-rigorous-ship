#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const outDir = path.join(process.cwd(), 'outputs');
const required = [
  'generated-deliverable.md',
  'generated-deliverable.html',
  'generated-deliverable.pdf',
  'manifest.json'
];

function sha256(p){
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

function size(p){ return fs.statSync(p).size; }
function fail(msg){ console.error('✖', msg); process.exit(2); }
function ok(msg){ console.log('✔', msg); }

for (const name of required) {
  const p = path.join(outDir, name);
  if (!fs.existsSync(p)) fail(`Missing artifact: outputs/${name}`);
  ok(`Found outputs/${name}`);
}

if (size(path.join(outDir, 'generated-deliverable.md')) < 500) fail('MD too small');
if (size(path.join(outDir, 'generated-deliverable.pdf')) < 5000) fail('PDF too small');
ok('Artifact sizes look sane');

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.trace_id || !manifest.artifacts) fail('Manifest missing trace_id or artifacts');
ok('Manifest has trace_id and artifacts');

const files = ['md','html','pdf'];
for (const key of files) {
  const entry = manifest.artifacts[key];
  if (!entry || !entry.path || !entry.sha256) fail(`Manifest missing entry for ${key}`);
  const full = path.join(process.cwd(), entry.path);
  const calc = sha256(full);
  if (calc !== entry.sha256) fail(`SHA256 mismatch for ${entry.path}`);
  ok(`SHA256 OK for ${entry.path}`);
}
ok('All artifact integrity checks passed.');
