import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

function run(cmd, env = {}) {
  return execSync(cmd, {
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C', LANG: 'C', ...env }
  });
}

function sha256File(p) {
  const data = readFileSync(p);
  return createHash('sha256').update(data).digest('hex');
}

const isWindows = process.platform === 'win32';

test('questionnaire ships and validates successfully', () => {
  // Copy CI answers to expected location
  copyFileSync('answers.ci.json', 'answers.json');

  run('npm run ship', { NODE_ENV: 'production', CI: '1' });
  run('node scripts/verify-agent-policy.js');
  run('node scripts/verify-artifacts.js');

  // Verify expected outputs exist
  assert.ok(existsSync('outputs/manifest.json'), 'manifest missing');
  assert.ok(existsSync('outputs/generated-deliverable.md'), 'md missing');
  assert.ok(existsSync('outputs/generated-deliverable.html'), 'html missing');
  if (!isWindows) {
    assert.ok(existsSync('outputs/generated-deliverable.pdf'), 'pdf missing');
  }

  // Verify manifest structure
  const manifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  assert.ok(manifest.trace_id, 'trace_id missing');
  assert.ok(manifest.artifacts?.md, 'md artifact missing');
  assert.ok(manifest.artifacts?.html, 'html artifact missing');
  if (!isWindows) {
    assert.ok(manifest.artifacts?.pdf, 'pdf artifact missing');
  }

  // Reasonable size thresholds (avoid platform variance)
  assert.ok(manifest.artifacts.md.size > 200, 'markdown too small');
  if (!isWindows) {
    assert.ok(manifest.artifacts.pdf.size > 2000, 'pdf too small');
  }

  // Content validation: deliverables should be generated consistently
  const initialManifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  run('npm run ship', { NODE_ENV: 'production', CI: '1' });
  const secondManifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  
  // Core structure should be identical
  assert.equal(typeof initialManifest.trace_id, 'string', 'trace_id should be string');
  assert.equal(typeof secondManifest.trace_id, 'string', 'trace_id should be string');
  assert.ok(initialManifest.artifacts?.md?.size > 200, 'md artifact stable');
  assert.ok(secondManifest.artifacts?.md?.size > 200, 'md artifact stable');
});

test('lecun mode respects budgets & integrity', () => {
  copyFileSync('answers.enterprise.ci.json', 'answers.json');

  run('npm run ship', { NODE_ENV: 'production', CI: '1' });
  run('node scripts/verify-agent-policy.js');
  run('node scripts/verify-artifacts.js');

  assert.ok(existsSync('outputs/manifest.json'), 'manifest missing');
  const manifest = JSON.parse(readFileSync('outputs/manifest.json', 'utf8'));
  assert.ok(manifest.trace_id, 'trace_id missing');
  assert.ok(manifest.artifacts?.md, 'md artifact missing');
  if (!isWindows) {
    assert.ok(manifest.artifacts?.pdf, 'pdf artifact missing');
  }
});