#!/usr/bin/env node
const fs = require('fs');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

const TOKEN = process.env.UI_ADMIN_TOKEN || '';
const PORT = process.env.PORT || 5173;
const cfgPath = path.join(process.cwd(), 'configs', 'agent-net-allowlist.json');

function load(){ try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch(e){ return { llm:{allowed_hosts:[], paid_tier_hosts:[]}, net:{allowed_hosts:[], deny_all_by_default:true} }; } }
function save(cfg){ fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2)); }

function auth(req,res,next){
  if (!TOKEN) return res.status(500).send('UI_ADMIN_TOKEN not set');
  if ((req.headers['x-admin-token']||'') !== TOKEN) return res.status(401).send('unauthorized');
  next();
}

app.get('/config', auth, (req,res)=> res.json(load()));

app.post('/config', auth, (req,res)=>{
  const cfg = load();
  const body = req.body || {};
  if (body.llm) cfg.llm = body.llm;
  if (body.net) cfg.net = body.net;
  save(cfg);
  res.json({ok:true, cfg});
});

app.post('/allowlist/add', auth, (req,res)=>{
  const {host, kind} = req.body || {};
  if (!host || !kind) return res.status(400).json({ok:false, error:'host and kind required'});
  const cfg = load();
  if (!cfg[kind]) return res.status(400).json({ok:false, error:'invalid kind'});
  const arr = cfg[kind].allowed_hosts || [];
  if (!arr.includes(host)) arr.push(host);
  cfg[kind].allowed_hosts = arr;
  save(cfg);
  res.json({ok:true, cfg});
});

app.post('/allowlist/remove', auth, (req,res)=>{
  const {host, kind} = req.body || {};
  const cfg = load();
  if (!cfg[kind]) return res.status(400).json({ok:false, error:'invalid kind'});
  cfg[kind].allowed_hosts = (cfg[kind].allowed_hosts||[]).filter(h=>h!==host);
  save(cfg);
  res.json({ok:true, cfg});
});

app.listen(PORT, ()=>{
  console.log(`🔐 Net Allowlist UI http://localhost:${PORT}`);
});
