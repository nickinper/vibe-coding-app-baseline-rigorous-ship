#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function boolify(v){ if(typeof v==='boolean') return v; if(!v) return false; const s=String(v).trim().toLowerCase(); return ['y','yes','true','1'].includes(s); }
function num(v,d=0){ const n=Number(v); return isNaN(n)? d : n; }

const cwd = process.cwd();
const answersPath = path.join(cwd, 'answers.json');
if (!fs.existsSync(answersPath)) { console.error("✖ answers.json not found. Run `npm start` first."); process.exit(1); }
const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

const deliverables = (answers.deliverables||'').split(',').map(s=>s.trim()).filter(Boolean);
const experience = String(answers.experience_level||'').toLowerCase();
let mode = String(answers.mode||'').toLowerCase();
if (!mode) mode = experience === 'advanced' ? 'expert' : 'novice';

const ctx = {
  project: { name: answers.project_name || 'Untitled' },
  owner: { name: answers.owner_name || 'Owner' },
  date: new Date().toISOString().slice(0,10),
  intent: { one_liner: answers.intent_one_liner || '' },
  audience: answers.audience || '',
  deliverables: deliverables.join(', ') || 'report',
  team: { size: num(answers.team_size, 1) },
  timeline: { weeks: num(answers.timeline_weeks, 4) },
  region: (answers.region || 'us').toLowerCase(),
  payments: boolify(answers.payments),
  data: { pii: boolify(answers.contains_pii) },
  device: answers.device_specs || '',
  experience: experience || 'novice',
  mode
};

const arch = {
  stack: (deliverables.includes('web')||deliverables.includes('api')) ? 'Next.js + Node API' : 'Static Docs',
  hosting: ctx.team.size <= 2 ? 'Managed Host' : 'Cloud (custom)',
  db: ctx.data.pii ? `Managed Postgres (${ctx.region.toUpperCase()})` : 'Lite DB or KV',
  auth: (ctx.payments || ctx.data.pii) ? 'Hosted Auth (OIDC/OAuth)' : 'Email-link',
  alternatives: 'Alt1: Monolith; Alt2: Modular services',
  rationale: `team=${ctx.team.size}, exp=${ctx.experience}, pii=${ctx.data.pii}, payments=${ctx.payments}, region=${ctx.region}`
};

const security = {
  classification: ctx.data.pii ? 'PII' : 'Low-risk data',
  residency: ctx.region.toUpperCase(),
  stride_summary: 'S/T/R/I/D/E controls applied to inputs, auth, storage, rate limits',
  spoofing: 'OIDC/OAuth, short-lived sessions',
  tampering: 'Parameterized queries, signed requests',
  repudiation: 'Append-only audit log',
  info: 'Private buckets, signed URLs, DLP on PII',
  dos: 'Rate limiting + backpressure',
  eop: 'RBAC + least privilege'
};

const nfr = {
  latency_ms: ctx.experience === 'expert' ? 150 : 250,
  slo: ctx.experience === 'expert' ? '99.9%' : '99.5%',
  budget: ctx.team.size <= 2 ? 200 : 1000
};

const tests = {
  coverage_now: ctx.experience === 'expert' ? '85%' : '80%',
  coverage_rc: '90%',
  mutation: ctx.experience === 'expert' ? 'core scoring, auth' : 'auth'
};

const plan = {
  p1: { w: Math.max(2, Math.min(6, (ctx.timeline.weeks/2|0) || 2)), scope: 'Auth + Core CRUD + Basic tests' },
  p2: { w: Math.max(2, Math.min(8, ctx.timeline.weeks - ((ctx.timeline.weeks/2|0) || 2))), scope: 'Analytics + Polishing + Docs' },
  risks: 'scope creep; under-specified NFRs',
  mitigations: 'explicit ACs; phased delivery; guardrails in CI'
};

const trace = { id: Math.random().toString(36).slice(2,10) };

const rules = JSON.parse(fs.readFileSync(path.join(__dirname,'..','rules','rules.json'),'utf8'));
let templateFile = 'report_novice.md';
for (const sel of rules.template_selection) {
  if (sel.if && sel.if.default) { templateFile = sel.use; break; }
  if (sel.if && sel.if.mode && sel.if.mode === ctx.mode) { templateFile = sel.use; break; }
  if (sel.if && sel.if.experience_level && sel.if.experience_level === experience) { templateFile = sel.use; break; }
}
const template = fs.readFileSync(path.join(__dirname,'..','templates',templateFile),'utf8');

let inclusions = [];
for (const inc of rules.inclusions) {
  const cond = inc.if || {}; let ok = true;
  if ('payments' in cond) ok = ok && (ctx.payments === cond.payments);
  if ('contains_pii' in cond) ok = ok && (ctx.data.pii === cond.contains_pii);
  if ('region' in cond) ok = ok && (ctx.region === cond.region);
  if ('team_size_max' in cond) ok = ok && (ctx.team.size <= cond.team_size_max);
  if ('timeline_weeks_max' in cond) ok = ok && (ctx.timeline.weeks <= cond.timeline_weeks_max);
  if (ok) inclusions.push(inc.add);
}
const inclusionsText = inclusions.length ? inclusions.join('') : 'None';

function render(tpl, map) {
  return tpl.replace(/{{\s*([\w\.]+)\s*}}/g, (_, key) => {
    const parts = key.split('.'); let v = map;
    for (const p of parts) v = (v && v[p]!==undefined) ? v[p] : '';
    return String(v);
  });
}

const dataMap = {
  project: { name: ctx.project.name },
  owner: { name: ctx.owner.name },
  date: new Date().toISOString().slice(0,10),
  intent: { one_liner: ctx.intent.one_liner },
  audience: ctx.audience,
  deliverables: ctx.deliverables,
  team: { size: ctx.team.size },
  timeline: { weeks: ctx.timeline.weeks },
  region: ctx.region,
  payments: ctx.payments,
  data: { pii: ctx.data.pii },
  arch, security, nfr, tests, plan, trace,
  req: { functional: 'F-1 core, F-2 auth, F-3 persistence' },
  auto: { inclusions: inclusionsText }
};

const outDir = path.join(cwd, 'outputs'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'generated-deliverable.md');
fs.writeFileSync(outFile, render(template, dataMap), 'utf8');
console.log("✔ Generated " + outFile + " using template " + templateFile);
