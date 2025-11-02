'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lote {
  id: string;
  insumo_id: string;
  quantidade_restante: number;
  data_validade: string | null;
  numero_lote: string | null;
  insumo: {
    nome: string;
    unidade_medida: string;
  };
}

interface RelatorioValidadeProps {
  diasAlerta?: number; // Número de dias para alertar antes do vencimento
}

export default function RelatorioValidade({ diasAlerta = 30 }: RelatorioValidadeProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLotes() {
      try {
        setLoading(true);
        const dataLimite = addDays(new Date(), diasAlerta);
        
        const { data, error } = await supabase
          .from('lotes_insumos')
          .select(`
            id,
            insumo_id,
            quantidade_restante,
            data_validade,
            numero_lote,
            insumo:insumos (
              nome,
              unidade_medida
            )
          `)
          .gt('quantidade_restante', 0) // Apenas lotes com quantidade disponível
          .not('data_validade', 'is', null) // Apenas lotes com data de validade
          .order('data_validade');

        if (error) throw error;

        // Filtrar lotes que vencem dentro do período de alerta
        const lotesProximosVencimento = data.filter(lote => 
          lote.data_validade && isBefore(new Date(lote.data_validade), dataLimite)
        );

        setLotes(lotesProximosVencimento);
      } catch (error) {
        console.error('Erro ao buscar lotes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLotes();
  }, [diasAlerta]);

  function formatDate(date: string | null) {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white dark:border-t-transparent"></div>
          <span className="text-gray-700 dark:text-gray-300">Carregando...</span>
        </div>
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-200">
        Nenhum lote próximo ao vencimento nos próximos {diasAlerta} dias.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Lotes Próximos ao Vencimento
      </h2>
      
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Insumo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Lote
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Quantidade Restante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Validade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {lotes.map((lote) => (
              <tr key={lote.id} className={
                lote.data_validade && isBefore(new Date(lote.data_validade), new Date())
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : ''
              }>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {lote.insumo.nome}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {lote.numero_lote || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {lote.quantidade_restante} {lote.insumo.unidade_medida}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600 dark:text-red-400">
                  {formatDate(lote.data_validade)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}