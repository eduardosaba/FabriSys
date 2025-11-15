'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import StatusIcon from '@/components/ui/StatusIcon';
import Badge from '@/components/ui/Badge';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';

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

// Tipo para a resposta da query do Supabase
interface LoteResponse {
  id: string;
  insumo_id: string;
  quantidade_restante: number;
  data_validade: string | null;
  numero_lote: string | null;
  insumo: {
    nome: string;
    unidade_medida: string;
  }[];
}

interface RelatorioValidadeProps {
  diasAlerta?: number; // Número de dias para alertar antes do vencimento
}

export default function RelatorioValidade({ diasAlerta = 30 }: RelatorioValidadeProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  // Usar o hook de filtros
  const filters = useTableFilters(lotes, {
    searchFields: ['insumo.nome', 'numero_lote'],
    statusField: 'status',
  });

  useEffect(() => {
    async function fetchLotes() {
      try {
        setLoading(true);
        const dataLimite = addDays(new Date(), diasAlerta);

        const { data, error } = await supabase
          .from('lotes_insumos')
          .select(
            `
            id,
            insumo_id,
            quantidade_restante,
            data_validade,
            numero_lote,
            insumo:insumos (
              nome,
              unidade_medida
            )
          `
          )
          .gt('quantidade_restante', 0) // Apenas lotes com quantidade disponível
          .not('data_validade', 'is', null) // Apenas lotes com data de validade
          .order('data_validade');

        if (error) throw error;

        // Converter resposta para o formato correto
        const lotesProcessados = (data as LoteResponse[]).map((lote) => ({
          ...lote,
          insumo: lote.insumo?.[0]
            ? {
                nome: lote.insumo[0].nome,
                unidade_medida: lote.insumo[0].unidade_medida,
              }
            : {
                nome: 'Insumo não encontrado',
                unidade_medida: '-',
              },
        }));

        // Filtrar lotes que vencem dentro do período de alerta
        const lotesProximosVencimento = lotesProcessados.filter(
          (lote) => lote.data_validade && isBefore(new Date(lote.data_validade), dataLimite)
        );

        setLotes(lotesProximosVencimento);
      } catch (error) {
        console.error('Erro ao buscar lotes:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLotes();
  }, [diasAlerta]);

  function formatDate(date: string | null) {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  }

  if (loading) {
    return (
      <Card variant="default" className="py-4">
        <div className="flex items-center justify-center gap-3">
          <StatusIcon variant="default" size="sm" className="animate-spin" />
          <Text color="muted">Carregando...</Text>
        </div>
      </Card>
    );
  }

  if (lotes.length === 0) {
    return (
      <Card variant="default" className="bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center gap-3">
          <StatusIcon variant="success" size="md" />
          <Text color="success">
            Nenhum lote próximo ao vencimento nos próximos {diasAlerta} dias.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" className="space-y-4">
      <Text variant="h3" weight="semibold">
        Lotes Próximos ao Vencimento
      </Text>

      {/* Controles de busca e filtro */}
      {lotes.length > 0 && (
        <TableControls
          filters={filters}
          searchPlaceholder="Buscar lotes..."
          showStatusFilter={false}
        />
      )}

      {filters.filteredItems.length === 0 && lotes.length > 0 ? (
        <EmptyState
          type="no-results"
          title="Nenhum lote encontrado"
          description="Tente ajustar os filtros de busca."
        />
      ) : filters.filteredItems.length === 0 ? (
        <EmptyState
          type="no-data"
          title="Nenhum lote próximo ao vencimento"
          description={`Nenhum lote próximo ao vencimento nos próximos ${diasAlerta} dias.`}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Text variant="caption" weight="medium" color="muted">
                    Insumo
                  </Text>
                </th>
                <th className="px-6 py-3 text-left">
                  <Text variant="caption" weight="medium" color="muted">
                    Lote
                  </Text>
                </th>
                <th className="px-6 py-3 text-left">
                  <Text variant="caption" weight="medium" color="muted">
                    Quantidade Restante
                  </Text>
                </th>
                <th className="px-6 py-3 text-left">
                  <Text variant="caption" weight="medium" color="muted">
                    Validade
                  </Text>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filters.filteredItems.map((lote) => {
                const isVencido =
                  lote.data_validade && isBefore(new Date(lote.data_validade), new Date());
                const badgeVariant = isVencido ? 'danger' : 'warning';

                return (
                  <tr key={lote.id} className={isVencido ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm">{lote.insumo.nome}</Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.numero_lote || '-'}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm">
                        {lote.quantidade_restante} {lote.insumo.unidade_medida}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={badgeVariant}>{formatDate(lote.data_validade)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
