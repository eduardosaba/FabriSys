const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'insumos', 'lotes', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
let stack = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{') stack.push({ch, idx: i});
  if (ch === '}') {
    if (stack.length === 0) { console.log('Unmatched } at', i); process.exit(0); }
    stack.pop();
  }
}
if (stack.length === 0) console.log('All braces matched');
else console.log('Unclosed { at', stack[stack.length-1].idx, 'remaining', stack.length);
