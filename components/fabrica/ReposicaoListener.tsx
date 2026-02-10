'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function ReposicaoListener() {
  useEffect(() => {
    // Tocar som curto com WebAudio
    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        setTimeout(() => {
          o.stop();
          ctx.close();
        }, 500);
      } catch (e) {
        void 0;
      }
    };

    // Criar canal para ouvir inserções em solicitacoes_reposicao
    const channel = supabase
      .channel('public:solicitacoes_reposicao')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solicitacoes_reposicao' },
        (payload) => {
          const row = payload.new as any;
          const local = row.local_id || 'Loja';
          const produto = row.produto_id || '';
          const urg = row.urgencia || '';
          const obs = row.observacao || '';
          toast.custom(
            (t) => (
              <div className={`bg-white p-3 rounded shadow-lg border`}>
                <div className="font-bold text-sm">Nova solicitação de reposição</div>
                <div className="text-xs text-slate-600">{`Loja: ${local} · Produto: ${produto} · ${urg}`}</div>
                {obs && <div className="text-xs text-slate-500 mt-1">{obs}</div>}
              </div>
            ),
            { duration: 6000 }
          );
          playBeep();
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {
        void 0;
      }
    };
  }, []);

  return null;
}
