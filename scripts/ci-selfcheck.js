#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');

const wf = '.github/workflows/ship-deliverable.yml';
const yml = fs.readFileSync(wf, 'utf8');

const req = [
  'matrix:',
  'answers.ci.json',
  'answers.enterprise.ci.json',
  'verify-agent-policy.js',
  'verify-artifacts.js',
  'actions/upload-artifact@',
  'Export to deliverable branch'
];

const missing = req.filter(k => !yml.includes(k));
if (missing.length) {
  console.error('CI SELF-CHECK ❌ Missing:\n - ' + missing.join('\n - '));
  process.exit(1);
}
console.log('CI SELF-CHECK ✅ Structure OK');