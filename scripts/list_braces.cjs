const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'insumos', 'lotes', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
const lines = s.split(/\r?\n/);
let pos = 0;
let opens = [];
let closes = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    pos++;
    if (ch === '{') opens.push({line: i+1, col: j+1});
    if (ch === '}') closes.push({line: i+1, col: j+1});
  }
  pos++; // newline
}
console.log('opens', opens.length, 'closes', closes.length);
console.log('last open at', opens[opens.length-1]);
console.log('last close at', closes[closes.length-1]);
console.log('First 10 opens:');
console.log(opens.slice(0,10));
console.log('Last 10 closes:');
console.log(closes.slice(-10));
