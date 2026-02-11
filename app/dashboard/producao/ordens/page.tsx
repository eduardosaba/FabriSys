'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Plus, Eye, Edit, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';

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

  const { searchTerm, setSearchTerm, filteredItems } = useTableFilters(ordens, {
    searchFields: ['numero_op', 'produto_final.nome', 'status'],
  });

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
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Ordens de Produção"
        description="Gerenciamento completo das ordens de produção"
        icon={ClipboardList}
      >
        <Button onClick={() => (window.location.href = '/dashboard/producao/ordens/nova')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ordem
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <TableControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar ordens por OP, produto ou status..."
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando ordens...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            type={ordens.length === 0 ? 'no-data' : 'no-results'}
            title={ordens.length === 0 ? 'Nenhuma ordem de produção' : 'Nenhuma ordem encontrada'}
            description={
              ordens.length === 0
                ? 'As ordens de produção gerenciam a fabricação dos seus produtos finais.'
                : 'Tente ajustar os filtros de busca para encontrar o que procura.'
            }
            action={
              ordens.length === 0
                ? {
                    label: 'Criar primeira ordem',
                    onClick: () => (window.location.href = '/dashboard/producao/ordens/nova'),
                  }
                : undefined
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      OP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Data Prevista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Custo Previsto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredItems.map((ordem) => (
                    <tr key={ordem.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {ordem.numero_op}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {ordem.produto_final.nome}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {ordem.quantidade_prevista}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(ordem.status)}`}
                        >
                          {ordem.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(ordem.data_prevista).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(ordem.custo_previsto)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              (window.location.href = `/dashboard/producao/ordens/${ordem.id}`)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`Visualizar ordem ${ordem.numero_op}`}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              (window.location.href = `/dashboard/producao/ordens/${ordem.id}/editar`)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-yellow-600 transition-colors duration-200 hover:bg-yellow-50 hover:text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                            aria-label={`Editar ordem ${ordem.numero_op}`}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrdem(ordem);
                              setDeleteModal(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label={`Excluir ordem ${ordem.numero_op}`}
                            title="Excluir"
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

            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((ordem) => (
                <div
                  key={ordem.id}
                  className="bg-white rounded-lg border p-4 shadow-sm flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">
                      {ordem.numero_op}{' '}
                      <span className="font-normal">- {ordem.produto_final.nome}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Quantidade: {ordem.quantidade_prevista}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(ordem.status)}`}
                      >
                        {ordem.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Prevista: {new Date(ordem.data_prevista).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="text-sm font-medium">
                      {formatCurrency(ordem.custo_previsto)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/ordens/${ordem.id}`)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none"
                        aria-label={`Visualizar ordem ${ordem.numero_op}`}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/ordens/${ordem.id}/editar`)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-yellow-600 transition-colors duration-200 hover:bg-yellow-50 hover:text-yellow-800 focus:outline-none"
                        aria-label={`Editar ordem ${ordem.numero_op}`}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrdem(ordem);
                          setDeleteModal(true);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus:outline-none"
                        aria-label={`Excluir ordem ${ordem.numero_op}`}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Confirmar exclusão">
        <div className="p-6">
          <p className="mb-4 text-gray-700">
            Tem certeza que deseja excluir a ordem de produção{' '}
            <strong>{selectedOrdem?.numero_op}</strong>?
          </p>
          <p className="mb-6 text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
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
