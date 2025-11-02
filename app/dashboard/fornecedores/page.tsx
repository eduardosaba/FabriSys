'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Toaster, toast } from 'react-hot-toast';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  created_at: string;
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  async function fetchFornecedores() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Não foi possível carregar os fornecedores. Tente novamente.');
    } else {
      setFornecedores(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchFornecedores();
  }, []);

  async function handleSave(values: { nome: string; cnpj?: string; contato?: string }) {
    try {
      setSaving(true);
      let error;

      if (editingFornecedor) {
        const result = await supabase
          .from('fornecedores')
          .update(values)
          .eq('id', editingFornecedor.id);
        error = result.error;

        if (!error) {
          toast.success('Fornecedor atualizado com sucesso!');
        }
      } else {
        const result = await supabase
          .from('fornecedores')
          .insert(values);
        error = result.error;

        if (!error) {
          toast.success('Fornecedor cadastrado com sucesso!');
        }
      }

      if (error) throw error;
      
      await fetchFornecedores();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      if (err?.code === '23505') {
        toast.error('Já existe um fornecedor com este CNPJ.');
      } else {
        toast.error('Não foi possível salvar o fornecedor. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fornecedor: Fornecedor) {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', fornecedor.id);
      
      if (error) throw error;
      
      toast.success('Fornecedor excluído com sucesso!');
      await fetchFornecedores();
    } catch (err) {
      console.error(err);
      if (err?.code === '23503') {
        toast.error('Este fornecedor não pode ser excluído pois está vinculado a um ou mais lotes.');
      } else {
        toast.error('Não foi possível excluir o fornecedor. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (!saving) {
      setIsModalOpen(false);
      setEditingFornecedor(null);
    }
  }

  return (
    <>
      <div className="mb-6 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gestão de Fornecedores
        </h1>
        <div className="mt-3 sm:mt-0">
          <Button 
            onClick={() => {
              setEditingFornecedor(null);
              setIsModalOpen(true);
            }}
          >
            Adicionar Fornecedor
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white dark:border-t-transparent"></div>
            <span className="text-gray-700 dark:text-gray-300">Carregando...</span>
          </div>
        </div>
      ) : fornecedores.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum fornecedor cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique no botão acima para adicionar um novo fornecedor
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  CNPJ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Contato
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {fornecedores.map((fornecedor) => (
                <tr key={fornecedor.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{fornecedor.nome}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{fornecedor.cnpj || '-'}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{fornecedor.contato || '-'}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingFornecedor(fornecedor);
                          setIsModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        disabled={saving}
                        onClick={() => handleDelete(fornecedor)}
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
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSave({
              nome: formData.get('nome') as string,
              cnpj: formData.get('cnpj') as string,
              contato: formData.get('contato') as string,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Nome
            </label>
            <input
              type="text"
              name="nome"
              id="nome"
              required
              defaultValue={editingFornecedor?.nome}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              CNPJ
            </label>
            <input
              type="text"
              name="cnpj"
              id="cnpj"
              defaultValue={editingFornecedor?.cnpj}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contato" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Contato
            </label>
            <input
              type="text"
              name="contato"
              id="contato"
              defaultValue={editingFornecedor?.contato}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div className="mt-5 flex justify-end space-x-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}