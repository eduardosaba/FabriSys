'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, PauseCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

interface OrdemProducao {
  id: string;
  numero: string;
  produto: string;
  quantidade: number;
  status: 'pendente' | 'em_andamento' | 'pausada' | 'concluida';
  progresso: number;
  data_inicio?: string;
  data_fim?: string;
}

export default function StatusProducao() {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadOrdens = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_producao')
        .select(
          `
          id,
          numero_op,
          produto:produtos_finais(nome),
          quantidade_prevista,
          status,
          data_inicio,
          data_fim
        `
        )
        .in('status', ['em_producao', 'pausada'])
        .order('data_inicio', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Mapear dados para corresponder ao tipo OrdemProducao local
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        numero: item.numero_op,
        produto: item.produto?.nome || '',
        quantidade: item.quantidade_prevista,
        status: item.status as 'pendente' | 'em_andamento' | 'pausada' | 'concluida',
        progresso: 0, // TODO: calcular progresso baseado em registros de produção
        data_inicio: item.data_inicio,
        data_fim: item.data_fim,
      }));

      setOrdens(mappedData);
    } catch {
      toast({
        title: 'Erro ao carregar ordens',
        description: 'Não foi possível carregar o status da produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrdens();

    const interval = setInterval(() => {
      void loadOrdens();
    }, 30 * 1000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, [loadOrdens]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-50" />
        ))}
      </div>
    );
  }

  if (ordens.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
        <p className="text-center">Não há ordens em produção no momento.</p>
      </div>
    );
  }

  const statusIcons = {
    em_andamento: PlayCircle,
    pausada: PauseCircle,
    pendente: Clock,
    concluida: Check,
  };

  const statusColors = {
    em_andamento: 'text-green-500',
    pausada: 'text-orange-500',
    pendente: 'text-gray-500',
    concluida: 'text-blue-500',
  };

  return (
    <div className="space-y-4">
      {ordens.map((ordem) => {
        const StatusIcon = statusIcons[ordem.status];
        const statusColor = statusColors[ordem.status];

        return (
          <div key={ordem.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                  <h3 className="font-medium">Ordem #{ordem.numero}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {ordem.produto} - {ordem.quantidade} unidades
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{ordem.progresso}%</div>
                <div className="mt-1 h-2 w-24 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${ordem.progresso}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
