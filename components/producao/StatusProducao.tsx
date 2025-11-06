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
          numero,
          produto:produtos_finais(nome),
          quantidade,
          status,
          progresso,
          data_inicio,
          data_fim
        `
        )
        .in('status', ['em_andamento', 'pausada'])
        .order('data_inicio', { ascending: false })
        .limit(5);

      if (error) throw error;

      setOrdens(data || []);
    } catch (error) {
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
          <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (ordens.length === 0) {
    return (
      <div className="bg-gray-50 text-gray-600 p-4 rounded-lg">
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
          <div key={ordem.id} className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                  <h3 className="font-medium">Ordem #{ordem.numero}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {ordem.produto} - {ordem.quantidade} unidades
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{ordem.progresso}%</div>
                <div className="w-24 h-2 bg-gray-100 rounded-full mt-1">
                  <div
                    className="h-full bg-green-500 rounded-full"
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
