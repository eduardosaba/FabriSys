import { Insumo } from '@/lib/types';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';

type Props = {
  insumos: Insumo[];
  onEdit: (insumo: Insumo) => void;
  onDelete: (insumo: Insumo) => void;
  loading?: boolean;
};

export default function InsumosTable({ insumos, onEdit, onDelete, loading }: Props) {
  return (
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
                Estoque Atual
              </Text>
            </th>
            <th scope="col" className="px-6 py-3 text-left">
              <Text variant="caption" weight="medium" color="muted">
                Estoque Mínimo
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
          {insumos.map((insumo) => (
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
                <Text 
                  variant="body-sm" 
                  color={insumo.estoque_atual < insumo.estoque_minimo_alerta ? 'danger' : 'success'}
                  weight="medium"
                >
                  {insumo.estoque_atual} {insumo.unidade_medida}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Text variant="body-sm" color="muted">
                  {insumo.estoque_minimo_alerta} {insumo.unidade_medida}
                </Text>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(insumo)}
                    disabled={loading}
                    className="py-1.5 px-2.5 text-sm"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir o insumo "${insumo.nome}"?`)) {
                        onDelete(insumo);
                      }
                    }}
                    disabled={loading}
                    className="py-1.5 px-2.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Deletar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
