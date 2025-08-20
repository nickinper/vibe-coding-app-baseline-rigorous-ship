#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
(async () => {
  const inHtml = process.argv[2] || path.join('outputs','generated-deliverable.html');
  const outPdf = (process.argv[3]) || inHtml.replace(/\.html$/i, '.pdf');
  if (!fs.existsSync(inHtml)) { console.error('✖ HTML not found:', inHtml); process.exit(1); }
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(inHtml), {waitUntil:'networkidle0'});
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: {top:'20mm', right:'15mm', bottom:'20mm', left:'15mm'} });
  await browser.close(); console.log('✔ Wrote', outPdf);
})();
