# Phase 2 — CI Quality + Secure Agents (Extended)

This patch adds:
- PR builds, npm caching, matrix (standard + enterprise) to ship workflow
- Agent policy verification before shipping (deny-by-default net, budgets, FS/exec rules)
- Artifact integrity verification (SHA-256 + size sanity + manifest checks)
- Desktop net-allowlist UI, enterprise policy overrides
- CODEOWNERS for governance

## Apply
```
# from repo root
unzip phase2_ci_quality_secure_agents_extended.zip
cp -r phase2-secure-extended/* .
git add .
git commit -m "ci: phase2 extended — matrix, policy verify, integrity, governance"
git push
```

## CI
- Runs for PRs and manual triggers.
- Exports deliverables to `deliverable` branch only for default matrix set when export_to_github=true.
- Uploads per-matrix artifacts with 21-day retention.
