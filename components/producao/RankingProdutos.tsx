'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProdutoRanking {
  produto: string;
  quantidade: number;
  valor_total: number;
}

import { WidgetConfig } from '@/lib/types/dashboard';

interface RankingProdutosProps {
  config?: WidgetConfig;
}

export default function RankingProdutos({ config }: RankingProdutosProps) {
  const [ranking, setRanking] = useState<ProdutoRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRanking = useCallback(async () => {
    try {
      const res = await supabase.rpc('obter_ranking_produtos', {
        p_periodo: config?.config?.periodo || 'mes',
        p_limite: config?.config?.limite || 5,
      });

      if (res?.error && (res.error as { message?: string }).message) {
        throw new Error((res.error as { message?: string }).message as string);
      }

      setRanking((res?.data as ProdutoRanking[]) || []);
    } catch (error) {
      if (error instanceof Error) console.error('Erro ao carregar ranking:', error.message);
      else console.error('Erro ao carregar ranking:', error);
      toast({
        title: 'Erro ao carregar ranking',
        description: 'Não foi possível carregar o ranking de produtos.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [config?.config?.limite, config?.config?.periodo, toast]);

  useEffect(() => {
    void loadRanking();

    const interval = setInterval(
      () => {
        void loadRanking();
      },
      5 * 60 * 1000
    ); // Atualiza a cada 5 minutos

    return () => clearInterval(interval);
  }, [loadRanking]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-gray-50" />;
  }

  if (ranking.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
        <p className="text-gray-600">Não há dados disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ranking} layout="vertical">
          <XAxis type="number" />
          <YAxis dataKey="produto" type="category" width={120} tick={{ fontSize: 12 }} />
          {config?.config?.exibirLegenda && (
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Quantidade']}
              labelStyle={{ color: '#111827' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
              }}
            />
          )}
          <Bar dataKey="quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
