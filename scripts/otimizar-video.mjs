#!/usr/bin/env node
/**
 * Otimiza vídeos para o cardápio (leves e compatíveis com celular), usando o ffmpeg instalado.
 *
 * Uso:
 *   node scripts/otimizar-video.mjs entrada.mp4
 *   node scripts/otimizar-video.mjs entrada.mov --largura 720 --sem-webm
 *
 * Gera ao lado do arquivo original:
 *   <nome>-web.mp4   (H.264 — toca em TODOS os aparelhos, inclusive iPhone) -> use este
 *   <nome>-web.webm  (VP9 — menor, mas nem todo iPhone antigo reproduz)      -> opcional
 *
 * Remove o áudio (os vídeos do cardápio tocam sem som) e limita a largura (padrão 1080 px).
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
  console.log('Uso: node scripts/otimizar-video.mjs <video> [--largura 1080] [--sem-webm] [--com-audio]');
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

const largura = Math.max(240, parseInt(valor('largura', '1080'), 10) || 1080);
const base = join(dirname(resolve(entrada)), basename(entrada, extname(entrada)));
// só reduz (nunca amplia) e mantém dimensões pares (exigência do H.264)
const filtro = `scale='min(${largura},iw)':-2`;
const audio = flag('com-audio') ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an'];

const tamanho = f => {
  const b = statSync(f).size;
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
};

function rodar(titulo, saida, params) {
  console.log(`\n→ ${titulo}`);
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', entrada, ...params, saida], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`Falhou ao gerar ${saida}`);
    process.exit(r.status ?? 1);
  }
  console.log(`  ${saida}  (${tamanho(saida)})`);
}

console.log(`Original: ${entrada} (${tamanho(entrada)})`);

rodar('MP4 (H.264) — recomendado', `${base}-web.mp4`, [
  '-vf', filtro, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...audio,
]);

if (!flag('sem-webm')) {
  rodar('WebM (VP9) — opcional', `${base}-web.webm`, [
    '-vf', filtro, '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', ...(flag('com-audio') ? ['-c:a', 'libopus'] : ['-an']),
  ]);
}

console.log('\nPronto! Envie o arquivo -web.mp4 no admin do cardápio.');
