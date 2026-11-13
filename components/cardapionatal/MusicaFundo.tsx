'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { MusicaItem } from '@/lib/cardapio-natal';

const LS_MUDO = 'cardapio-natal-musica-mudo';

interface Props {
  musicas: MusicaItem[];
  volume: number; // 0..1
  pausar: boolean; // true enquanto toca um vídeo (abertura/encerramento)
}

/**
 * Música de fundo: sorteia entre as faixas (sem repetir a mesma em seguida) e, ao acabar, sorteia a próxima.
 * Os navegadores só liberam som depois de um toque/clique do usuário, então começa na primeira interação.
 * O botão silencia/retoma e a preferência fica salva no aparelho.
 */
export default function MusicaFundo({ musicas, volume, pausar }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ultimo = useRef(-1);
  const iniciado = useRef(false);
  const fade = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mudo, setMudo] = useState(false);
  const [prefLida, setPrefLida] = useState(false);
  const [tocando, setTocando] = useState(false);

  const alvo = Math.min(1, Math.max(0, volume));

  useEffect(() => {
    try {
      setMudo(localStorage.getItem(LS_MUDO) === '1');
    } catch {
      /* ignore */
    }
    setPrefLida(true);
  }, []);

  const salvarMudo = (v: boolean) => {
    setMudo(v);
    try {
      localStorage.setItem(LS_MUDO, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const subirVolume = useCallback(
    (a: HTMLAudioElement) => {
      if (fade.current) clearInterval(fade.current);
      a.volume = 0;
      fade.current = setInterval(() => {
        const v = Math.min(alvo, a.volume + alvo / 15);
        a.volume = v;
        if (v >= alvo && fade.current) clearInterval(fade.current);
      }, 80);
    },
    [alvo]
  );

  const sortear = useCallback((): MusicaItem | null => {
    if (!musicas.length) return null;
    let i = Math.floor(Math.random() * musicas.length);
    if (musicas.length > 1 && i === ultimo.current) {
      i = (i + 1 + Math.floor(Math.random() * (musicas.length - 1))) % musicas.length;
    }
    ultimo.current = i;
    return musicas[i];
  }, [musicas]);

  const tocarProxima = useCallback(() => {
    const a = audioRef.current;
    const m = sortear();
    if (!a || !m) return;
    a.src = m.url;
    a.volume = 0;
    a.play()
      .then(() => subirVolume(a))
      .catch(() => setTocando(false));
  }, [sortear, subirVolume]);

  // elemento de áudio
  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audioRef.current = a;
    const aoFim = () => tocarProxima();
    const aoTocar = () => setTocando(true);
    const aoPausar = () => setTocando(false);
    a.addEventListener('ended', aoFim);
    a.addEventListener('play', aoTocar);
    a.addEventListener('pause', aoPausar);
    return () => {
      if (fade.current) clearInterval(fade.current);
      a.pause();
      a.removeEventListener('ended', aoFim);
      a.removeEventListener('play', aoTocar);
      a.removeEventListener('pause', aoPausar);
      audioRef.current = null;
    };
  }, [tocarProxima]);

  // começa na 1ª interação do usuário (exigência dos navegadores), se ele não tiver silenciado antes
  useEffect(() => {
    if (!prefLida || mudo || iniciado.current || !musicas.length) return;
    const iniciar = () => {
      if (iniciado.current) return;
      iniciado.current = true;
      if (!pausar) tocarProxima();
      remover();
    };
    const remover = () => {
      window.removeEventListener('pointerup', iniciar);
      window.removeEventListener('keydown', iniciar);
    };
    window.addEventListener('pointerup', iniciar);
    window.addEventListener('keydown', iniciar);
    return remover;
  }, [prefLida, mudo, musicas.length, pausar, tocarProxima]);

  // pausa durante vídeos em tela cheia e retoma depois
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !iniciado.current || mudo) return;
    if (pausar) {
      a.pause();
    } else if (a.paused) {
      if (a.src) void a.play().catch(() => undefined);
      else tocarProxima();
    }
  }, [pausar, mudo, tocarProxima]);

  // não toca com a aba em segundo plano
  useEffect(() => {
    const aoMudarVisibilidade = () => {
      const a = audioRef.current;
      if (!a || !iniciado.current || mudo || pausar) return;
      if (document.hidden) a.pause();
      else if (a.src) void a.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [mudo, pausar]);

  if (!musicas.length) return null;

  const alternar = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!iniciado.current) {
      iniciado.current = true;
      salvarMudo(false);
      if (!pausar) tocarProxima();
      return;
    }
    if (tocando) {
      a.pause();
      salvarMudo(true);
    } else {
      salvarMudo(false);
      if (!pausar) {
        if (a.src) void a.play().catch(() => undefined);
        else tocarProxima();
      }
    }
  };

  const ativa = tocando && !mudo;
  return (
    <button
      type="button"
      className={`cn-musica${!iniciado.current && !mudo ? ' cn-musica-dica' : ''}`}
      onClick={alternar}
      aria-pressed={ativa}
      aria-label={ativa ? 'Silenciar a música de fundo' : 'Ativar a música de fundo'}
      title={ativa ? 'Silenciar música' : 'Ativar música'}
    >
      {ativa ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
