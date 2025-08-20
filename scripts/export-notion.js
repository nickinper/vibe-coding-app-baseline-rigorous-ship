#!/usr/bin/env node
const fs = require('fs'); const path = require('path'); const { Client } = require('@notionhq/client');
const token = process.env.NOTION_TOKEN; const parentId = process.env.NOTION_PARENT_PAGE_ID;
if (!token || !parentId) { console.error('✖ Set NOTION_TOKEN and NOTION_PARENT_PAGE_ID'); process.exit(1); }
const inFile = process.argv[2] || path.join('outputs','generated-deliverable.md');
if (!fs.existsSync(inFile)) { console.error('✖ Markdown not found:', inFile); process.exit(1); }
const md = fs.readFileSync(inFile, 'utf8');
function mdToBlocks(md){ const lines=md.split(/\r?\n/); const blocks=[]; for (let line of lines){ if(!line.trim().length) continue;
  if(line.startsWith('### ')) blocks.push({heading_3:{rich_text:[{type:'text',text:{content:line.slice(4)}}]}});
  else if(line.startsWith('## ')) blocks.push({heading_2:{rich_text:[{type:'text',text:{content:line.slice(3)}}]}});
  else if(line.startsWith('# ')) blocks.push({heading_1:{rich_text:[{type:'text',text:{content:line.slice(2)}}]}});
  else blocks.push({paragraph:{rich_text:[{type:'text',text:{content:line}}]}});
} return blocks; }
(async () => {
  const notion = new Client({ auth: token }); const title = path.basename(inFile).replace(/\.md$/i, '');
  const blocks = mdToBlocks(md);
  const page = await notion.pages.create({ parent: { type: 'page_id', page_id: parentId },
    properties: { title: [{ type: 'text', text: { content: title } }] }, children: blocks });
  console.log('✔ Notion page created:', page.id);
})().catch(e => { console.error(e); process.exit(1); });
