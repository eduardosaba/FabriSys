import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate(source) {
  const src = source || path.join(new URL('.', import.meta.url).pathname, '..', 'app', 'confectio.jpg');
  if (!fs.existsSync(src)) {
    console.error('Source image not found:', src);
    process.exit(1);
  }

  const outDir = path.join(new URL('.', import.meta.url).pathname, '..', 'public');
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

  // NOTE: favicon.ico generation is intentionally skipped here to avoid adding
  // an extra transitive dependency. If you need `favicon.ico`, generate it
  // in CI or locally with a tool like `png-to-ico` or manually combine PNGs.
  console.log('Skipped favicon.ico generation (generate in CI or manually if needed)');

  // Create apple touch icon (180x180)
  const apple = await sharp(src).resize(180,180,{fit:'cover'}).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), apple);
  console.log('Written apple-touch-icon.png');

  console.log('Favicons generated in public/ — refresh your app to see them.');
}

const arg = process.argv[2];
generate(arg).catch((err)=>{console.error(err); process.exit(1);});
