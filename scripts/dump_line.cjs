const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'insumos', 'lotes', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
const lines = s.split(/\r?\n/);
const i = 635; // 0-based index for line 636
const line = lines[i];
console.log('LINE', i+1, line);
for (let j = 0; j < line.length; j++) {
  const ch = line[j];
  process.stdout.write(j+1+':'+ch+'('+ch.charCodeAt(0)+') ');
}
process.stdout.write('\n');
