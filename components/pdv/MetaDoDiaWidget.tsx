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
  const [meta, setMeta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendasBase, setVendasBase] = useState(0); // vendas já gravadas no DB hoje

  // Busca a meta do banco (ou define um padrão se não tiver)
  useEffect(() => {
    async function fetchMeta() {
      if (!localId) {
        setMeta(null);
        setVendasBase(0);
        setLoading(false);
        return;
      }

      // Determina a data de referência no fuso local (YYYY-MM-DD)
      const localStart = new Date();
      localStart.setHours(0, 0, 0, 0);
      const y = localStart.getFullYear();
      const m = String(localStart.getMonth() + 1).padStart(2, '0');
      const d = String(localStart.getDate()).padStart(2, '0');
      const dataReferencia = `${y}-${m}-${d}`;

      try {
        // Preferir .single() para detectar inconsistências; fallback para maybeSingle()
        let metaValue: number | null = null;
        try {
          const { data } = await supabase
            .from('metas_vendas')
            .select('valor_meta')
            .eq('local_id', localId)
            .eq('data_referencia', dataReferencia)
            .single();
          metaValue = data?.valor_meta ?? null;
        } catch (errSingle) {
          const { data: maybeData, error: maybeErr } = await supabase
            .from('metas_vendas')
            .select('valor_meta')
            .eq('local_id', localId)
            .eq('data_referencia', dataReferencia)
            .maybeSingle();
          if (maybeErr) console.warn('Erro ao buscar meta do dia (fallback):', maybeErr);
          metaValue = maybeData?.valor_meta ?? null;
        }

        // Se tiver meta diária definida, usar diretamente
        if (metaValue != null) {
          setMeta(metaValue);
        } else {
          // Tentar recuperar meta mensal (soma das metas do mês) e distribuir
          try {
            const monthStart = new Date(localStart.getFullYear(), localStart.getMonth(), 1);
            const year = monthStart.getFullYear();
            const month = String(monthStart.getMonth() + 1).padStart(2, '0');
            const daysInMonth = new Date(year, Number(month), 0).getDate();
            const startMonth = `${year}-${month}-01`;
            const endMonth = `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`;

            const { data: monthMetas, error: monthErr } = await supabase
              .from('metas_vendas')
              .select('data_referencia, valor_meta, dias_defuncionamento')
              .eq('local_id', localId)
              .gte('data_referencia', startMonth)
              .lte('data_referencia', endMonth);

            if (!monthErr && monthMetas && monthMetas.length > 0) {
              const sumMonth = (monthMetas || []).reduce((acc: number, r: any) => acc + Number(r.valor_meta || 0), 0);
              const nonZeroCount = (monthMetas || []).filter((r: any) => Number(r.valor_meta || 0) > 0).length;

              // Priorizar dias_defuncionamento salvo na tabela `metas_vendas` (se presente)
              const diasFromRows = (monthMetas || []).map((r: any) => r.dias_defuncionamento).find((v: any) => Number(v) > 0);

              let daily = 0;
              if (diasFromRows && Number(diasFromRows) > 0) {
                daily = sumMonth / Number(diasFromRows);
              } else if (nonZeroCount >= 3) {
                // Se já existir metas diárias preenchidas (várias entradas), distribuir pela quantidade de dias com meta
                daily = sumMonth / nonZeroCount;
              } else {
                // Caso contrário, dividir pelo número de dias do mês
                daily = sumMonth / daysInMonth;
              }
              setMeta(Number(daily) || 0);
            } else {
              setMeta(null);
            }
          } catch (e) {
            setMeta(null);
          }
        }

        // Buscar vendas já registradas no banco para hoje (total_venda)
        const inicio = `${dataReferencia}T00:00:00`;
        const localEnd = new Date(localStart);
        localEnd.setDate(localEnd.getDate() + 1);
        const y2 = localEnd.getFullYear();
        const m2 = String(localEnd.getMonth() + 1).padStart(2, '0');
        const d2 = String(localEnd.getDate()).padStart(2, '0');
        const fim = `${y2}-${m2}-${d2}T00:00:00`;

        // Tentar usar a RPC no servidor (mais eficiente e evita problemas com agregações via PostgREST)
        try {
          const params = { p_start: inicio, p_end: fim, p_local_id: localId ?? null };
          const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_sum_vendas_por_periodo', params).single();
          if (!rpcErr && rpcData != null) {
            // rpcData pode vir em formatos variados dependendo do driver; normalizar para número
            const parseRpc = (d: any) => {
              if (d == null) return 0;
              if (typeof d === 'number') return Number(d);
              if (typeof d === 'string') return Number(d);
              if (Array.isArray(d) && d.length > 0) {
                const first = d[0];
                if (typeof first === 'number') return Number(first);
                if (typeof first === 'object') {
                  const val = Object.values(first).find((v) => typeof v === 'number' || typeof v === 'string');
                  return val != null ? Number(val) : 0;
                }
              }
              if (typeof d === 'object') {
                const val = Object.values(d).find((v) => typeof v === 'number' || typeof v === 'string');
                return val != null ? Number(val) : 0;
              }
              return 0;
            };
            const somaRpc = parseRpc(rpcData);
            setVendasBase(Number(somaRpc) || 0);
          } else {
            // RPC falhou ou devolveu null — fazer fallback para buscar linhas e somar no cliente
            throw rpcErr || new Error('RPC retornou vazio');
          }
        } catch (errFetch) {
          console.warn('Erro ao usar RPC rpc_sum_vendas_por_periodo, fazendo fallback para fetch de linhas:', errFetch);
          try {
            const { data: vendasRows, error: vendasErr } = await supabase
              .from('vendas')
              .select('total_venda')
              .eq('local_id', localId)
              .gte('created_at', inicio)
              .lt('created_at', fim);

            if (vendasErr) throw vendasErr;

            const soma = (vendasRows || []).reduce((acc: number, r: any) => acc + Number(r.total_venda || 0), 0);
            setVendasBase(Number(soma) || 0);
          } catch (e2) {
            console.warn('Erro ao buscar vendas do dia (com local_id), tentando fallback sem filtro:', e2);
            try {
              const { data: vendasRowsAll, error: vendasErrAll } = await supabase
                .from('vendas')
                .select('total_venda')
                .gte('created_at', inicio)
                .lt('created_at', fim);
              if (vendasErrAll) throw vendasErrAll;
              const somaAll = (vendasRowsAll || []).reduce((acc: number, r: any) => acc + Number(r.total_venda || 0), 0);
              if (Number(somaAll) > 0) {
                console.warn('Vendas existem hoje, mas não são visíveis quando filtradas por local_id — possível RLS ou local_id incorreto.');
              }
              setVendasBase(Number(somaAll) || 0);
            } catch (e3) {
              console.warn('Fallback ao buscar vendas sem local_id falhou:', e3);
              setVendasBase(0);
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar vendas do dia para meta:', e);
        setVendasBase(0);
      } finally {
        setLoading(false);
      }
    }

    // Adicionamos 'void' para marcar a promessa como tratada (evita warning)
    void fetchMeta();

    // Subscrever mudanças em `vendas` para este local e atualizar em tempo real
    if (localId) {
      const channel = supabase
        .channel(`public:meta_vendas:${localId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vendas', filter: `local_id=eq.${localId}` },
          // Apenas atualizar a soma de vendas quando houver mudança
          (payload) => {
              try {
              // Recalcular soma apenas (mais barato que re-fetch da meta)
              const localStart = new Date();
              localStart.setHours(0, 0, 0, 0);
              const y = localStart.getFullYear();
              const m = String(localStart.getMonth() + 1).padStart(2, '0');
              const d = String(localStart.getDate()).padStart(2, '0');
              const inicio = `${y}-${m}-${d}T00:00:00`;
              const localEnd = new Date(localStart);
              localEnd.setDate(localEnd.getDate() + 1);
              const y2 = localEnd.getFullYear();
              const m2 = String(localEnd.getMonth() + 1).padStart(2, '0');
              const d2 = String(localEnd.getDate()).padStart(2, '0');
              const fim = `${y2}-${m2}-${d2}T00:00:00`;
              void (async () => {
                try {
                  // Recalcular soma preferindo a RPC
                  try {
                    const params = { p_start: inicio, p_end: fim, p_local_id: localId ?? null };
                    const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_sum_vendas_por_periodo', params).single();
                    if (!rpcErr && rpcData != null) {
                      const parseRpc = (d: any) => {
                        if (d == null) return 0;
                        if (typeof d === 'number') return Number(d);
                        if (typeof d === 'string') return Number(d);
                        if (Array.isArray(d) && d.length > 0) {
                          const first = d[0];
                          if (typeof first === 'number') return Number(first);
                          if (typeof first === 'object') {
                            const val = Object.values(first).find((v) => typeof v === 'number' || typeof v === 'string');
                            return val != null ? Number(val) : 0;
                          }
                        }
                        if (typeof d === 'object') {
                          const val = Object.values(d).find((v) => typeof v === 'number' || typeof v === 'string');
                          return val != null ? Number(val) : 0;
                        }
                        return 0;
                      };
                      const somaRpc = parseRpc(rpcData);
                      setVendasBase(Number(somaRpc) || 0);
                      return;
                    }
                    throw rpcErr || new Error('RPC retornou vazio');
                  } catch (eRpc) {
                    console.warn('Realtime: erro ao usar RPC, fazendo fallback para fetch de linhas:', eRpc);
                    const { data: vendasRows, error: vendasErr } = await supabase
                      .from('vendas')
                      .select('total_venda')
                      .eq('local_id', localId)
                      .gte('created_at', inicio)
                      .lt('created_at', fim);
                    if (vendasErr) throw vendasErr;
                    const soma = (vendasRows || []).reduce((acc: number, r: any) => acc + Number(r.total_venda || 0), 0);
                    setVendasBase(Number(soma) || 0);
                  }
                } catch (e1) {
                  console.warn('Realtime: erro ao buscar soma de vendas (com local_id):', e1);
                  try {
                    const { data: vendasRowsAll, error: vendasErrAll } = await supabase
                      .from('vendas')
                      .select('total_venda')
                      .gte('created_at', inicio)
                      .lt('created_at', fim);
                    if (vendasErrAll) throw vendasErrAll;
                    const somaAll = (vendasRowsAll || []).reduce((acc: number, r: any) => acc + Number(r.total_venda || 0), 0);
                    setVendasBase(Number(somaAll) || 0);
                  } catch (e2) {
                    console.warn('Realtime fallback failed:', e2);
                  }
                }
              })();
            } catch (e) {
              console.warn('Erro ao processar evento realtime vendas (meta):', e);
            }
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel?.(channel);
        } catch (e) {
          try {
            channel.unsubscribe();
          } catch (err) {
            // noop
          }
        }
      };
    }
  }, [localId]);

  // Garante que o cálculo não dê NaN ou Infinito
  // vendasHoje = vendas desta sessão (não persistida). vendasBase = soma das vendas já no DB hoje.
  const vendasTotal = vendasBase + (vendasHoje || 0);
  const metaVal = meta ?? 0;
  const percentual = metaVal > 0 ? Math.min(100, Math.max(0, (vendasTotal / metaVal) * 100)) : 0;
  const atingiuMeta = percentual >= 100;

  // Efeito de Confete ao bater a meta!
  useEffect(() => {
    if (atingiuMeta && metaVal > 0) {
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
  // Se não houver meta configurada para este local, não exibir o widget
  if (meta === null) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
          <Trophy size={14} className="text-yellow-500" /> Meta do Dia
        </h4>
        <span className="text-xs font-medium text-slate-700">
          R$ {vendasTotal.toFixed(0)} / R$ {meta.toFixed(0)}
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
