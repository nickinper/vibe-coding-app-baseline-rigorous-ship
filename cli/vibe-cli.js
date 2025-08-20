#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const questions = require(path.join(__dirname, '..', 'questionnaire', 'context-questions.json'));
let answers = {}; let i = 0;
function ask() {
  if (i < questions.questions.length) {
    rl.question(questions.questions[i].text + " ", (ans) => { answers[questions.questions[i].id] = ans; i++; ask(); });
  } else {
    fs.writeFileSync(path.join(process.cwd(), 'answers.json'), JSON.stringify(answers, null, 2));
    console.log("✔ Answers saved to answers.json. Next: npm run build:deliverable");
    rl.close();
  }
}
ask();
