'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Edit, Trash2, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { ProdutoFinal } from '@/lib/types/producao';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

interface ListaProdutosProps {
  produtos: ProdutoFinal[];
  onUpdate: () => void;
}

export default function ListaProdutos({ produtos, onUpdate }: ListaProdutosProps) {
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdutoFinal | null>(null);
  const { toast } = useToast();

  async function handleDelete() {
    if (!selectedProduct) return;

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
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {produtos.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto cadastrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando o primeiro produto final para seu sistema de produção.
            </p>
            <div className="mt-6">
              <button
                onClick={() => (window.location.href = '/dashboard/producao/produtos/novo')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Criar primeiro produto
              </button>
            </div>
          </div>
        ) : (
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
              {produtos.map((produto) => (
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
                        className="text-blue-600 hover:text-blue-900"
                        title="Ficha Técnica"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                        }
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(produto);
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

      <Modal
        isOpen={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Excluir Produto"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Tem certeza que deseja excluir o produto {selectedProduct?.nome}? Esta ação não pode ser
            desfeita.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => {
              setDeleteModal(false);
              setSelectedProduct(null);
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={handleDelete}
          >
            Excluir
          </button>
        </div>
      </Modal>
    </>
  );
}
