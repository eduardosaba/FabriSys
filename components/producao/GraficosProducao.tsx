'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

interface DadosProducao {
  data: string;
  quantidade_produzida: number;
  quantidade_prevista: number;
  eficiencia: number;
}

interface RankingProdutos {
  produto: string;
  quantidade: number;
  valor_total: number;
}

interface GraficoProducaoProps {
  periodo: 'dia' | 'semana' | 'mes';
}

export default function GraficosProducao({ periodo }: GraficoProducaoProps) {
  const [dadosProducao, setDadosProducao] = useState<DadosProducao[]>([]);
  const [rankingProdutos, setRankingProdutos] = useState<RankingProdutos[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDados = useCallback(async () => {
    try {
      setLoading(true);

      // Carrega dados de produção diária
      const { data: producao, error: errorProducao } = (await supabase.rpc(
        'obter_dados_producao_diaria',
        {
          periodo_ref: periodo,
        }
      )) as { data: DadosProducao[]; error: Error | null };

      if (errorProducao) throw errorProducao;

      if (producao) {
        setDadosProducao(producao);
      }

      // Carrega ranking de produtos
      const { data: ranking, error: errorRanking } = (await supabase.rpc('obter_ranking_produtos', {
        periodo_ref: periodo,
      })) as { data: RankingProdutos[]; error: Error | null };

      if (errorRanking) throw errorRanking;

      if (ranking) {
        setRankingProdutos(ranking);
      }
    } catch (_err) {
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os gráficos de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [periodo, toast]);

  useEffect(() => {
    void loadDados();
  }, [loadDados]);

  if (loading || !dadosProducao.length) {
    return (
      <div className="space-y-8">
        <div className="h-[400px] bg-gray-50 rounded-lg animate-pulse" />
        <div className="h-[400px] bg-gray-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Produção Diária</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosProducao} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="data"
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value: number) => [value, 'Quantidade']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="quantidade_prevista"
                name="Previsto"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="quantidade_produzida"
                name="Realizado"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Produtos mais Produzidos</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingProdutos} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="produto" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="quantidade" name="Quantidade" fill="#8884d8" />
              <Bar yAxisId="right" dataKey="valor_total" name="Valor Total" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
