import { Insumo } from '@/lib/types';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';
import { Edit, Trash2 } from 'lucide-react';

type Props = {
  insumos: Insumo[];
  onEdit: (insumo: Insumo) => void;
  onDelete: (insumo: Insumo) => void;
  loading?: boolean;
};

export default function InsumosTable({ insumos, onEdit, onDelete, loading }: Props) {
  // Usar o hook de filtros
  const filters = useTableFilters(insumos, {
    searchFields: ['nome', 'categoria.nome'],
    statusField: 'ativo',
  });

  // Agrupar insumos por categoria após a filtragem
  const insumosPorCategoria = filters.filteredItems.reduce(
    (acc, insumo) => {
      const categoria = insumo.categoria?.nome || 'Sem categoria';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(insumo);
      return acc;
    },
    {} as Record<string, Insumo[]>
  );

  // Ordenar categorias alfabeticamente
  const categorias = Object.keys(insumosPorCategoria).sort();

  return (
    <div className="space-y-8">
      {/* Controles de busca e filtro */}
      {insumos.length > 0 && (
        <TableControls filters={filters} searchPlaceholder="Buscar por nome ou categoria..." />
      )}

      {filters.filteredItems.length === 0 && insumos.length > 0 ? (
        <EmptyState
          type="no-results"
          title="Nenhum insumo encontrado"
          description="Tente ajustar os filtros de busca."
        />
      ) : filters.filteredItems.length === 0 ? (
        <EmptyState
          type="no-data"
          title="Nenhum insumo cadastrado"
          description="Comece cadastrando seus primeiros insumos."
        />
      ) : (
        categorias.map((categoria) => (
          <div key={categoria}>
            <Text variant="h4" className="mb-4 px-6">
              {categoria}
            </Text>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Nome
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Unidade
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Status
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Estoque Atual
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Estoque Mínimo
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <Text variant="caption" weight="medium" color="muted">
                        Valor
                      </Text>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      <Text variant="caption" weight="medium" color="muted">
                        Ações
                      </Text>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {insumosPorCategoria[categoria].map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="whitespace-nowrap px-6 py-4">
                        <Text variant="body-sm" weight="medium">
                          {insumo.nome}
                        </Text>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant="default">{insumo.unidade_medida}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge
                          variant={
                            !insumo.estoque_atual
                              ? 'danger'
                              : insumo.estoque_atual < insumo.estoque_minimo_alerta
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {!insumo.estoque_atual
                            ? 'Sem estoque'
                            : insumo.estoque_atual < insumo.estoque_minimo_alerta
                              ? 'Estoque baixo'
                              : 'Normal'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Text variant="body-sm" weight="medium">
                          {insumo.estoque_atual ?? 0} {insumo.unidade_medida}
                        </Text>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Text variant="body-sm" color="muted">
                          {insumo.estoque_minimo_alerta} {insumo.unidade_medida}
                        </Text>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Text variant="body-sm" weight="medium">
                          {typeof insumo.ultimo_valor === 'number'
                            ? `R$ ${insumo.ultimo_valor.toFixed(2)}`
                            : 'N/A'}
                        </Text>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEdit(insumo)}
                            className="inline-flex items-center justify-center w-8 h-8 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                            aria-label={`Editar insumo ${insumo.nome}`}
                            title="Editar"
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(insumo)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label={`Excluir insumo ${insumo.nome}`}
                            title="Excluir"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
