'use client';

import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { PAGINA_ASPECTO, type AreaMidia, type MidiaTipo } from '@/lib/cardapio-natal';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const btn =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50';

interface AreaEdit extends Omit<AreaMidia, 'url' | 'tipo'> {
  url: string | null;
  tipo: MidiaTipo | null;
}

interface Props {
  titulo: string;
  base: ReactNode; // arte da página (imagem/vídeo) já renderizada
  overlayUrl: string | null;
  areas: AreaMidia[];
  onUpload: (file: File) => Promise<{ tipo: MidiaTipo; url: string } | null>;
  onSalvar: (areas: AreaMidia[]) => Promise<boolean>;
  onFechar: () => void;
}

/** Editor visual: desenha retângulos sobre a página e define a mídia (vídeo/GIF/imagem) de cada um. */
export default function AreasEditor({
  titulo,
  base,
  overlayUrl,
  areas: inicial,
  onUpload,
  onSalvar,
  onFechar,
}: Props) {
  const [areas, setAreas] = useState<AreaEdit[]>(inicial.map((a) => ({ ...a })));
  const [sel, setSel] = useState<number | null>(inicial.length ? 0 : null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    idx: number;
    modo: 'mover' | 'redimensionar';
    sx: number;
    sy: number;
    orig: AreaEdit;
  } | null>(null);

  const atualizar = (idx: number, patch: Partial<AreaEdit>) =>
    setAreas((l) => l.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = areaRef.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / r.width) * 100;
    const dy = ((e.clientY - d.sy) / r.height) * 100;
    if (d.modo === 'mover') {
      atualizar(d.idx, {
        x: clamp(d.orig.x + dx, 0, 100 - d.orig.w),
        y: clamp(d.orig.y + dy, 0, 100 - d.orig.h),
      });
    } else {
      atualizar(d.idx, {
        w: clamp(d.orig.w + dx, 3, 100 - d.orig.x),
        h: clamp(d.orig.h + dy, 2, 100 - d.orig.y),
      });
    }
  };

  const iniciar = (e: React.PointerEvent, idx: number, modo: 'mover' | 'redimensionar') => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSel(idx);
    drag.current = { idx, modo, sx: e.clientX, sy: e.clientY, orig: { ...areas[idx] } };
  };

  const adicionar = () => {
    setAreas((l) => [...l, { x: 25, y: 35, w: 50, h: 25, tipo: null, url: null, repetir: true }]);
    setSel(areas.length);
  };

  const remover = (idx: number) => {
    setAreas((l) => l.filter((_, i) => i !== idx));
    setSel(null);
  };

  const enviar = async (idx: number, file: File) => {
    setEnviando(true);
    const r = await onUpload(file);
    setEnviando(false);
    if (r) atualizar(idx, { tipo: r.tipo, url: r.url });
  };

  const salvar = async () => {
    const validas = areas.filter(
      (a): a is AreaEdit & { url: string; tipo: MidiaTipo } => !!a.url && !!a.tipo
    );
    if (validas.length < areas.length) toast('Áreas sem mídia foram ignoradas.');
    setSalvando(true);
    const ok = await onSalvar(
      validas.map((a) => ({
        x: +a.x.toFixed(2),
        y: +a.y.toFixed(2),
        w: +a.w.toFixed(2),
        h: +a.h.toFixed(2),
        tipo: a.tipo,
        url: a.url,
        repetir: a.repetir,
      }))
    );
    setSalvando(false);
    if (ok) onFechar();
  };

  const midia = (a: AreaEdit) =>
    a.url &&
    (a.tipo === 'video' ? (
      <video src={a.url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
    ) : (
      <img src={a.url} alt="" className="h-full w-full object-cover" draggable={false} />
    ));

  const atual = sel != null ? areas[sel] : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-label={`Áreas animadas — ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-bold">Áreas animadas — {titulo}</h2>
            <p className="text-xs text-gray-500">
              Posicione vídeos, GIFs ou imagens sobre partes da página (por exemplo, a foto de um
              produto).
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
            {areas.map((a, i) => (
              <div
                key={i}
                onPointerDown={(e) => iniciar(e, i, 'mover')}
                className={`absolute cursor-move overflow-hidden rounded-md border-2 ${
                  i === sel ? 'z-10 border-red-500' : 'border-yellow-300/90'
                } ${a.url ? '' : 'border-dashed bg-yellow-300/20'}`}
                style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
              >
                {midia(a)}
                <span className="pointer-events-none absolute left-0 top-0 bg-black/70 px-1 text-[9px] text-white">
                  Área {i + 1}
                </span>
                <span
                  onPointerDown={(e) => iniciar(e, i, 'redimensionar')}
                  className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-white ring-2 ring-red-500"
                />
              </div>
            ))}
            {overlayUrl && (
              <img
                src={overlayUrl}
                alt=""
                className="pointer-events-none absolute inset-0 z-20 h-full w-full object-cover"
                draggable={false}
              />
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className={`${btn} bg-gray-200 text-gray-800`}
              onClick={adicionar}
            >
              <Plus size={16} /> Adicionar área
            </button>

            {areas.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma área. Clique em “Adicionar área” e arraste sobre a página.
              </p>
            )}

            <ul className="space-y-1">
              {areas.map((a, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm ${i === sel ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <span>Área {i + 1}</span>
                    <span className="text-xs text-gray-500">
                      {a.url
                        ? a.tipo === 'video'
                          ? 'vídeo'
                          : a.tipo === 'gif'
                            ? 'GIF'
                            : 'imagem'
                        : 'sem mídia'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {atual && sel != null && (
              <div className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <div className="text-sm font-semibold">Área {sel + 1}</div>
                <label className={`${btn} cursor-pointer bg-gray-200 text-gray-800`}>
                  <Upload size={14} />{' '}
                  {enviando ? 'Enviando…' : atual.url ? 'Trocar mídia' : 'Enviar mídia'}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    disabled={enviando}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void enviar(sel, f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {atual.tipo === 'video' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={atual.repetir}
                      onChange={(e) => atualizar(sel, { repetir: e.target.checked })}
                    />
                    Repetir em loop
                    <span className="text-xs text-gray-500">
                      (desmarcado: toca uma vez a cada vez que a página aparece)
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  className={`${btn} text-red-700`}
                  onClick={() => remover(sel)}
                >
                  <Trash2 size={14} /> Remover área
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Dica: se a página tiver uma camada transparente por cima, ela aparece aqui também,
              então você vê exatamente o resultado.
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
            onClick={salvar}
            disabled={salvando || enviando}
          >
            <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar áreas'}
          </button>
        </div>
      </div>
    </div>
  );
}
