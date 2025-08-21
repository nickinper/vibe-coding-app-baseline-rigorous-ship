import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync } from 'node:fs';

function run(cmd, env = {}) {
  return execSync(cmd, {
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C', LANG: 'C', ...env }
  });
}

function sha256(p) {
  const out = run(`sha256sum "${p}" | awk '{print $1}'`);
  return out.trim();
}

test('questionnaire ships and validates successfully', () => {
  // Copy CI answers to expected location
  copyFileSync('answers.ci.json', 'answers.json');
  
  run('npm run ship', { NODE_ENV: 'production', CI: '1' });
  run('node scripts/verify-agent-policy.js');
  run('node scripts/verify-artifacts.js');

  // Verify all expected outputs exist
  assert.ok(existsSync('outputs/manifest.json'));
  assert.ok(existsSync('outputs/generated-deliverable.md'));
  assert.ok(existsSync('outputs/generated-deliverable.html'));
  assert.ok(existsSync('outputs/generated-deliverable.pdf'));
  
  // Verify manifest structure
  const manifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  assert.ok(manifest.trace_id, 'manifest should have trace_id');
  assert.ok(manifest.artifacts, 'manifest should have artifacts');
  assert.ok(manifest.artifacts.md, 'manifest should have markdown artifact');
  assert.ok(manifest.artifacts.html, 'manifest should have HTML artifact');  
  assert.ok(manifest.artifacts.pdf, 'manifest should have PDF artifact');
  
  // Verify artifact sizes are reasonable
  assert.ok(manifest.artifacts.md.size > 1000, 'markdown should be substantial');
  assert.ok(manifest.artifacts.pdf.size > 5000, 'PDF should be substantial');
});

test('lecun mode respects budgets & integrity', () => {
  // Copy enterprise answers to expected location
  copyFileSync('answers.enterprise.ci.json', 'answers.json');
  
  run('npm run ship', { NODE_ENV: 'production', CI: '1' });
  run('node scripts/verify-agent-policy.js');
  run('node scripts/verify-artifacts.js');

  assert.ok(existsSync('outputs/manifest.json'));
  const manifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  assert.ok(manifest.trace_id, 'manifest should have trace_id');
  assert.ok(manifest.artifacts, 'manifest should have artifacts');
  assert.ok(manifest.artifacts.md, 'manifest should have markdown artifact');
  assert.ok(manifest.artifacts.pdf, 'manifest should have PDF artifact');
});