#!/usr/bin/env node
/**
 * Converte uma música para MP3 leve (128 kbps) e normaliza o volume, usando o ffmpeg instalado.
 *
 * Uso:
 *   node scripts/otimizar-audio.mjs minha-musica.wav
 *   node scripts/otimizar-audio.mjs musica.m4a --kbps 96 --sem-normalizar
 *
 * Gera ao lado do original:  <nome>-web.mp3   (toca em todos os aparelhos) -> envie este no admin.
 * Use apenas músicas que você tem licença para usar (autorais ou livres de direitos, como as da
 * Biblioteca de Áudio do YouTube). Músicas comerciais de streaming não podem ser usadas.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const entrada = args.find(a => !a.startsWith('--'));
const flag = n => args.includes(`--${n}`);
const valor = (n, padrao) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

if (!entrada) {
  console.log('Uso: node scripts/otimizar-audio.mjs <audio> [--kbps 128] [--sem-normalizar]');
  process.exit(1);
}
if (!existsSync(entrada)) {
  console.error(`Arquivo não encontrado: ${entrada}`);
  process.exit(1);
}
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  console.error('ffmpeg não encontrado no PATH. Instale em https://ffmpeg.org/download.html');
  process.exit(1);
}

const kbps = Math.max(64, parseInt(valor('kbps', '128'), 10) || 128);
const saida = join(dirname(resolve(entrada)), `${basename(entrada, extname(entrada))}-web.mp3`);
const tamanho = f => {
  const b = statSync(f).size;
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
};

console.log(`Original: ${entrada} (${tamanho(entrada)})`);
const filtros = flag('sem-normalizar') ? [] : ['-af', 'loudnorm=I=-18:TP=-1.5:LRA=11'];
const r = spawnSync(
  'ffmpeg',
  ['-y', '-hide_banner', '-loglevel', 'error', '-i', entrada, '-vn', ...filtros, '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, '-ar', '44100', saida],
  { stdio: 'inherit' }
);
if (r.status !== 0) {
  console.error('Falhou ao converter.');
  process.exit(r.status ?? 1);
}
console.log(`\nPronto: ${saida} (${tamanho(saida)})\nEnvie este arquivo no admin do cardápio.`);
