'use client';

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RectangleVertical,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface Props {
  rotulo: string;
  podeVoltar: boolean;
  podeAvancar: boolean;
  onAnterior: () => void;
  onProxima: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFullscreen: () => void;
  umaPagina: boolean;
  podeDuasPaginas: boolean;
  onAlternarModo: () => void;
}

export default function FlipbookControls(p: Props) {
  return (
    <nav className="cn-controls" aria-label="Controles do cardápio">
      <button
        type="button"
        className="cn-btn"
        onClick={p.onAnterior}
        disabled={!p.podeVoltar}
        aria-label="Página anterior"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="cn-indicator" aria-live="polite">
        {p.rotulo}
      </span>
      <button
        type="button"
        className="cn-btn"
        onClick={p.onProxima}
        disabled={!p.podeAvancar}
        aria-label="Próxima página"
      >
        <ChevronRight size={20} />
      </button>

      <span className="cn-sep" aria-hidden="true" />

      <button
        type="button"
        className="cn-btn"
        onClick={p.onZoomOut}
        disabled={p.zoom <= 1}
        aria-label="Diminuir zoom"
      >
        <ZoomOut size={18} />
      </button>
      <button
        type="button"
        className="cn-btn"
        onClick={p.onZoomIn}
        disabled={p.zoom >= 2.5}
        aria-label="Aumentar zoom"
      >
        <ZoomIn size={18} />
      </button>
      <button
        type="button"
        className="cn-btn"
        onClick={p.onZoomReset}
        disabled={p.zoom === 1}
        aria-label="Restaurar zoom"
      >
        <RotateCcw size={18} />
      </button>
      <button
        type="button"
        className="cn-btn"
        onClick={p.onAlternarModo}
        disabled={!p.umaPagina ? false : !p.podeDuasPaginas}
        aria-label={p.umaPagina ? 'Mostrar duas páginas' : 'Mostrar uma página por vez'}
        title={p.umaPagina ? 'Ver 2 páginas' : 'Ver 1 página'}
      >
        {p.umaPagina ? <BookOpen size={18} /> : <RectangleVertical size={18} />}
      </button>
      <button type="button" className="cn-btn" onClick={p.onFullscreen} aria-label="Tela cheia">
        <Maximize2 size={18} />
      </button>
    </nav>
  );
}
