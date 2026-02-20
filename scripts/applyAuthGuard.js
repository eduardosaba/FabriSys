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

function applyGuardToFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes("'use client'") && !src.includes('"use client"')) return false;
  if (!src.includes('supabase.')) return false;

  let modified = false;

  // Ensure import exists
  if (!/useAuth/.test(src)) {
    // insert after other imports (after first import block)
    const importMatch = src.match(/(^import[\s\S]*?;\n)(?=[^import])/m);
    if (importMatch) {
      const insertAt = importMatch.index + importMatch[0].length;
      src =
        src.slice(0, insertAt) + "import { useAuth } from '@/lib/auth';\n" + src.slice(insertAt);
      modified = true;
    } else {
      // fallback: add at top
      src = "import { useAuth } from '@/lib/auth';\n" + src;
      modified = true;
    }
  }

  // Add const { profile, loading: authLoading } = useAuth(); inside component body
  // Find export default function ...() { pattern
  const funcMatch = src.match(/export\s+default\s+function\s+[A-Za-z0-9_]*\s*\([^)]*\)\s*{/m);
  if (funcMatch) {
    const insertIdx = funcMatch.index + funcMatch[0].length;
    const after = src.slice(insertIdx, insertIdx + 200);
    if (!/useAuth\(\)/.test(after)) {
      const injection = '\n  const { profile, loading: authLoading } = useAuth();\n';
      src = src.slice(0, insertIdx) + injection + src.slice(insertIdx);
      modified = true;
    }
  } else {
    // Try to detect arrow function components assigned to a const, e.g. `const Page = () => {` with `export default Page;`
    const varMatch = src.match(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{/m);
    if (varMatch) {
      const name = varMatch[1];
      const exportDefaultRegex = new RegExp('export\\s+default\\s+' + name + '\\b');
      if (exportDefaultRegex.test(src)) {
        const insertIdx = varMatch.index + varMatch[0].length;
        const after = src.slice(insertIdx, insertIdx + 200);
        if (!/useAuth\(\)/.test(after)) {
          const injection = '\n  const { profile, loading: authLoading } = useAuth();\n';
          src = src.slice(0, insertIdx) + injection + src.slice(insertIdx);
          modified = true;
        }
      }
    }
  }

  // Add guard inside useEffect blocks that reference supabase
  // For each useEffect occurrence, if inside effect body there's 'supabase' and not guard, add guard at top of effect
  src = src.replace(
    /useEffect\s*\((\s*function\s*\w*\s*\(|\s*\(\)\s*=>\s*\(|\s*async\s*function\s*\(|\s*async\s*\(\)\s*=>\s*\(){([\s\S]*?)^\s*\}\s*,/gm,
    (match, p1, body) => {
      if (!/supabase\./.test(body)) return match;
      if (/if\s*\(authLoading\)/.test(body) || /if\s*\(!profile\?\./.test(body)) return match;
      // inject guard after opening brace
      const injected = match.replace(
        /useEffect\s*\(([\s\S]*?\(){/,
        (m) => m + '\n    if (authLoading) return;\n    if (!profile?.organization_id) return;'
      );
      modified = true;
      return injected;
    }
  );

  if (modified) fs.writeFileSync(filePath, src, 'utf8');
  return modified;
}

const files = walk(appDir);
let changed = [];
for (const f of files) {
  try {
    const ok = applyGuardToFile(f);
    if (ok) changed.push(path.relative(root, f));
  } catch (e) {
    console.error('Failed to process', f, e);
  }
}

console.log('Modified files:', changed.length);
changed.forEach((c) => console.log(' -', c));

if (changed.length === 0) process.exit(0);
else process.exit(0);
