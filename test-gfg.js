const fs = require('fs');
const html = fs.readFileSync('gfg.html', 'utf8');

let score = '0';
let rank = 'N/A';
let total = '0';
let easy = 0, medium = 0, hard = 0;

// GeeksForGeeks changed their UI. Let's find patterns like:
// "codingScore":<score>
// "instituteRank":<rank>
// "totalProblemsSolved":<total>

function matchNum(regex) {
  const m = html.match(regex);
  return m ? m[1] : null;
}

const s = matchNum(/score_records_content.*?Overall Coding Score.*?(\d+)/is) || matchNum(/"codingScore":(\d+)/i) || 0;
const r = matchNum(/rankNum.*?(\d+)/is) || matchNum(/"instituteRank":(\d+)/i) || 'N/A';
const t = matchNum(/problem_heading.*?(\d+)/is) || matchNum(/"totalProblemsSolved":(\d+)/i) || 0;

console.log('Score:', s);
console.log('Rank:', r);
console.log('Total:', t);

const e = matchNum(/"Easy":"?(\d+)"?/i) || matchNum(/>Easy<.*?(\d+)/is) || 0;
const m = matchNum(/"Medium":"?(\d+)"?/i) || matchNum(/>Medium<.*?(\d+)/is) || 0;
const h = matchNum(/"Hard":"?(\d+)"?/i) || matchNum(/>Hard<.*?(\d+)/is) || 0;

console.log('Easy:', e);
console.log('Medium:', m);
console.log('Hard:', h);
