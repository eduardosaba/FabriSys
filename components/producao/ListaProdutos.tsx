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
import Pagination from '@/components/ui/Pagination';

interface ListaProdutosProps {
  produtos: ProdutoFinal[];
  onUpdate: () => void;
}

export default function ListaProdutos({ produtos, onUpdate }: ListaProdutosProps) {
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdutoFinal | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const { toast } = useToast();

  // Usar o hook de filtros com paginação
  const filters = useTableFilters(produtos, {
    searchFields: ['nome', 'descricao', 'codigo_interno'],
    itemsPerPage: 10,
    enablePagination: true,
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

  // Navega para a rota por produto que redireciona para view/edit conforme permissões
  function handleViewFicha(produto: ProdutoFinal) {
    window.location.href = `/dashboard/producao/produtos/${produto.id}/ficha-tecnica`;
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow">
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
          <>
            {/* Mobile: mostrar como cards */}
            <div className="block sm:hidden">
              <ul className="space-y-4 p-4">
                {filters.paginatedItems.map((produto) => (
                  <li
                    key={produto.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                      {produto.imagem_url ? (
                        <Image
                          src={produto.imagem_url}
                          alt={produto.nome}
                          width={64}
                          height={64}
                          className="object-cover h-16 w-16 rounded-md"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gray-200 rounded-md" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-base font-medium text-gray-900 truncate">
                          {produto.nome}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(produto.preco_venda)}
                        </div>
                      </div>
                      {produto.descricao && (
                        <div className="text-sm text-gray-500 truncate">{produto.descricao}</div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Código: {produto.codigo_interno || '-'}
                        </div>
                        <div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5
                              ${produto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleViewFicha(produto)}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <FileText className="h-4 w-4" />
                          Ficha
                        </button>
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                          }
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(produto);
                            setDeleteModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                          disabled={deletingProductId === produto.id}
                        >
                          {deletingProductId === produto.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Excluir</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desktop / Tablet: tabela (oculta no mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Preço Venda
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      CMP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filters.paginatedItems.map((produto) => (
                    <tr key={produto.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          {produto.imagem_url ? (
                            <div className="relative h-10 w-10 flex-shrink-0">
                              <Image
                                src={produto.imagem_url}
                                alt={produto.nome}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200" />
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{produto.nome}</div>
                            {produto.descricao && (
                              <div className="text-sm text-gray-500">{produto.descricao}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {produto.codigo_interno || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(produto.preco_venda)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {produto.cmp ? formatCurrency(produto.cmp) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5
                        ${produto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewFicha(produto)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`Ver ficha técnica de ${produto.nome}`}
                            title="Ficha Técnica"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-yellow-600 transition-colors duration-200 hover:bg-yellow-50 hover:text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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

            {/* Paginação */}
            {filters.totalPages > 1 && (
              <Pagination
                currentPage={filters.currentPage}
                totalPages={filters.totalPages}
                onPageChange={filters.setCurrentPage}
                itemsPerPage={filters.itemsPerPage}
                onItemsPerPageChange={filters.setItemsPerPage}
                totalItems={filters.resultCount}
              />
            )}
          </>
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
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleDelete}
            disabled={deletingProductId !== null}
          >
            {deletingProductId ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
