'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MetaProps {
  localId: string | null;
  caixaAbertoId?: string | undefined;
  vendasHoje: number;
}

export default function MetaDoDiaWidget({ localId, vendasHoje }: MetaProps) {
  const [meta, setMeta] = useState(0);
  const [loading, setLoading] = useState(true);

  // Busca a meta do banco (ou define um padrão se não tiver)
  useEffect(() => {
    async function fetchMeta() {
      if (!localId) return;

      const hoje = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('metas_vendas')
        .select('valor_meta')
        .eq('local_id', localId)
        .eq('data_referencia', hoje)
        .maybeSingle();

      // Se não tiver meta definida no banco, usa R$ 1.000,00 como fallback padrão
      setMeta(data?.valor_meta || 1000);
      setLoading(false);
    }

    // Adicionamos 'void' para marcar a promessa como tratada (evita warning)
    void fetchMeta();
  }, [localId]);

  // Garante que o cálculo não dê NaN ou Infinito
  const percentual = meta > 0 ? Math.min(100, Math.max(0, (vendasHoje / meta) * 100)) : 0;
  const atingiuMeta = percentual >= 100;

  // Efeito de Confete ao bater a meta!
  useEffect(() => {
    if (atingiuMeta && meta > 0) {
      // O void aqui diz ao linter que não precisamos esperar o confete terminar
      void confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#fbbf24', '#3b82f6'], // Verde, Ouro, Azul
      });
    }
  }, [atingiuMeta, meta]);

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
          <Trophy size={14} className="text-yellow-500" /> Meta do Dia
        </h4>
        <span className="text-xs font-medium text-slate-700">
          R$ {vendasHoje.toFixed(0)} / R$ {meta.toFixed(0)}
        </span>
      </div>

      <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-1
            ${atingiuMeta ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}
          `}
          style={{ width: `${percentual}%` }}
        >
          {percentual > 10 && (
            <span className="text-[9px] font-bold text-white leading-none">
              {percentual.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {atingiuMeta && (
        <p className="text-center text-xs font-bold text-green-600 mt-1 animate-pulse">
          🎉 META BATIDA! PARABÉNS! 🎉
        </p>
      )}
    </div>
  );
}
