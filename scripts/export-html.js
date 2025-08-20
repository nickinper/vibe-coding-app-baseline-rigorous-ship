#!/usr/bin/env node
const fs = require('fs'); const path = require('path'); const { marked } = require('marked');
const inFile = process.argv[2] || path.join('outputs','generated-deliverable.md');
const outFile = (process.argv[3]) || inFile.replace(/\.md$/i, '.html');
const css = `body{font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji;margin:40px}h1,h2,h3{margin-top:1.6em}code,pre{background:#f6f8fa;padding:2px 4px}pre{padding:12px;overflow:auto}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px}.page-break{page-break-before:always}`;
if (!fs.existsSync(inFile)) { console.error('✖ Markdown not found:', inFile); process.exit(1); }
const md = fs.readFileSync(inFile, 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${marked.parse(md)}</body></html>`;
fs.writeFileSync(outFile, html); console.log('✔ Wrote', outFile);
