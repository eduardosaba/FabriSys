'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
import { Card } from '@/components/dashboard/Card';
import { Trophy, TrendingUp, Package } from 'lucide-react';

interface ProdutoRanking {
  id: string;
  nome: string;
  quantidade_total: number;
  valor_total: number;
  ticket_medio: number;
}

interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function RankingProdutosWidget({
  filtros,
  auxFiltro,
  organizationId,
  profile,
}: WidgetProps) {
  const [items, setItems] = useState<ProdutoRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      try {
        if (!organizationId) return;

        const hoje = new Date();
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(hoje.getDate() - 30);

        // Buscar itens em lotes e agregar por produto, sem usar join aninhado
        const chunkSize = 50;
        const allItens: any[] = [];
        for (let i = 0; i < 1000; i += chunkSize) {
          // Primeiro tentativa: paginar usando filtro por created_at (mais eficiente)
          let itensChunk: any[] | null = null;
          let itensErr: any = null;
          try {
            const resp = await safeSelect(
              supabase,
              'itens_venda',
              'produto_id, quantidade, valor_total, subtotal, preco_unitario, created_at',
              (b: any) =>
                b
                  .eq('organization_id', organizationId)
                  .gte('created_at', trintaDiasAtras.toISOString())
                  .lte('created_at', hoje.toISOString())
                  .range(i, i + chunkSize - 1)
            );
            itensChunk = resp.data as any[] | null;
            itensErr = resp.error;
          } catch (e) {
            itensErr = e;
          }

          // Se falhou por causa de coluna missing (ex: created_at ausente), refazer sem filtro de data
          if (itensErr) {
            const msg = String(itensErr?.message || itensErr?.error || itensErr);
            if (/column\s+.*created_at.*does not exist/i.test(msg) || /created_at/i.test(msg)) {
              const fallback = await safeSelect(
                supabase,
                'itens_venda',
                'produto_id, quantidade, valor_total, subtotal, preco_unitario, created_at',
                (b: any) => b.eq('organization_id', organizationId).range(i, i + chunkSize - 1)
              );
              itensChunk = fallback.data as any[] | null;
              itensErr = fallback.error;
            }
          }

          if (itensErr) throw itensErr;
          if (!itensChunk || itensChunk.length === 0) break;
          allItens.push(...itensChunk);
          if (itensChunk.length < chunkSize) break;
        }

        const produtoIds = Array.from(
          new Set(allItens.map((it) => String(it.produto_id)).filter(Boolean))
        );
        const produtoMap: Record<string, { id: string; nome: string }> = {};
        if (produtoIds.length > 0) {
          for (let i = 0; i < produtoIds.length; i += chunkSize) {
            const chunk = produtoIds.slice(i, i + chunkSize);
            const { data: produtos, error: prodErr } = await supabase
              .from('produtos_finais')
              .select('id, nome')
              .in('id', chunk);
            if (prodErr) throw prodErr;
            (produtos || []).forEach((p: any) => {
              produtoMap[String(p.id)] = { id: String(p.id), nome: p.nome || 'Produto Removido' };
            });
          }
        }

        // Filtrar cliente-side por created_at caso tenhamos feito fallback sem filtro
        const allItensFiltered = allItens.filter((item: any) => {
          try {
            if (!item?.created_at) return false;
            const dt = new Date(item.created_at);
            return dt >= trintaDiasAtras && dt <= hoje;
          } catch {
            return false;
          }
        });

        const agrupado: Record<string, ProdutoRanking> = {};
        allItensFiltered.forEach((item: any) => {
          const prodId = String(item.produto_id);
          const prodNome = produtoMap[prodId]?.nome || 'Produto Removido';
          if (!prodId) return;
          if (!agrupado[prodId]) {
            agrupado[prodId] = {
              id: prodId,
              nome: prodNome,
              quantidade_total: 0,
              valor_total: 0,
              ticket_medio: 0,
            };
          }
          agrupado[prodId].quantidade_total += Number(item.quantidade || 0);
          // compatibilidade: usar valor_total se existir, senão subtotal, senão preco_unitario * quantidade
          const itemValor = Number(
            item.valor_total ??
              item.subtotal ??
              (item.preco_unitario ? item.preco_unitario * (item.quantidade || 0) : 0)
          );
          agrupado[prodId].valor_total += itemValor;
        });

        const ranking = Object.values(agrupado)
          .map((p) => ({
            ...p,
            ticket_medio: p.quantidade_total ? p.valor_total / p.quantidade_total : 0,
          }))
          .sort((a, b) => b.valor_total - a.valor_total)
          .slice(0, 5);

        setItems(ranking);
      } catch (err) {
        console.error('Erro ranking:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchRanking();
  }, [organizationId, filtros, auxFiltro, profile]);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 border-yellow-100 text-yellow-700';
      case 1:
        return 'bg-slate-50 border-slate-200 text-slate-600';
      case 2:
        return 'bg-orange-50 border-orange-100 text-orange-700';
      default:
        return 'bg-white border-transparent text-slate-500';
    }
  };

  const getTrophyColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500';
      case 1:
        return 'text-slate-400';
      case 2:
        return 'text-orange-400';
      default:
        return 'hidden';
    }
  };

  return (
    <Card title="Campeões de Venda (30d)" size="1x2" loading={loading}>
      <div className="flex flex-col h-full overflow-hidden">
        {items.length > 0 ? (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {items.map((prod, index) => (
              <div
                key={prod.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankStyle(index)}`}
              >
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                  {index < 3 ? (
                    <Trophy size={18} className={`mb-1 ${getTrophyColor(index)}`} />
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" title={prod.nome}>
                    {prod.nome}
                  </h4>
                  <div className="flex items-center gap-2 text-xs opacity-80 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Package size={10} /> {prod.quantidade_total} un
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={10} /> Médio:{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(prod.ticket_medio)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block font-bold text-sm">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      notation: 'compact',
                    }).format(prod.valor_total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
            <Package size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Sem dados de venda recentes.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
