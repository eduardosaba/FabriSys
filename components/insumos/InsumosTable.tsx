import { Insumo } from '@/lib/types';
import { useState } from 'react';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import { Search } from 'lucide-react';

type Props = {
  insumos: Insumo[];
  onEdit: (insumo: Insumo) => void;
  onDelete: (insumo: Insumo) => void;
  loading?: boolean;
};

export default function InsumosTable({ insumos, onEdit, onDelete, loading }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar insumos baseado no termo de busca
  const insumosFiltrados = insumos.filter(
    (insumo) =>
      insumo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insumo.categoria?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar insumos por categoria após a filtragem
  const insumosPorCategoria = insumosFiltrados.reduce(
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

  if (insumos.length === 0) {
    return (
      <div className="text-center py-8">
        <Text>Nenhum insumo cadastrado.</Text>
      </div>
    );
  }

  const resultCount = insumosFiltrados.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 px-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        {searchTerm && (
          <Text color="muted">
            {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'} encontrado
            {resultCount === 1 ? '' : 's'}
          </Text>
        )}
      </div>

      {categorias.map((categoria) => (
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
                        <Button
                          variant="secondary"
                          onClick={() => onEdit(insumo)}
                          disabled={loading}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => onDelete(insumo)}
                          disabled={loading}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
