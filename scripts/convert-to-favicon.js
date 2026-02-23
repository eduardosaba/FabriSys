#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function main(){
  const input = process.argv[2];
  const output = process.argv[3] || 'favicon1.ico';
  if(!input){
    console.error('Usage: node scripts/convert-to-favicon.js <input.png> [output.ico]');
    process.exit(1);
  }

  const sizes = [16, 32, 48, 64, 128, 256];
  try{
    const buffers = [];
    for(const s of sizes){
      const buf = await sharp(input).resize(s, s, { fit: 'contain' }).png().toBuffer();
      buffers.push(buf);
    }

    const icoBuffer = await pngToIco(buffers);
    await fs.promises.writeFile(output, icoBuffer);
    console.log('favicon criado:', output);
  }catch(err){
    console.error('Erro ao gerar favicon:', err);
    process.exit(2);
  }
}

main();
