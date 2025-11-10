'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

import { formatCurrency } from '@/lib/utils/format';

interface KPIProdutosProps {
  periodo?: 'dia' | 'semana' | 'mes';
}

interface KPIData {
  total_ordens: number;
  total_produzido: number;
  eficiencia: number;
  tempo_medio: number;
  custo_total: number;
  taxa_desperdicio: number;
}

export default function KPIProdutos({ periodo = 'mes' }: KPIProdutosProps) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadKPIs = useCallback(async () => {
    try {
      setLoading(true);
      const { data: producao, error } = (await supabase.rpc('calcular_kpis_producao', {
        periodo_ref: periodo,
      })) as { data: KPIData | null; error: Error | null };

      if (error) throw error;

      if (producao) {
        setData(producao);
      }
    } catch {
      toast({
        title: 'Erro ao carregar KPIs',
        description: 'Não foi possível carregar os indicadores de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [periodo, toast]);

  useEffect(() => {
    void loadKPIs();
  }, [loadKPIs]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="mt-2 h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const { total_ordens, total_produzido, eficiencia, tempo_medio, custo_total, taxa_desperdicio } =
    data;

  const kpis = [
    {
      title: 'Ordens de Produção',
      value: total_ordens.toString(),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Produzido',
      value: total_produzido.toString(),
      icon: ArrowUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      suffix: ' unidades',
    },
    {
      title: 'Eficiência',
      value: `${eficiencia.toFixed(1)}%`,
      icon: ArrowUp,
      color: eficiencia >= 80 ? 'text-green-600' : 'text-yellow-600',
      bgColor: eficiencia >= 80 ? 'bg-green-100' : 'bg-yellow-100',
    },
    {
      title: 'Tempo Médio',
      value: `${tempo_medio.toFixed(1)}h`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Custo Total',
      value: formatCurrency(custo_total),
      icon: ArrowUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Taxa de Desperdício',
      value: `${taxa_desperdicio.toFixed(1)}%`,
      icon: ArrowDown,
      color: taxa_desperdicio <= 5 ? 'text-green-600' : 'text-red-600',
      bgColor: taxa_desperdicio <= 5 ? 'bg-green-100' : 'bg-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{kpi.title}</span>
            <div className={`p-2 rounded-full ${kpi.bgColor}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className={`text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
            {kpi.suffix && <span className="ml-1 text-sm text-gray-500">{kpi.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
