'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Save, X } from 'lucide-react';
import { PAGINA_ASPECTO, type OverlayPos } from '@/lib/cardapio-natal';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const btn =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50';

interface Props {
  titulo: string;
  base: ReactNode; // arte da página (imagem/vídeo) já renderizada
  overlayUrl: string;
  pos: OverlayPos | null; // null = preenche a página inteira
  onSalvar: (pos: OverlayPos | null) => Promise<boolean>;
  onFechar: () => void;
}

/** Posiciona e redimensiona a camada transparente: arraste para mover, canto inferior direito para redimensionar. */
export default function OverlayEditor({
  titulo,
  base,
  overlayUrl,
  pos,
  onSalvar,
  onFechar,
}: Props) {
  const [rect, setRect] = useState<OverlayPos>(pos ?? { x: 0, y: 0, w: 100, h: 100 });
  const [ratio, setRatio] = useState<number | null>(null); // largura/altura reais da imagem
  const [manter, setManter] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    modo: 'mover' | 'redimensionar';
    sx: number;
    sy: number;
    orig: OverlayPos;
  } | null>(null);

  // Altura (em % da página) que mantém a proporção da imagem para uma dada largura (em % da página)
  const alturaPara = (w: number, r: number) => (w * PAGINA_ASPECTO) / r;
  const larguraMax = (x: number, y: number, r: number | null) =>
    manter && r ? Math.min(100 - x, ((100 - y) * r) / PAGINA_ASPECTO) : 100 - x;

  // Lê as proporções reais da imagem; sem posição salva, começa "cabendo inteira" na página
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      setRatio(r);
      if (!pos) {
        let w = 100;
        let h = alturaPara(w, r);
        if (h > 100) {
          h = 100;
          w = (h * r) / PAGINA_ASPECTO;
        }
        setRect({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
      }
    };
    img.src = overlayUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayUrl]);

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = areaRef.current;
    if (!d || !el) return;
    const b = el.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / b.width) * 100;
    const dy = ((e.clientY - d.sy) / b.height) * 100;
    if (d.modo === 'mover') {
      setRect({
        ...d.orig,
        x: clamp(d.orig.x + dx, 0, 100 - d.orig.w),
        y: clamp(d.orig.y + dy, 0, 100 - d.orig.h),
      });
      return;
    }
    if (manter && ratio) {
      const w = clamp(d.orig.w + dx, 5, larguraMax(d.orig.x, d.orig.y, ratio));
      setRect({ ...d.orig, w, h: alturaPara(w, ratio) });
    } else {
      setRect({
        ...d.orig,
        w: clamp(d.orig.w + dx, 5, 100 - d.orig.x),
        h: clamp(d.orig.h + dy, 3, 100 - d.orig.y),
      });
    }
  };

  const iniciar = (e: React.PointerEvent, modo: 'mover' | 'redimensionar') => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { modo, sx: e.clientX, sy: e.clientY, orig: { ...rect } };
  };

  const mudarTamanho = (pct: number) => {
    // controle deslizante: largura em % da página, mantendo o centro
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const w = clamp(pct, 5, 100);
    const h = manter && ratio ? alturaPara(w, ratio) : rect.h * (w / rect.w);
    const hh = clamp(h, 3, 100);
    setRect({ x: clamp(cx - w / 2, 0, 100 - w), y: clamp(cy - hh / 2, 0, 100 - hh), w, h: hh });
  };

  const centralizar = () => setRect((r) => ({ ...r, x: (100 - r.w) / 2, y: (100 - r.h) / 2 }));

  const salvar = async (valor: OverlayPos | null) => {
    setSalvando(true);
    const ok = await onSalvar(
      valor
        ? {
            x: +valor.x.toFixed(2),
            y: +valor.y.toFixed(2),
            w: +valor.w.toFixed(2),
            h: +valor.h.toFixed(2),
          }
        : null
    );
    setSalvando(false);
    if (ok) onFechar();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-label={`Ajustar camada — ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-bold">Ajustar camada transparente — {titulo}</h2>
            <p className="text-xs text-gray-500">
              Arraste a imagem para mover e o canto inferior direito para redimensionar.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[360px_1fr]">
          <div
            ref={areaRef}
            className="relative mx-auto w-full max-w-[360px] touch-none select-none overflow-hidden rounded-md border border-gray-300 bg-black"
            style={{ aspectRatio: String(PAGINA_ASPECTO) }}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
          >
            {base}
            <div
              onPointerDown={(e) => iniciar(e, 'mover')}
              className="absolute cursor-move border-2 border-dashed border-red-500"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
              }}
            >
              <img
                src={overlayUrl}
                alt=""
                className="pointer-events-none h-full w-full"
                style={{ objectFit: 'fill' }}
                draggable={false}
              />
              <span
                onPointerDown={(e) => iniciar(e, 'redimensionar')}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm bg-white ring-2 ring-red-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="ov-tam" className="mb-1 block text-sm font-semibold">
                Tamanho: {Math.round(rect.w)}% da largura da página
              </label>
              <input
                id="ov-tam"
                type="range"
                min={5}
                max={100}
                value={Math.round(rect.w)}
                onChange={(e) => mudarTamanho(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manter}
                onChange={(e) => setManter(e.target.checked)}
              />
              Manter a proporção da imagem (recomendado)
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${btn} bg-gray-200 text-gray-800`}
                onClick={centralizar}
              >
                Centralizar
              </button>
              <button
                type="button"
                className={`${btn} border border-gray-300`}
                onClick={() => void salvar(null)}
                disabled={salvando}
                title="Volta ao comportamento padrão: a imagem cobre a página inteira"
              >
                Preencher a página inteira
              </button>
            </div>
            <p className="text-xs text-gray-500">
              “Preencher a página inteira” é o padrão para imagens no formato da página (9:16). Para
              logos, molduras e enfeites menores, ajuste aqui o tamanho e a posição.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-3 dark:border-gray-700">
          <button type="button" className={`${btn} border border-gray-300`} onClick={onFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${btn} bg-red-700 text-white hover:bg-red-800`}
            onClick={() => void salvar(rect)}
            disabled={salvando}
          >
            <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar posição'}
          </button>
        </div>
      </div>
    </div>
  );
}
