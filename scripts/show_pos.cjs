const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'insumos', 'lotes', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
const idx = 1232;
let line = 1, col = 1;
for (let i = 0; i < idx && i < s.length; i++) {
  if (s[i] === '\n') { line++; col = 1; } else col++;
}
console.log('Index', idx, 'Line', line, 'Col', col);
const lines = s.split(/\r?\n/);
for (let i = Math.max(0, line-6); i < Math.min(lines.length, line+5); i++) {
  const num = i+1;
  console.log((num===line?'=>':'  ')+('   '+num).slice(-4), '|', lines[i]);
}
