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

function standardize(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes("'use client'") && !src.includes('"use client"')) return false;
  if (!/supabase\./.test(src)) return false;
  if (!/useAuth/.test(src)) return false;

  let modified = false;
  // Find const { ... } = useAuth(); patterns
  src = src.replace(/const\s*\{([\s\S]*?)\}\s*=\s*useAuth\(\s*\)\s*;?/g, (match, inside) => {
    if (/loading\s*:\s*authLoading/.test(inside)) return match; // already standardized
    if (/loading\b/.test(inside)) {
      // replace loading with loading: authLoading
      const replaced = inside.replace(/\bloading\b/g, 'loading: authLoading');
      modified = true;
      return `const {${replaced}} = useAuth();`;
    }
    // add loading: authLoading after profile if profile exists, else append
    if (/\bprofile\b/.test(inside)) {
      const newInside = inside.replace(/(profile\b)(?![\s\S]*loading)/, 'profile, loading: authLoading');
      modified = true;
      return `const {${newInside}} = useAuth();`;
    }
    // no profile, just append loading
    const newInside = (inside.trim().length === 0) ? ' loading: authLoading ' : inside + ', loading: authLoading ';
    modified = true;
    return `const {${newInside}} = useAuth();`;
  });

  if (modified) fs.writeFileSync(filePath, src, 'utf8');
  return modified;
}

const files = walk(appDir);
let changed = [];
for (const f of files) {
  try {
    const ok = standardize(f);
    if (ok) changed.push(path.relative(root, f));
  } catch (e) {
    console.error('err', f, e.message);
  }
}

console.log('Standardized useAuth hooks:', changed.length);
for (const c of changed) console.log(' -', c);
process.exit(0);
