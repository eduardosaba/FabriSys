'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Plus, Eye, Edit, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';

interface OrdemProducao {
  id: string;
  numero_op: string;
  produto_final: {
    nome: string;
    preco_venda: number;
  };
  quantidade_prevista: number;
  status: string;
  data_prevista: string;
  custo_previsto: number;
  created_at: string;
}

interface OrdemProducaoRaw {
  id: string;
  numero_op: string;
  produto_final: { nome: string; preco_venda: number } | { nome: string; preco_venda: number }[];
  quantidade_prevista: number;
  status: string;
  data_prevista: string;
  custo_previsto: number;
  created_at: string;
}

export default function OrdensProducaoPage() {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemProducao | null>(null);
  const { toast } = useToast();

  const loadOrdens = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_producao')
        .select(
          `
          id,
          numero_op,
          quantidade_prevista,
          status,
          data_prevista,
          custo_previsto,
          created_at,
          produto_final:produtos_finais!inner(nome, preco_venda)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar os dados para o formato correto
      const ordensFormatadas = (data || []).map((ordem: OrdemProducaoRaw) => ({
        ...ordem,
        produto_final: Array.isArray(ordem.produto_final)
          ? ordem.produto_final[0]
          : ordem.produto_final,
      }));

      setOrdens(ordensFormatadas);
    } catch (err) {
      console.error('Erro ao carregar ordens:', err);
      toast({
        title: 'Erro ao carregar ordens',
        description: 'Não foi possível carregar as ordens de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrdens();
  }, [loadOrdens]);

  async function handleDelete() {
    if (!selectedOrdem) return;

    try {
      const { error } = await supabase.from('ordens_producao').delete().eq('id', selectedOrdem.id);

      if (error) throw error;

      toast({
        title: 'Ordem excluída',
        description: 'Ordem de produção removida com sucesso.',
        variant: 'success',
      });

      void loadOrdens();
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a ordem.',
        variant: 'error',
      });
    } finally {
      setDeleteModal(false);
      setSelectedOrdem(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'em_producao':
        return 'bg-blue-100 text-blue-800';
      case 'finalizada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Produção</h1>
          <p className="text-gray-600">Gerenciamento completo das ordens de produção</p>
        </div>
        <Button onClick={() => (window.location.href = '/dashboard/producao/ordens/nova')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Ordem
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {ordens.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma ordem de produção</h3>
            <p className="mt-1 text-sm text-gray-500">
              As ordens de produção gerenciam a fabricação dos seus produtos finais.
            </p>
            <div className="mt-6">
              <Button onClick={() => (window.location.href = '/dashboard/producao/ordens/nova')}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira ordem
              </Button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Prevista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Previsto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordens.map((ordem) => (
                <tr key={ordem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ordem.numero_op}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ordem.produto_final.nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ordem.quantidade_prevista}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ordem.status)}`}
                    >
                      {ordem.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ordem.data_prevista).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(ordem.custo_previsto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/ordens/${ordem.id}`)
                        }
                        className="text-blue-600 hover:text-blue-900"
                        title="Visualizar"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/ordens/${ordem.id}/editar`)
                        }
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrdem(ordem);
                          setDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Confirmar exclusão">
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Tem certeza que deseja excluir a ordem de produção{' '}
            <strong>{selectedOrdem?.numero_op}</strong>?
          </p>
          <p className="text-sm text-gray-500 mb-6">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
