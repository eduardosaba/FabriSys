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

function analyze(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const isClient = src.includes("'use client'") || src.includes('"use client"');
  const usesSupabase = /supabase\./.test(src);
  if (!isClient || !usesSupabase) return null;

  const hasUseAuthImport = /useAuth/.test(src);
  const hasInjectedHook = /loading:\s*authLoading\s*\}/.test(src) || /loading:\s*authLoading\)/.test(src) || /const\s+\{\s*profile\s*,\s*loading:\s*authLoading\s*\}/.test(src);

  // naive detection: any useEffect body that references supabase but doesn't check authLoading
  const missingGuardInEffects = [];
  const useEffectRegex = /useEffect\s*\((?:async\s*)?(?:function\s*\w*\s*|\(\)\s*=>\s*|\(.*?\)\s*=>\s*)\s*{([\s\S]*?)},/g;
  let m;
  while ((m = useEffectRegex.exec(src)) !== null) {
    const body = m[1];
    if (/supabase\./.test(body) && !/if\s*\(authLoading\)/.test(body) && !/if\s*\(!profile\?\./.test(body)) {
      missingGuardInEffects.push({ index: m.index, snippet: body.trim().slice(0, 200).replace(/\n/g, ' ') });
    }
  }

  return {
    file: path.relative(root, filePath),
    isClient,
    usesSupabase,
    hasUseAuthImport,
    hasInjectedHook,
    missingGuardInEffectsCount: missingGuardInEffects.length,
    missingGuardInEffects: missingGuardInEffects.slice(0,3)
  };
}

const files = walk(appDir);
const need = [];
for (const f of files) {
  try {
    const r = analyze(f);
    if (r && (!r.hasUseAuthImport || !r.hasInjectedHook || r.missingGuardInEffectsCount>0)) need.push(r);
  } catch (e) {
    console.error('err', f, e.message);
  }
}

console.log('Candidates needing attention:', need.length);
for (const n of need) {
  console.log('\n-', n.file);
  console.log('  hasUseAuthImport:', n.hasUseAuthImport, 'hasInjectedHook:', n.hasInjectedHook, 'missingEffectGuards:', n.missingGuardInEffectsCount);
  n.missingGuardInEffects.forEach((e, i) => console.log(`   snippet${i+1}:`, e.snippet));
}

process.exit(0);
