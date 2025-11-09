'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusIcon from '../ui/StatusIcon';
import Text from '../ui/Text';
import Button from '../Button';

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
    id: string;
    nome: string;
    cnpj: string | null;
    email?: string | null;
    telefone?: string | null;
    endereco?: string | null;
  } | null;
  insumo?: {
    nome: string;
  } | null;
}

interface LotesTableProps {
  // Dados necessários
  insumo_id?: string;
  unidade_medida?: string;

  // Callbacks de ações
  onEdit?: (lote: Lote) => void;
  onDelete?: (lote: Lote) => void;

  // Personalização de exibição
  emptyMessage?: string;
  refreshInterval?: number;
  highlightVencidos?: boolean;
  highlightSemEstoque?: boolean;

  // Personalização de ordenação
  orderBy?: {
    column: 'data_validade' | 'data_recebimento' | 'created_at';
    ascending?: boolean;
  };

  // Componentes customizados
  LoadingComponent?: React.ReactNode;
  EmptyComponent?: React.ReactNode;
}

export default function LotesTable({
  // Dados necessários
  insumo_id,
  unidade_medida,

  // Callbacks de ações
  onEdit,
  onDelete,

  // Personalização de exibição
  emptyMessage = 'Nenhum lote cadastrado para este insumo',
  refreshInterval,
  highlightVencidos = true,
  highlightSemEstoque = true,

  // Personalização de ordenação
  orderBy = { column: 'data_validade', ascending: true },

  // Componentes customizados
  LoadingComponent,
  EmptyComponent,
}: LotesTableProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados iniciais e configurar a atualização automática
  useEffect(() => {
    let isSubscribed = true;

    async function fetchLotes() {
      try {
        setLoading(true);

        // Busca os lotes
        let query = supabase.from('lotes_insumos').select(`
            *,
            fornecedor:fornecedores(id, nome, cnpj, email, telefone, endereco),
            insumo:insumos(nome)
          `);

        // Aplica o filtro por insumo apenas se fornecido
        if (insumo_id) {
          query = query.eq('insumo_id', insumo_id);
        }

        // Aplica a ordenação
        const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });

        if (error) {
          console.error('Erro na consulta:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }

        if (isSubscribed) {
          setLotes(data || []);
          setLoading(false);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Erro ao buscar lotes:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          cause: error.cause,
          error: err instanceof Error ? err : undefined,
        });
        if (isSubscribed) {
          setLotes([]);
          setLoading(false);
        }
      }
    }

    void fetchLotes();

    // Configurar intervalo apenas se necessário
    if (refreshInterval && typeof window !== 'undefined' && lotes.length > 0) {
      const timer = window.setInterval(() => void fetchLotes(), refreshInterval);
      return () => {
        window.clearInterval(timer);
        isSubscribed = false;
      };
    }

    return () => {
      isSubscribed = false;
    };
  }, [insumo_id, orderBy.column, orderBy.ascending, refreshInterval, lotes.length]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    if (LoadingComponent) {
      return LoadingComponent;
    }

    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2">
          <StatusIcon variant="default" size="sm" className="animate-spin" />
          <Text color="muted">Carregando...</Text>
        </div>
      </div>
    );
  }

  if (lotes.length === 0) {
    if (EmptyComponent) {
      return EmptyComponent;
    }

    return (
      <div className="py-4 text-center">
        <Text variant="body-sm" color="muted">
          {emptyMessage}
        </Text>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Lote
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Fornecedor
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                NF
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Qtd. Inicial
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Qtd. Restante
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Recebimento
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Validade
              </Text>
            </th>
            {(onEdit || onDelete) && (
              <th scope="col" className="px-6 py-3 text-right">
                <Text variant="caption" weight="medium" color="muted">
                  Ações
                </Text>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {lotes.map((lote) => (
            <tr
              key={lote.id}
              className={
                lote.data_validade && new Date(lote.data_validade) < new Date() && highlightVencidos
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : lote.quantidade_restante === 0 && highlightSemEstoque
                    ? 'bg-gray-50 dark:bg-gray-900/20'
                    : ''
              }
            >
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm" weight="medium">
                  {lote.numero_lote || '-'}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm" weight="medium">
                  {lote.fornecedor?.nome || '-'}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm" color="muted">
                  {lote.numero_nota_fiscal || '-'}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm">
                  {lote.quantidade_inicial} {unidade_medida}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text
                  variant="body-sm"
                  color={lote.quantidade_restante === 0 ? 'danger' : 'default'}
                >
                  {lote.quantidade_restante} {unidade_medida}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm" color="muted">
                  {formatDate(lote.data_recebimento)}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text
                  variant="body-sm"
                  color={
                    lote.data_validade && new Date(lote.data_validade) < new Date()
                      ? 'danger'
                      : 'muted'
                  }
                >
                  {formatDate(lote.data_validade)}
                </Text>
              </td>
              {(onEdit || onDelete) && (
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="secondary"
                        onClick={() => onEdit(lote)}
                        className="py-1.5 px-2.5 text-sm"
                      >
                        Editar
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (
                            confirm(
                              `Deseja realmente excluir este lote${lote.insumo?.nome ? ` de ${lote.insumo.nome}` : ''}?`
                            )
                          ) {
                            onDelete(lote);
                          }
                        }}
                        className="py-1.5 px-2.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
