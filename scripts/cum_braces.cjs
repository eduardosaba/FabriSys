const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'insumos', 'lotes', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
const lines = s.split(/\r?\n/);
let cum = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  cum += opens - closes;
  if (i+1 >= 600) console.log((i+1)+': opens='+opens+' closes='+closes+' cum='+cum+' | '+line);
}
console.log('Final cum', cum);
