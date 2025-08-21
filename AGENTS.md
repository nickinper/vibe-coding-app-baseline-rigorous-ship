# AGENTS.md — Deliverable App (LeCun-Rigor Operating Rules)

## Vision & Modes
- Desktop-first deliverables generator; deterministic, production-ready.
- Modes: (1) Questionnaire (defaults), (2) LeCun (respect CI/IDE/CLI, enforce security/determinism).

## Hard Requirements
- Deny-by-default networking. Only hosts in configs/agent-net-allowlist.json.
- Determinism: TZ=UTC, LC_ALL=C, LANG=C; offline preferred; prompt/content hashing; idempotency keys.
- Least privilege: FS none/ro/rw (rw discouraged); exec whitelist via project scripts; token budgets enforced.
- Auditability: small diffs; update CODEOWNERS/docs; run verifiers; attach SHA-256 manifest & CI logs.

## Allowed project commands
- node scripts/verify-agent-policy.js
- npm run ship -- --answers=<answers.ci.json|answers.enterprise.ci.json>
- node scripts/verify-artifacts.js
- npm run test:e2e

## Must NOT without approval
- Change allowlist/secrets/CI perms, add new egress, push to protected branches, bypass verifiers.

## PR Template (Codex fills)
What/Why/How (commands run + hashes)/Security (egress, budgets, overrides)/Docs updated.

## Desktop bundling
Prefer Tauri; enforce egress allowlist; no shell access; document entitlements.