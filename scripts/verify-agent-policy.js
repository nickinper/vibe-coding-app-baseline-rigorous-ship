#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const agentsDir = path.join(process.cwd(), 'agents');
const allowlistPath = path.join(process.cwd(), 'configs', 'agent-net-allowlist.json');
const overridesPath = path.join(process.cwd(), 'configs', 'policy-overrides.json');

function readJSON(p, fallback){ try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e){ return fallback; } }
function listAgents() {
  if (!fs.existsSync(agentsDir)) return [];
  return fs.readdirSync(agentsDir)
    .map(a => ({ name: a, manifest: path.join(agentsDir, a, 'manifest.json') }))
    .filter(x => fs.existsSync(x.manifest));
}

const allowCfg = readJSON(allowlistPath, { net:{allowed_hosts:[]}, llm:{paid_tier_hosts:[]} });
const overrides = readJSON(overridesPath, { enabled:false, rules:[] });

function validate(manifest, agentName) {
  const issues = [];
  const caps = manifest.capabilities || {};

  // Require fields
  if (!manifest.name) issues.push({type:'MANIFEST_NAME_MISSING'});
  if (!manifest.version) issues.push({type:'MANIFEST_VERSION_MISSING'});

  // Network policy
  const net = caps.net || { deny_all_by_default: true, allow: [] };
  if (net.deny_all_by_default !== true) issues.push({type:'NET_DEFAULT_ALLOW', msg:'deny_all_by_default must be true'});
  const globalAllow = (allowCfg.net && allowCfg.net.allowed_hosts) || [];
  const paid = (allowCfg.llm && allowCfg.llm.paid_tier_hosts) || [];
  for (const host of (net.allow || [])) {
    if (!globalAllow.includes(host) && !paid.includes(host)) {
      issues.push({type:'NET_HOST_DENY', host, msg:`Host not in allowlist: ${host}`});
    }
  }

  // FS policy
  const fsCap = caps.fs || { mode:'none' };
  if (!['none','ro','rw'].includes(fsCap.mode)) issues.push({type:'FS_MODE_INVALID', msg:`Invalid fs.mode: ${fsCap.mode}`});
  if (fsCap.mode === 'rw') issues.push({type:'FS_MODE_RW', msg:'RW is discouraged. Justify or change.'});

  // Exec policy
  const ex = caps.exec || { whitelist: [] };
  if (!Array.isArray(ex.whitelist)) issues.push({type:'EXEC_WHITELIST_INVALID'});
  if (Array.isArray(ex.whitelist) && ex.whitelist.length > 10) issues.push({type:'EXEC_WHITELIST_TOO_LARGE'});

  // LLM policy
  const llm = caps.llm || { providers:[], budget_tokens: 0 };
  if ((llm.budget_tokens||0) > 500000) issues.push({type:'LLM_BUDGET_HIGH'});

  return issues;
}

function applyOverrides(issues, agentName, manifest) {
  if (process.env.ENTERPRISE_POLICY_OVERRIDE !== '1') return { issues, applied: [] };
  if (!overrides.enabled) return { issues, applied: [] };
  const now = new Date();
  if (overrides.expires_at) {
    const exp = new Date(overrides.expires_at);
    if (isFinite(exp) && now > exp) return { issues, applied: [] };
  }
  const applied = [];
  for (const rule of overrides.rules || []) {
    if (rule.agent && rule.agent !== agentName) continue;
    if (rule.capability === 'net' && Array.isArray(rule.allow_extra_hosts)) {
      const before = issues.length;
      issues = issues.filter(i => !(i.type === 'NET_HOST_DENY' && rule.allow_extra_hosts.includes(i.host)));
      applied.push({ rule, removed: before - issues.length });
      manifest.capabilities = manifest.capabilities || {};
      manifest.capabilities.net = manifest.capabilities.net || { allow: [], deny_all_by_default: true };
      manifest.capabilities.net.allow = Array.from(new Set([...(manifest.capabilities.net.allow||[]), ...rule.allow_extra_hosts]));
    }
  }
  return { issues, applied };
}

function main() {
  const agents = listAgents();
  let total = 0;
  let appliedCount = 0;
  for (const a of agents) {
    const manifest = readJSON(a.manifest, {});
    let issues = validate(manifest, a.name);
    const res = applyOverrides(issues, a.name, manifest);
    issues = res.issues;
    appliedCount += (res.applied||[]).length;

    if (issues.length) {
      console.error(`✖ Agent ${a.name} failed policy:`);
      for (const i of issues) {
        console.error('  -', i.type, i.msg || '', i.host ? `(host=${i.host})` : '');
      }
      total += issues.length;
    } else {
      console.log(`✔ Agent ${a.name} policy OK${res.applied && res.applied.length ? ' (overrides applied)' : ''}`);
    }
  }
  if (appliedCount) {
    console.log(`⚠ Overrides applied: ${appliedCount} (ENTERPRISE_POLICY_OVERRIDE=1)`);
  }
  if (total > 0) process.exit(2);
  console.log('✅ All agent manifests pass policy.');
}
main();
