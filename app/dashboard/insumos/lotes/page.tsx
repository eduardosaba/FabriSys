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
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import StatusIcon from '@/components/ui/StatusIcon';
import Badge from '@/components/ui/Badge';

export default function LotesInsumoPage() {
  const [lotes, setLotes] = useState<LoteInsumo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLote, setEditingLote] = useState<LoteInsumo | null>(null);

  useEffect(() => {
    fetchLotes();
  }, []);

  async function fetchLotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lotes_insumos')
        .select('*, insumo:insumos (*), fornecedor:fornecedores (*)')
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
      setEditingLote(null);
    }
  }

  async function handleDelete(lote: LoteInsumo) {
    if (confirm(`Deseja realmente excluir este lote de ${lote.insumo?.nome}?`)) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('lotes_insumos')
          .delete()
          .eq('id', lote.id);

        if (error) throw error;
        toast.success('Lote excluído com sucesso!');
        await fetchLotes();
      } catch (err) {
        console.error('Erro ao excluir lote:', err);
        toast.error('Não foi possível excluir o lote. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSave(values: LoteInsumoFormData) {
    try {
      setSaving(true);
      
      if (editingLote) {
        const { error } = await supabase
          .from('lotes_insumos')
          .update({
            ...values,
            quantidade_restante: editingLote.quantidade_restante * (values.quantidade_inicial / editingLote.quantidade_inicial)
          })
          .eq('id', editingLote.id);

        if (error) throw error;
        toast.success('Lote atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('lotes_insumos')
          .insert({
            ...values,
            quantidade_restante: values.quantidade_inicial,
          });

        if (error) throw error;
        toast.success('Lote registrado com sucesso!');
      }
      
      await fetchLotes();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        const errors = err.format();
        const firstError = Object.values(errors)[0];
        if (firstError && typeof firstError === 'object' && '_errors' in firstError) {
          toast.error(firstError._errors[0] as string);
        } else {
          toast.error('Dados inválidos. Verifique os campos.');
        }
      } else {
        toast.error(`Não foi possível ${editingLote ? 'atualizar' : 'registrar'} o lote. Tente novamente.`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel variant="default" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <Text variant="h2" weight="semibold">
            Recebimento de Lotes
          </Text>
          <div className="mt-3 sm:mt-0">
            <Button onClick={() => setIsModalOpen(true)}>
              Novo Lote
            </Button>
          </div>
        </div>
      </Panel>

      {loading ? (
        <Card variant="default" className="mt-6 py-8">
          <div className="flex items-center justify-center gap-3">
            <StatusIcon variant="default" size="sm" className="animate-spin" />
            <Text color="muted">Carregando...</Text>
          </div>
        </Card>
      ) : lotes.length === 0 ? (
        <Card variant="default" className="mt-6">
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Text variant="body" weight="medium">
              Nenhum lote registrado
            </Text>
            <Text variant="body-sm" color="muted" className="mt-1">
              Clique no botão acima para registrar um novo lote
            </Text>
          </div>
        </Card>
      ) : (
        <Card variant="default" className="mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Insumo
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Fornecedor
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Quantidade
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Restante
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Data Receb.
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Validade
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Nº Lote
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      NF
                    </Text>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <Text variant="caption" weight="medium" color="muted">
                      Ações
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {lotes.map((lote) => (
                  <tr key={lote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" weight="medium">
                        {lote.insumo?.nome}
                      </Text>
                      <Badge variant="default" className="mt-1">
                        {lote.insumo?.unidade_medida}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.fornecedor?.nome || '-'}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.quantidade_inicial}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge 
                        variant={lote.quantidade_restante === 0 ? 'danger' : 
                                lote.quantidade_restante < lote.quantidade_inicial * 0.2 ? 'warning' : 'success'}
                      >
                        {lote.quantidade_restante}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {new Date(lote.data_recebimento).toLocaleDateString()}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.data_validade ? new Date(lote.data_validade).toLocaleDateString() : '-'}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.numero_lote || '-'}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Text variant="body-sm" color="muted">
                        {lote.numero_nota_fiscal || '-'}
                      </Text>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingLote(lote);
                            setIsModalOpen(true);
                          }}
                          className="py-1.5 px-2.5 text-sm"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDelete(lote)}
                          className="py-1.5 px-2.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
        </Card>
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingLote ? 'Editar Lote' : 'Registrar Novo Lote'}
      >
        <LoteInsumoForm
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          loading={saving}
          initialData={editingLote}
        />
      </Modal>
    </>
  );
}