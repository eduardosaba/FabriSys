'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';

interface Props {
  src: string;
  rotuloFechar: string; // ex.: "Pular" / "Voltar ao cardápio"
  onFechar: () => void;
  onEnded?: () => void;
  children?: ReactNode; // ações extras (ex.: botão de WhatsApp no encerramento)
  label: string;
}

/** Vídeo em tela cheia (abertura ou encerramento). Inicia mudo (exigência dos navegadores). */
export default function VideoOverlay({
  src,
  rotuloFechar,
  onFechar,
  onEnded,
  children,
  label,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (v) void v.play().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  return (
    <div className="cn-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <video
        ref={ref}
        src={src}
        className="cn-overlay-video"
        autoPlay
        muted={mudo}
        playsInline
        onEnded={onEnded}
      />
      <div className="cn-overlay-top">
        <button
          type="button"
          className="cn-overlay-btn"
          onClick={() => setMudo((m) => !m)}
          aria-label={mudo ? 'Ativar som' : 'Desativar som'}
        >
          {mudo ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button type="button" className="cn-overlay-btn cn-overlay-skip" onClick={onFechar}>
          {rotuloFechar} <X size={16} />
        </button>
      </div>
      {children && <div className="cn-overlay-bottom">{children}</div>}
    </div>
  );
}
