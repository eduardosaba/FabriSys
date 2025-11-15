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
      const resProducao = await supabase.rpc('obter_dados_producao_diaria', {
        periodo_ref: periodo,
      });

      if (resProducao?.error && (resProducao.error as { message?: string }).message) {
        throw new Error((resProducao.error as { message?: string }).message as string);
      }

      setDadosProducao((resProducao?.data as DadosProducao[]) || []);

      // Carrega ranking de produtos
      const resRanking = await supabase.rpc('obter_ranking_produtos', {
        periodo_ref: periodo,
      });

      if (resRanking?.error && (resRanking.error as { message?: string }).message) {
        throw new Error((resRanking.error as { message?: string }).message as string);
      }

      setRankingProdutos((resRanking?.data as RankingProdutos[]) || []);
    } catch (err) {
      console.error('Erro ao carregar gráficos de produção:', err);
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
        <div className="h-[400px] animate-pulse rounded-lg bg-gray-50" />
        <div className="h-[400px] animate-pulse rounded-lg bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Produção Diária</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosProducao} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="data"
                tickFormatter={(value) => new Date(String(value)).toLocaleDateString('pt-BR')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(String(value)).toLocaleDateString('pt-BR')}
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

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Produtos mais Produzidos</h3>
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
