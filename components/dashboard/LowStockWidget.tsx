'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/dashboard/Card';
import { AlertTriangle, PackageX, ExternalLink, ArrowRight } from 'lucide-react';

interface InsumoCritico {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo_alerta: number;
  unidade_medida?: string;
}

export interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function LowStockWidget({
  filtros,
  auxFiltro,
  organizationId,
  profile,
}: WidgetProps) {
  const router = useRouter();
  const [items, setItems] = useState<InsumoCritico[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLowStock = useCallback(async () => {
    try {
      if (!organizationId) return;

      // Busca insumos onde o estoque é monitorado (minimo > 0)
      const { data: insumos, error } = await safeSelect(
        supabase,
        'insumos',
        'id, nome, estoque_atual, estoque_minimo_alerta, unidade_medida',
        (b: any) => b.limit(50)
      );

      if (error) throw error;

      // Filtragem no cliente: Supabase ainda não suporta comparação de coluna A < coluna B nativamente no filtro simples
      // Filtramos apenas onde estoque_atual < estoque_minimo
      const criticos = (insumos || []).filter(
        (item: any) => (item.estoque_atual || 0) < (item.estoque_minimo_alerta || 0)
      );

      // Pega os top 5 mais críticos
      setItems(criticos.slice(0, 5));
    } catch (err) {
      console.error('Erro ao buscar estoque baixo:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchLowStock();

    const channel = supabase
      .channel('widget_low_stock')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insumos',
          filter: organizationId ? `organization_id=eq.${organizationId}` : undefined,
        },
        () => void fetchLowStock()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLowStock, organizationId]);

  const ActionButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push('/dashboard/estoque/insumos');
      }}
      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
      title="Gerenciar Estoque"
    >
      <ExternalLink size={16} />
    </button>
  );

  return (
    <Card title="Estoque Crítico" size="1x1" loading={loading} action={ActionButton}>
      <div className="flex flex-col h-full">
        {items.length > 0 ? (
          <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {items.map((item) => {
              const percentual =
                item.estoque_minimo_alerta > 0
                  ? (item.estoque_atual / item.estoque_minimo_alerta) * 100
                  : 0;

              const isZerado = item.estoque_atual <= 0;
              const isCritico = percentual < 30; // Menos de 30% do mínimo

              return (
                <div key={item.id} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isZerado ? (
                        <PackageX size={14} className="text-red-500 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                      )}
                      <span
                        className="text-sm font-medium text-slate-700 truncate"
                        title={item.nome}
                      >
                        {item.nome}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold ${isZerado ? 'text-red-600' : 'text-slate-600'}`}
                    >
                      {item.estoque_atual}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        {item.unidade_medida || 'un'}
                      </span>
                    </span>
                  </div>

                  {/* Barra de Progresso visual */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isZerado ? 'bg-red-500' : isCritico ? 'bg-orange-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <PackageX size={24} className="text-emerald-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Estoque Saudável!</p>
            <p className="text-xs">Nenhum item abaixo do mínimo.</p>
          </div>
        )}

        {/* Rodapé com link */}
        {items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => router.push('/dashboard/compras/sugestao')}
              className="w-full text-xs flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors p-1 rounded hover:bg-blue-50"
            >
              Ver Sugestão de Compra <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
