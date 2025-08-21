# Agent Runtime Security (LR Standard)
- Deny-by-default networking; maintain allowlists for net & LLM endpoints.
- Cap LLM token budgets; log usage; prefer offline deterministic mode.
- Enforce FS mode: none/ro/rw (rw discouraged).
- Exec whitelist; limit to small, known binaries.
- Audit overrides: only with ENTERPRISE_POLICY_OVERRIDE=1 + expiry.
- Determinism note: CI and app set TZ=UTC, LC_ALL=C to eliminate locale/time drift from hashes and manifests.
