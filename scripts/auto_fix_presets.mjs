import fs from 'fs';
import path from 'path';

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return { r, g, b };
}

function rgbToHex({r,g,b}){
  const toHex = (n)=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function srgbToLinear(c) { c = c/255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
function relativeLuminance(hex){ const {r,g,b}=hexToRgb(hex); return 0.2126*srgbToLinear(r)+0.7152*srgbToLinear(g)+0.0722*srgbToLinear(b); }
function contrastRatio(a,b){ try{ const L1=relativeLuminance(a); const L2=relativeLuminance(b); const lighter=Math.max(L1,L2); const darker=Math.min(L1,L2); return (lighter+0.05)/(darker+0.05); }catch(e){ void e; return null;} }

function darkenHex(hex, factor){ const c=hexToRgb(hex); return rgbToHex({ r: c.r * factor, g: c.g * factor, b: c.b * factor }); }

function extractPresets(fileContent) {
  const marker = 'export const THEME_PRESETS';
  const idx = fileContent.indexOf(marker);
  if (idx === -1) throw new Error('THEME_PRESETS not found');
  const eq = fileContent.indexOf('=', idx);
  const start = fileContent.indexOf('[', eq);
  if (start === -1) throw new Error('Start bracket not found');
  let i = start; let depth = 0;
  for (; i < fileContent.length; i++){
    const ch = fileContent[i];
    if (ch === '[') depth++; else if (ch === ']') { depth--; if (depth===0) break; }
  }
  return { start, end: i+1, text: fileContent.substring(start, i+1) };
}

function sanitizeToJsonLike(input) {
  let s = input;
  s = s.replace(/\/\*[\s\S]*?\*\//g,'');
  s = s.replace(/\/\/.*$/gm,'');
  s = s.replace(/\r\n|\r/g,'\n');
  s = s.replace(/(?<!["'])\b([a-zA-Z0-9_]+)\b\s*:/g,'"$1":');
  s = s.replace(/'([^']*)'/g, function(_, g1){ return '"'+g1.replace(/\\"/g,'\\"')+'"'; });
  s = s.replace(/,\s*([}\]])/g,'$1');
  return s;
}

function fixPresets() {
  const filePath = path.join(new URL('.', import.meta.url).pathname, '..', 'components', 'configuracao', 'theme-config.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const { start, end, text } = extractPresets(content);
  const jsonLike = sanitizeToJsonLike(text);
  const presets = JSON.parse(jsonLike);

  let changed = false;
  presets.forEach((preset) => {
    ['light','dark'].forEach((mode) => {
      const colors = (preset.colors && preset.colors[mode]) || {};
      const pairs = [ {aKey:'background', bKey:'text'}, {aKey:'sidebar_bg', bKey:'sidebar_text'}, {aKey:'header_bg', bKey:'text'} ];
      pairs.forEach(({aKey,bKey}) => {
        const a = colors[aKey]; const b = colors[bKey] || colors['text'];
        if (!a || !b) return;
        let ratio = contrastRatio(a,b);
        if (ratio >= 4.5) return;
        let factor = 0.92;
        let cur = a;
        for (let i=0;i<30;i++){
          cur = darkenHex(cur, factor);
          ratio = contrastRatio(cur, b);
          if (ratio && ratio >= 4.5) break;
        }
        if (ratio && ratio >= 4.5) {
          colors[aKey] = cur;
          changed = true;
          console.log(`Adjusted preset '${preset.name}' ${mode} ${aKey}: ${a} -> ${cur} (ratio ${ratio.toFixed(2)})`);
        } else {
          let cur2 = a;
          for (let i=0;i<60;i++){ cur2 = darkenHex(cur2, 0.9); const r2=contrastRatio(cur2,b); if(r2 && r2>=4.5){ colors[aKey]=cur2; changed=true; console.log(`Adjusted aggressively '${preset.name}' ${mode} ${aKey}: ${a} -> ${cur2} (ratio ${r2.toFixed(2)})`); break; }}
        }
      });
    });
  });

  if (!changed) {
    console.log('No changes required');
    return;
  }

  const newArrStr = JSON.stringify(presets, null, 2);
  const newContent = content.slice(0, start) + newArrStr + content.slice(end);
  fs.writeFileSync(filePath + '.bak', content, 'utf8');
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('theme-config.ts updated (backup created at theme-config.ts.bak)');
}

fixPresets();
