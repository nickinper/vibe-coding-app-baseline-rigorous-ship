# Vibe Coding App Baseline (Rigorous Ship)

Professional due-diligence deliverable generator with Novice/Expert modes, rules engine, exporters (HTML, PDF, Notion, GitHub, Local), CI workflows, and hardened ship pipeline.

## Quick start
```bash
npm install
npm start                 # answer prompts → answers.json
npm run ship              # validate → generate → HTML → PDF (+ optional exports)
```
### Optional exports
```bash
# GitHub
export GITHUB_TOKEN=<token>
export GITHUB_OWNER=<user-or-org>
export GITHUB_REPO=<repo>
export GITHUB_BRANCH=deliverable   # optional

# Notion
export NOTION_TOKEN=<secret>
export NOTION_PARENT_PAGE_ID=<page-id>

# Local workspace
export SHIP_LOCAL_DIR=../my-workspace
```
Artifacts end up in `outputs/` with a `manifest.json` (trace ID, hashes, sizes).

## What’s inside
- `templates/report_novice.md`, `templates/report_expert.md`
- `rules/rules.json` (auto-inclusions: PII, payments, EU, small team, tight timeline)
- `questionnaire/*.json` (questions + schema)
- `scripts/*` (validators + exporters + ship)
- `.github/workflows/ship-deliverable.yml` (least-privilege, concurrency, artifacts)
- `.vscode/` tasks; `.cursor/` rules; `prompts/` for LLM lead devs
