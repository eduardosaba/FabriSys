'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, TrendingDown, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Alerta {
  id: string;
  tipo: 'atraso' | 'qualidade' | 'estoque' | 'eficiencia';
  severidade: 'baixa' | 'media' | 'alta';
  mensagem: string;
  ordem_producao_id?: string;
  data_criacao: string;
  resolvido: boolean;
}

const tiposAlerta = {
  atraso: {
    icon: Clock,
    title: 'Atraso na Produção',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  qualidade: {
    icon: AlertTriangle,
    title: 'Problema de Qualidade',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  estoque: {
    icon: XCircle,
    title: 'Estoque Crítico',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  eficiencia: {
    icon: TrendingDown,
    title: 'Baixa Eficiência',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
};

export default function AlertasProducao() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAlertas = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = (await supabase
        .from('alertas_producao')
        .select('*')
        .eq('resolvido', false)
        .order('data_criacao', { ascending: false })) as {
        data: Alerta[];
        error: Error | null;
      };

      if (error) throw error;

      setAlertas(data || []);
    } catch {
      toast({
        title: 'Erro ao carregar alertas',
        description: 'Não foi possível carregar os alertas de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAlertas();

    // Atualiza os alertas a cada 5 minutos
    const interval = setInterval(
      () => {
        void loadAlertas();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [loadAlertas]);

  const marcarComoResolvido = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alertas_producao')
        .update({ resolvido: true })
        .eq('id', id);

      if (error) throw error;

      setAlertas((prev) => prev.filter((a) => a.id !== id));

      toast({
        title: 'Alerta resolvido',
        description: 'O alerta foi marcado como resolvido.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Erro ao resolver',
        description: 'Não foi possível marcar o alerta como resolvido.',
        variant: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 text-green-700 p-4 rounded-lg">
        <p className="text-center">Não há alertas pendentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alertas.map((alerta) => {
        const tipo = tiposAlerta[alerta.tipo];
        return (
          <div
            key={alerta.id}
            className={cn('p-4 rounded-lg border flex items-start justify-between', tipo.bgColor)}
          >
            <div className="flex gap-4">
              <div className={cn('mt-1', tipo.color)}>
                <tipo.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium">{tipo.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{alerta.mensagem}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(alerta.data_criacao).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <button
              onClick={() => marcarComoResolvido(alerta.id)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Marcar como resolvido
            </button>
          </div>
        );
      })}
    </div>
  );
}
