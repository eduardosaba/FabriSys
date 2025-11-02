import { Insumo } from '@/lib/types';
import Button from '@/components/Button';

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
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nome
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Unidade
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Estoque Mínimo
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {insumos.map((insumo) => (
            <tr key={insumo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="font-medium text-gray-900 dark:text-white">
                  {insumo.nome}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {insumo.unidade_medida}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {insumo.estoque_minimo_alerta}
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
