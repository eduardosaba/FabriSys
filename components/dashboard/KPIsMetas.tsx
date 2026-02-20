'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/dashboard/Card';
import { Target, TrendingUp, AlertCircle, Trophy, Store } from 'lucide-react';

interface MetaLoja {
  id: string;
  nome: string;
  meta: number;
  vendas: number;
  percentual: number;
}

interface ResumoGlobal {
  totalVendido: number;
  totalMeta: number;
  percentual: number;
}

interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function KPIsMetas({ filtros, auxFiltro, organizationId, profile }: WidgetProps) {
  const [dados, setDados] = useState<MetaLoja[]>([]);
  const [global, setGlobal] = useState<ResumoGlobal | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      if (!organizationId) return;

      const hoje = new Date();
      // Ajuste de fuso horário simples para garantir o dia corrente
      const inicioDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
      const fimDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();
      const dataHojeStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // 1. QUERY DE LOJAS (Filtra se for gerente)
      let queryLocais = supabase
        .from('locais')
        .select('id, nome')
        .eq('organization_id', organizationId)
        .eq('tipo', 'pdv')
        .eq('ativo', true);

      if (profile.role !== 'admin' && profile.role !== 'master' && profile.local_id) {
        queryLocais = queryLocais.eq('id', profile.local_id);
      }

      // 2. QUERY DE METAS (Todas de hoje)
      const queryMetas = supabase
        .from('metas_vendas')
        .select('local_id, valor_meta')
        .eq('organization_id', organizationId)
        .eq('data_referencia', dataHojeStr);

      // 3. QUERY DE VENDAS (Todas de hoje)
      const queryVendas = supabase
        .from('vendas')
        .select('local_id, total_venda')
        .eq('organization_id', organizationId)
        .eq('status', 'concluida') // Importante: apenas vendas válidas
        .gte('created_at', inicioDia)
        .lte('created_at', fimDia);

      // Executa tudo em paralelo (Performance Boost 🚀)
      const [resLocais, resMetas, resVendas] = await Promise.all([
        queryLocais,
        queryMetas,
        queryVendas,
      ]);

      if (resLocais.error) throw resLocais.error;

      const lojas = resLocais.data || [];
      const metasMap = new Map(resMetas.data?.map((m) => [m.local_id, m.valor_meta]) || []);
      const vendas = resVendas.data || [];

      // Processamento dos Dados
      let acumuladoVendas = 0;
      let acumuladoMeta = 0;

      const resultados: MetaLoja[] = lojas.map((loja) => {
        const meta = Number(metasMap.get(loja.id) || 0);

        // Soma vendas desta loja específica
        const vendasLoja = vendas
          .filter((v) => v.local_id === loja.id)
          .reduce((acc, curr) => acc + (curr.total_venda || 0), 0);

        acumuladoVendas += vendasLoja;
        acumuladoMeta += meta;

        return {
          id: loja.id,
          nome: loja.nome,
          meta,
          vendas: vendasLoja,
          percentual: meta > 0 ? (vendasLoja / meta) * 100 : 0,
        };
      });

      // Ordena: Quem bateu a meta primeiro aparece em cima
      resultados.sort((a, b) => b.percentual - a.percentual);

      setDados(resultados);
      setGlobal({
        totalVendido: acumuladoVendas,
        totalMeta: acumuladoMeta,
        percentual: acumuladoMeta > 0 ? (acumuladoVendas / acumuladoMeta) * 100 : 0,
      });
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, profile]);

  useEffect(() => {
    void carregarDados();

    // Realtime: Escuta novas vendas para atualizar a barra de progresso ao vivo
    const channel = supabase
      .channel('widget_kpis_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendas',
          filter: organizationId ? `organization_id=eq.${organizationId}` : undefined,
        },
        () => void carregarDados()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarDados, organizationId]);

  // Renderização
  return (
    <Card
      title="Acompanhamento de Metas (Dia)"
      size="2x1"
      loading={loading}
      className="overflow-hidden"
    >
      {/* 1. RESUMO GLOBAL (Cabeçalho do Widget) */}
      {global && (profile?.role === 'admin' || profile?.role === 'master') && (
        <div className="bg-slate-50 -mx-5 -mt-2 mb-4 p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total da Empresa
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  global.totalVendido
                )}
              </span>
              <span className="text-xs text-slate-400">
                de{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  global.totalMeta
                )}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-xl font-bold ${global.percentual >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}
            >
              {global.percentual.toFixed(1)}%
            </div>
            <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 ml-auto">
              <div
                className={`h-full rounded-full ${global.percentual >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(global.percentual, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. LISTA DE LOJAS */}
      <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
        {dados.map((loja) => (
          <div key={loja.id} className="group">
            <div className="flex justify-between items-end mb-1">
              <div className="flex items-center gap-2">
                <Store size={14} className="text-slate-400" />
                <span
                  className="font-medium text-sm text-slate-700 truncate max-w-[120px]"
                  title={loja.nome}
                >
                  {loja.nome}
                </span>
                {loja.percentual >= 100 && (
                  <Trophy size={14} className="text-yellow-500 animate-bounce" />
                )}
              </div>
              <div className="text-xs font-medium text-slate-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  loja.vendas
                )}
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-slate-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    loja.meta
                  )}
                </span>
              </div>
            </div>

            <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              {/* Background Striped (Opcional para dar estilo) */}
              <div className="absolute inset-0 bg-slate-100"></div>

              {/* Barra de Progresso */}
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out
                    ${
                      loja.percentual >= 100
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : loja.percentual >= 70
                          ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                          : loja.percentual >= 40
                            ? 'bg-gradient-to-r from-orange-300 to-orange-400'
                            : 'bg-slate-300'
                    }
                  `}
                style={{ width: `${Math.min(loja.percentual, 100)}%` }}
              />
            </div>

            {loja.meta === 0 && (
              <p className="text-[10px] text-orange-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Meta não definida
              </p>
            )}
          </div>
        ))}

        {dados.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Target size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma loja ativa com metas.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
