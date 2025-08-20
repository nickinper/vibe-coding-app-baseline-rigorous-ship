#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({allErrors: true, strict: false});

const answersPath = path.join(process.cwd(), 'answers.json');
const schemaPath = path.join(__dirname, '..', 'questionnaire', 'answers.schema.json');

if (!fs.existsSync(answersPath)) { console.error('✖ answers.json not found. Run `npm start` first.'); process.exit(1); }
const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);
const ok = validate(answers);

if (!ok) {
  console.error('✖ Validation failed:');
  for (const err of validate.errors) console.error(`- ${err.instancePath || '(root)'} ${err.message}`);
  process.exit(2);
}
console.log('✔ answers.json is valid.');
