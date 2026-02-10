'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalValorEstoque: number;
  totalItensCadastrados: number;
  itensCriticos: number;
  ordensConcluidasMes: number;
  produtosProduzidosMes: number;
}

export default function RelatoriosOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalValorEstoque: 0,
    totalItensCadastrados: 0,
    itensCriticos: 0,
    ordensConcluidasMes: 0,
    produtosProduzidosMes: 0,
  });

  // Data atual para filtros (memorizado para não invalidar hooks)
  const hoje = useMemo(() => new Date(), []);
  const mesAtualNome = useMemo(() => hoje.toLocaleString('pt-BR', { month: 'long' }), [hoje]);

  const carregarIndicadores = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Buscar dados de Insumos (Valor de Estoque e Alertas)
      const { data: insumos, error: errInsumos } = await supabase
        .from('insumos')
        .select('estoque_atual, custo_por_ue, estoque_minimo_alerta');

      if (errInsumos) throw errInsumos;

      let valorEstoque = 0;
      let criticos = 0;

      const insumosRows = (insumos ?? []) as Array<{
        estoque_atual?: number;
        custo_por_ue?: number;
        estoque_minimo_alerta?: number;
      }>;

      insumosRows.forEach((item) => {
        const qtd = item.estoque_atual || 0;
        const custo = item.custo_por_ue || 0;
        const min = item.estoque_minimo_alerta || 0;

        valorEstoque += qtd * custo;
        if (qtd <= min) criticos++;
      });

      // 2. Buscar dados de Produção do Mês Atual
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

      const { data: ordens, error: errOrdens } = await supabase
        .from('ordens_producao')
        .select('quantidade_prevista')
        .eq('estagio_atual', 'concluido') // Apenas as finalizadas
        .gte('updated_at', inicioMes); // Deu saída este mês

      if (errOrdens) throw errOrdens;

      const ordensRows = (ordens ?? []) as Array<{ quantidade_prevista?: number }>;

      const totalProduzido = ordensRows.reduce(
        (acc, curr) => acc + (curr.quantidade_prevista || 0),
        0
      );

      setStats({
        totalValorEstoque: valorEstoque,
        totalItensCadastrados: insumos?.length || 0,
        itensCriticos: criticos,
        ordensConcluidasMes: ordens?.length || 0,
        produtosProduzidosMes: totalProduzido,
      });
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Não foi possível carregar os indicadores.');
    } finally {
      setLoading(false);
    }
  }, [
    /* stable: nenhum valor externo mutável além do supabase e toast */
    hoje,
  ]);

  useEffect(() => {
    void carregarIndicadores();
  }, [carregarIndicadores]);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Relatórios Gerenciais"
        description="Visão geral de desempenho, estoque e custos da fábrica."
        icon={BarChart2}
      />

      {/* KPI CARDS (Indicadores Principais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Valor em Estoque */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
              <DollarSign size={16} className="text-green-600" /> Valor em Estoque
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                stats.totalValorEstoque
              )}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">Dinheiro parado em insumos no momento.</div>
        </div>

        {/* Card 2: Produção do Mês */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
              <TrendingUp size={16} className="text-blue-600" /> Produção em {mesAtualNome}
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {stats.produtosProduzidosMes.toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-normal text-slate-500">unidades</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
            <span className="font-medium text-blue-600">{stats.ordensConcluidasMes} ordens</span>{' '}
            finalizadas este mês.
          </div>
        </div>

        {/* Card 3: Saúde do Estoque */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
              <AlertTriangle size={16} className="text-orange-500" /> Risco de Ruptura
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {stats.itensCriticos}{' '}
              <span className="text-sm font-normal text-slate-500">itens</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(stats.itensCriticos / (stats.totalItensCadastrados || 1)) * 100}%`,
              }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {((stats.itensCriticos / (stats.totalItensCadastrados || 1)) * 100).toFixed(1)}% do seu
            estoque está baixo.
          </div>
        </div>
      </div>

      {/* SEÇÃO DE NAVEGAÇÃO DETALHADA */}
      <h3 className="text-lg font-bold text-slate-800 mt-4 flex items-center gap-2">
        <PieChart size={20} className="text-slate-400" /> Relatórios Detalhados
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Link: Relatório de Estoque */}
        <a
          href="/dashboard/relatorios/estoque"
          className="group block bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
                  Posição de Estoque
                </h4>
                <p className="text-slate-500 text-sm mt-1">
                  Inventário completo, valor por categoria e itens abaixo do mínimo.
                </p>
              </div>
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </a>

        {/* Card Link: Validade */}
        <a
          href="/dashboard/relatorios/validade"
          className="group block bg-white p-6 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg group-hover:text-orange-700 transition-colors">
                  Controle de Validade
                </h4>
                <p className="text-slate-500 text-sm mt-1">
                  Lotes vencidos, próximos do vencimento e histórico de perdas.
                </p>
              </div>
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </div>
        </a>
      </div>

      {/* ÁREA DE INSIGHTS RÁPIDOS (Exemplo Visual) */}
      <div className="mt-4 bg-slate-900 text-white p-6 rounded-xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Dica do Confectio 💡</h3>
          <p className="text-slate-300 max-w-2xl">
            Mantenha o valor do estoque atualizado dando entrada nas notas fiscais. Um custo de
            insumo desatualizado faz com que sua margem de lucro na Ficha Técnica seja ilusória.
          </p>
          <button
            onClick={() => (window.location.href = '/dashboard/insumos/lotes')}
            className="mt-4 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
          >
            Dar Entrada em Nota
          </button>
        </div>
        {/* Decorativo */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
