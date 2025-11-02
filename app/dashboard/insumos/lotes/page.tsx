'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LoteInsumo } from '@/lib/types';
import { LoteInsumoFormData } from '@/lib/validations';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import LoteInsumoForm from '@/components/insumos/LoteInsumoForm';
import { Toaster, toast } from 'react-hot-toast';
import { z } from 'zod';

export default function LotesInsumoPage() {
  const [lotes, setLotes] = useState<LoteInsumo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLotes();
  }, []);

  async function fetchLotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lotes_insumos')
        .select(`
          *,
          insumo:insumos (*),
          fornecedor:fornecedores (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLotes(data || []);
    } catch (err) {
      console.error('Erro ao buscar lotes:', err);
      toast.error('Erro ao carregar lotes de insumos');
    } finally {
      setLoading(false);
    }
  }

  function handleCloseModal() {
    if (!saving) {
      setIsModalOpen(false);
    }
  }

  async function handleSave(values: LoteInsumoFormData) {
    try {
      setSaving(true);
      
      // Insere o novo lote
      const { error } = await supabase
        .from('lotes_insumos')
        .insert({
          ...values,
          quantidade_restante: values.quantidade_inicial,
        });

      if (error) throw error;
      
      toast.success('Lote registrado com sucesso!');
      await fetchLotes();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error('Não foi possível registrar o lote. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-6 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Recebimento de Lotes
        </h1>
        <div className="mt-3 sm:mt-0">
          <Button onClick={() => setIsModalOpen(true)}>Novo Lote</Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">Carregando...</div>
        </div>
      ) : lotes.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum lote registrado
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique no botão acima para registrar um novo lote
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Insumo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Fornecedor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Quantidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Restante
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Data Receb.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Validade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Nº Lote
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    NF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {lotes.map((lote) => (
                  <tr key={lote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {lote.insumo?.nome}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {lote.insumo?.unidade_medida}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.fornecedor?.nome || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.quantidade_inicial}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.quantidade_restante}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(lote.data_recebimento).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.data_validade
                        ? new Date(lote.data_validade).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.numero_lote || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lote.numero_nota_fiscal || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Registrar Novo Lote"
      >
        <LoteInsumoForm
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          loading={saving}
        />
      </Modal>
    </>
  );
}