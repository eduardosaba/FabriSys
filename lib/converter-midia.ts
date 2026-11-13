/**
 * Conversão de imagens no navegador, antes do upload.
 * PNG/JPEG -> WebP (mantém transparência), com limite de largura. GIF NÃO é convertido (perderia a animação).
 */
export interface ResultadoConversao {
  file: File;
  convertido: boolean;
  tamanhoOriginal: number;
}

export async function converterParaWebp(
  file: File,
  maxLargura = 1600,
  qualidade = 0.86
): Promise<ResultadoConversao> {
  const original: ResultadoConversao = { file, convertido: false, tamanhoOriginal: file.size };
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/webp')
    return original;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('imagem inválida'));
      i.src = url;
    });
    const escala = Math.min(1, maxLargura / img.width);
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, w, h); // canvas começa transparente: o alfa é preservado
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', qualidade));
    // Navegadores sem suporte a WebP devolvem PNG: nesse caso (ou se ficou maior) mantém o original
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return original;
    const nome = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return {
      file: new File([blob], nome, { type: 'image/webp' }),
      convertido: true,
      tamanhoOriginal: file.size,
    };
  } catch {
    return original;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatarTamanho(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
