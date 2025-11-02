'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lote {
  id: string;
  insumo_id: string;
  fornecedor_id: string;
  quantidade_inicial: number;
  quantidade_restante: number;
  data_recebimento: string;
  data_validade: string | null;
  numero_lote: string | null;
  numero_nota_fiscal: string | null;
  fornecedor: {
    nome: string;
  } | null;
}

interface LotesTableProps {
  insumo_id: string;
  unidade_medida: string;
}

export default function LotesTableNew({ insumo_id, unidade_medida }: LotesTableProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchLotes() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lotes_insumos')
          .select(`
            *,
            fornecedor:fornecedores(nome)
          `)
          .eq('insumo_id', insumo_id)
          .order('data_validade', { ascending: true, nullsLast: true });

        if (error) throw error;
        
        if (isMounted) {
          setLotes(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar lotes:', error);
        if (isMounted) {
          setLotes([]);
          setLoading(false);
        }
      }
    }

    fetchLotes();

    return () => {
      isMounted = false;
    };
  }, [insumo_id]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

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
      <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Nenhum lote cadastrado para este insumo
      </div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-900/50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Lote
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Fornecedor
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            NF
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Qtd. Inicial
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Qtd. Restante
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Recebimento
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Validade
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
        {lotes.map((lote) => (
          <tr key={lote.id} className={
            lote.data_validade && new Date(lote.data_validade) < new Date() 
              ? 'bg-red-50 dark:bg-red-900/20' 
              : lote.quantidade_restante === 0
              ? 'bg-gray-50 dark:bg-gray-900/20'
              : ''
          }>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
              {lote.numero_lote || '-'}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
              {lote.fornecedor?.nome || '-'}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {lote.numero_nota_fiscal || '-'}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
              {lote.quantidade_inicial} {unidade_medida}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
              {lote.quantidade_restante} {unidade_medida}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(lote.data_recebimento)}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(lote.data_validade)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}