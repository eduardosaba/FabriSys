'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Edit, Trash2, FileText, Loader2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { ProdutoFinal } from '@/lib/types/producao';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';

interface ListaProdutosProps {
  produtos: ProdutoFinal[];
  onUpdate: () => void;
}

export default function ListaProdutos({ produtos, onUpdate }: ListaProdutosProps) {
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdutoFinal | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const { toast } = useToast();

  // Usar o hook de filtros
  const filters = useTableFilters(produtos, {
    searchFields: ['nome', 'descricao', 'codigo_interno'],
  });

  async function handleDelete() {
    if (!selectedProduct) return;

    setDeletingProductId(selectedProduct.id);
    try {
      const { error } = await supabase
        .from('produtos_finais')
        .delete()
        .eq('id', selectedProduct.id);

      if (error) throw error;

      toast({
        title: 'Produto excluído',
        description: 'Produto removido com sucesso.',
        variant: 'success',
      });

      onUpdate();
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o produto.',
        variant: 'error',
      });
    } finally {
      setDeleteModal(false);
      setSelectedProduct(null);
      setDeletingProductId(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Controles de busca e filtro */}
        {produtos.length > 0 && (
          <TableControls filters={filters} searchPlaceholder="Buscar produtos..." />
        )}

        {filters.filteredItems.length === 0 && produtos.length > 0 ? (
          <EmptyState
            type="no-results"
            title="Nenhum produto encontrado"
            description="Tente ajustar os filtros de busca ou status."
          />
        ) : filters.filteredItems.length === 0 ? (
          <EmptyState
            type="no-data"
            title="Nenhum produto cadastrado"
            description="Comece criando o primeiro produto final para seu sistema de produção."
            action={{
              label: 'Criar primeiro produto',
              onClick: () => (window.location.href = '/dashboard/producao/produtos/novo'),
              icon: <Plus className="h-5 w-5" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Venda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CMP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filters.filteredItems.map((produto) => (
                  <tr key={produto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {produto.imagem_url ? (
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            <Image
                              src={produto.imagem_url}
                              alt={produto.nome}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200" />
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{produto.nome}</div>
                          {produto.descricao && (
                            <div className="text-sm text-gray-500">{produto.descricao}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {produto.codigo_interno || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(produto.preco_venda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produto.cmp ? formatCurrency(produto.cmp) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${produto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/produtos/ficha-tecnica/${produto.id}`)
                          }
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label={`Ver ficha técnica de ${produto.nome}`}
                          title="Ficha Técnica"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                          }
                          className="inline-flex items-center justify-center w-8 h-8 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                          aria-label={`Editar produto ${produto.nome}`}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(produto);
                            setDeleteModal(true);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          aria-label={`Excluir produto ${produto.nome}`}
                          title="Excluir"
                          disabled={deletingProductId === produto.id}
                        >
                          {deletingProductId === produto.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteModal}
        onClose={() => {
          if (deletingProductId) return; // Não permite fechar durante exclusão
          setDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Excluir Produto"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Tem certeza que deseja excluir o produto <strong>{selectedProduct?.nome}</strong>? Esta
            ação não pode ser desfeita.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setDeleteModal(false);
              setSelectedProduct(null);
            }}
            disabled={deletingProductId !== null}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDelete}
            disabled={deletingProductId !== null}
          >
            {deletingProductId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}
