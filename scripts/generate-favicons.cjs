/* eslint-disable @typescript-eslint/no-require-imports */
// Usage: node scripts/generate-favicons.cjs [source-image-path]
// Requires: `pnpm add -D sharp to-ico` (or `npm i -D sharp to-ico`)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

async function generate(source) {
  const src = source || path.join(__dirname, '..', 'app', 'confectio.jpg');
  if (!fs.existsSync(src)) {
    console.error('Source image not found:', src);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(src).resize(size, size, { fit: 'cover' }).png().toBuffer();
    const fileName = `favicon-${size}x${size}.png`;
    fs.writeFileSync(path.join(outDir, fileName), buf);
    pngBuffers.push(buf);
    console.log('Written', fileName);
  }

  // Create favicon.ico from 16,32,48
  const icoBuf = await toIco([pngBuffers[0], pngBuffers[1], pngBuffers[2]]);
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), icoBuf);
  console.log('Written favicon.ico');

  // Create apple touch icon (180x180)
  const apple = await sharp(src).resize(180,180,{fit:'cover'}).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), apple);
  console.log('Written apple-touch-icon.png');

  // Optional: write favicon-32x32.png and favicon-16x16.png already written
  console.log('Favicons generated in public/ — refresh your app to see them.');
}

const arg = process.argv[2];
generate(arg).catch((err)=>{console.error(err); process.exit(1);});
