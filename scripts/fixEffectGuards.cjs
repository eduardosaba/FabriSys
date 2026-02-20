const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'app');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (/\.tsx?$/.test(name)) files.push(full);
  }
  return files;
}

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes("'use client'") && !src.includes('"use client"')) return false;
  if (!/supabase\./.test(src)) return false;

  let modified = false;
  // Find useEffect occurrences and inject guards when needed
  src = src.replace(/useEffect\s*\((\s*(?:async\s*)?(?:function\s*\w*\s*|\(.*?\)\s*=>\s*|\(\)\s*=>\s*)\s*{)([\s\S]*?)(^\s*\}\s*,)/mg, (match, opening, body, closing) => {
    if (!/supabase\./.test(body)) return match;
    if (/if\s*\(authLoading\)/.test(body) || /if\s*\(!profile\?\./.test(body) || /if\s*\(!profile\)/.test(body)) return match;
    const guard = '\n    if (typeof authLoading !== "undefined" && authLoading) return;\n    if (typeof profile === "undefined" || !profile?.organization_id) return;\n';
    modified = true;
    return 'useEffect(' + opening + guard + body + closing;
  });

  if (modified) fs.writeFileSync(filePath, src, 'utf8');
  return modified;
}

const files = walk(appDir);
let changed = [];
for (const f of files) {
  try {
    const ok = fixFile(f);
    if (ok) changed.push(path.relative(root, f));
  } catch (e) {
    console.error('fail', f, e.message);
  }
}

console.log('Patched useEffect guards:', changed.length);
for (const c of changed) console.log(' -', c);
process.exit(0);
