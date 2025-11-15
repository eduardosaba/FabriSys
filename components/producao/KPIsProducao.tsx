'use client';

import { useCallback, useEffect, useState } from 'react';
import { Percent, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

interface KPIData {
  eficiencia: number;
  produtividade: number;
  qualidade: number;
  eficiencia_tendencia: 'up' | 'down' | 'stable';
  produtividade_tendencia: 'up' | 'down' | 'stable';
  qualidade_tendencia: 'up' | 'down' | 'stable';
}

export default function KPIsProducao() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadKPIs = useCallback(async () => {
    try {
      const res = await supabase.rpc('calcular_kpis_producao');
      if (res?.error && (res.error as { message?: string }).message) {
        throw new Error((res.error as { message?: string }).message as string);
      }

      setKpis(res?.data as KPIData | null);
    } catch {
      toast({
        title: 'Erro ao carregar KPIs',
        description: 'Não foi possível carregar os indicadores de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadKPIs();

    // Atualiza a cada 5 minutos
    const interval = setInterval(
      () => {
        void loadKPIs();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [loadKPIs]);

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-50" />
        ))}
      </div>
    );
  }

  const renderTendencia = (tendencia: 'up' | 'down' | 'stable') => {
    if (tendencia === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (tendencia === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Percent className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600">Eficiência</h3>
            <p className="mt-1 text-2xl font-semibold">{kpis.eficiencia.toFixed(1)}%</p>
          </div>
          {renderTendencia(kpis.eficiencia_tendencia)}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600">Produtividade</h3>
            <p className="mt-1 text-2xl font-semibold">{kpis.produtividade.toFixed(1)}%</p>
          </div>
          {renderTendencia(kpis.produtividade_tendencia)}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600">Qualidade</h3>
            <p className="mt-1 text-2xl font-semibold">{kpis.qualidade.toFixed(1)}%</p>
          </div>
          {renderTendencia(kpis.qualidade_tendencia)}
        </div>
      </div>
    </div>
  );
}
