const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return { r, g, b };
}

function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  try {
    const L1 = relativeLuminance(hex1);
    const L2 = relativeLuminance(hex2);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch (e) {
    return null;
  }
}

function sanitizeToJsonLike(input) {
  let s = input;
  // Remove block comments and line comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/\/\/.*$/gm, '');
  // Normalize newlines
  s = s.replace(/\r\n|\r/g, '\n');
  // Add quotes to unquoted keys (avoid quoting already quoted keys)
  s = s.replace(/(?<!["'])\b([a-zA-Z0-9_]+)\b\s*:/g, '"$1":');
  // Convert single-quoted strings to double-quoted
  s = s.replace(/'([^']*)'/g, function(_, g1){
    return '"' + g1.replace(/\\"/g, '\\"') + '"';
  });
  // Remove trailing commas
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

function extractPresets(fileContent) {
  const marker = 'export const THEME_PRESETS';
  const idx = fileContent.indexOf(marker);
  if (idx === -1) throw new Error('THEME_PRESETS not found');
  const eq = fileContent.indexOf('=', idx);
  const start = fileContent.indexOf('[', eq);
  if (start === -1) throw new Error('Start bracket not found');
  let i = start;
  let depth = 0;
  for (; i < fileContent.length; i++) {
    const ch = fileContent[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return fileContent.substring(start, i + 1);
      }
    }
  }
  throw new Error('Could not extract presets array');
}

function analyze() {
  const filePath = path.join(__dirname, '..', 'components', 'configuracao', 'theme-config.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const arrStr = extractPresets(content);
  const jsonLike = sanitizeToJsonLike(arrStr);
  let presets = null;
  try {
    // debug: dump jsonLike snippet
    console.log('--- JSONLIKE SNIPPET START ---');
    console.log(jsonLike.slice(0, 3000));
    console.log('--- JSONLIKE SNIPPET END ---');
    presets = JSON.parse(jsonLike);
  } catch (e) {
    console.error('Erro ao converter presets para JSON:', e.message);
    console.error('Parte do conteúdo transformado (trecho):', jsonLike.slice(0, 1000));
    process.exit(1);
  }
  console.log('Parsed presets count:', Array.isArray(presets) ? presets.length : 'not-array');
  try { fs.writeFileSync(path.join(__dirname, 'tmp_presets_jsonlike.txt'), jsonLike); } catch(e) {}

  const report = [];
  presets.forEach((preset) => {
    const entry = { name: preset.name, checks: [] };
    ['light', 'dark'].forEach((mode) => {
      const colors = (preset.colors && preset.colors[mode]) || {};
      const bg = colors.background || (mode === 'light' ? '#ffffff' : '#111827');
      const text = colors.text || (mode === 'light' ? '#111827' : '#f9fafb');
      const sidebarBg = colors.sidebar_bg || (mode === 'light' ? '#f3f4f6' : '#374151');
      const sidebarText = colors.sidebar_text || (mode === 'light' ? '#1f2937' : '#f3f4f6');
      const headerBg = colors.header_bg || sidebarBg;

      const pairs = [
        { a: bg, b: text, label: 'background / text' },
        { a: sidebarBg, b: sidebarText, label: 'sidebar_bg / sidebar_text' },
        { a: headerBg, b: text, label: 'header_bg / text' },
      ];

      pairs.forEach((p) => {
        const ratio = contrastRatio(p.a, p.b);
        entry.checks.push({ mode, label: p.label, a: p.a, b: p.b, ratio });
      });
    });
    report.push(entry);
  });

  console.log('WCAG Contrast Report (ratios). Recommended: >=4.5 for normal text, >=3 for large text.');
  report.forEach((r) => {
    console.log('\n---- ' + r.name + ' ----');
    r.checks.forEach((c) => {
      const ratioStr = c.ratio ? c.ratio.toFixed(2) : 'N/A';
      const pass = c.ratio ? (c.ratio >= 4.5 ? 'AAA' : c.ratio >= 3 ? 'AA' : 'FAIL') : 'N/A';
      console.log(`${c.mode} | ${c.label} : ${c.a} vs ${c.b} -> ${ratioStr} (${pass})`);
    });
  });
}

analyze();
