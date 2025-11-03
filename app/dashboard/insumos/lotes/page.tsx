'use client';

import React, { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { LoteInsumo } from '@/lib/types';
import { LoteInsumoFormData } from '@/lib/validations';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import LoteInsumoForm from '@/components/insumos/LoteInsumoForm';
import InsumoSelector from '@/components/insumos/InsumoSelector';
import RegistroCompra from '@/components/insumos/RegistroCompra';
import { Toaster, toast } from 'react-hot-toast';
import { z } from 'zod';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import StatusIcon from '@/components/ui/StatusIcon';
import LotesTable from '@/components/insumos/LotesTable';

interface PageProps {
  searchParams?: {
    insumo_id?: string;
    unidade_medida?: string;
  };
}

export default function LotesInsumoPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LotesContent searchParams={Promise.resolve(searchParams)} />
    </Suspense>
  );
}

function LotesContent({ searchParams }: { searchParams: Promise<PageProps['searchParams']> }) {
  const params = React.use(searchParams);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistroCompraOpen, setRegistroCompraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingLote, setEditingLote] = useState<LoteInsumo | null>(null);

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
        const { error } = await supabase.from('lotes_insumos').delete().eq('id', lote.id);

        if (error) throw error;
        toast.success('Lote excluído com sucesso!');
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
            quantidade_restante:
              editingLote.quantidade_restante *
              (values.quantidade_inicial / editingLote.quantidade_inicial),
          })
          .eq('id', editingLote.id);

        if (error) throw error;
        toast.success('Lote atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('lotes_insumos').insert({
          ...values,
          quantidade_restante: values.quantidade_inicial,
        });

        if (error) throw error;
        toast.success('Lote registrado com sucesso!');
      }

      handleCloseModal();
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        const errors = err.format();
        const firstError = Object.values(errors)[0];
        if (
          firstError &&
          typeof firstError === 'object' &&
          '_errors' in firstError &&
          Array.isArray(firstError._errors)
        ) {
          toast.error(firstError._errors[0]);
        } else {
          toast.error('Dados inválidos. Verifique os campos.');
        }
      } else {
        toast.error(
          `Não foi possível ${editingLote ? 'atualizar' : 'registrar'} o lote. Tente novamente.`
        );
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
            Controle de Estoque
          </Text>
          <div className="mt-3 sm:mt-0 flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Novo Lote Individual
            </Button>
            <Button variant="primary" onClick={() => setRegistroCompraOpen(true)}>
              Entrada de Mercadoria
            </Button>
          </div>
        </div>
      </Panel>{' '}
      <div className="mb-6">
        <InsumoSelector
          onSelect={(insumo, quantidade) => {
            // Aqui você pode integrar com seu fluxo (por exemplo, abrir RegistroCompra já com o item)
            toast.success(`${insumo.nome} x ${quantidade} adicionado para registro`);
            setRegistroCompraOpen(true);
          }}
        />
      </div>
      {loading ? (
        <Card variant="default" className="mt-6 py-8">
          <div className="flex items-center justify-center gap-3">
            <StatusIcon variant="default" size="sm" className="animate-spin" />
            <Text color="muted">Carregando...</Text>
          </div>
        </Card>
      ) : (
        <Card variant="default" className="mt-6">
          <div className="overflow-x-auto">
            <LotesTable
              insumo_id={params?.insumo_id}
              unidade_medida={params?.unidade_medida}
              onEdit={(lote) => {
                // Convertendo o tipo Lote para LoteInsumo
                const loteInsumo: LoteInsumo = {
                  id: lote.id,
                  created_at: new Date().toISOString(),
                  insumo_id: lote.insumo_id,
                  fornecedor_id: lote.fornecedor_id,
                  quantidade_inicial: lote.quantidade_inicial,
                  quantidade_restante: lote.quantidade_restante,
                  data_recebimento: lote.data_recebimento,
                  data_validade: lote.data_validade,
                  numero_lote: lote.numero_lote,
                  numero_nota_fiscal: lote.numero_nota_fiscal,
                  fornecedor: lote.fornecedor,
                };
                setEditingLote(loteInsumo);
                setIsModalOpen(true);
              }}
              onDelete={async (lote) => {
                // Convertendo o tipo Lote para LoteInsumo
                const loteInsumo: LoteInsumo = {
                  id: lote.id,
                  created_at: new Date().toISOString(),
                  insumo_id: lote.insumo_id,
                  fornecedor_id: lote.fornecedor_id,
                  quantidade_inicial: lote.quantidade_inicial,
                  quantidade_restante: lote.quantidade_restante,
                  data_recebimento: lote.data_recebimento,
                  data_validade: lote.data_validade,
                  numero_lote: lote.numero_lote,
                  numero_nota_fiscal: lote.numero_nota_fiscal,
                  fornecedor: lote.fornecedor,
                };
                await handleDelete(loteInsumo);
              }}
              orderBy={{ column: 'created_at', ascending: false }}
              emptyMessage="Nenhum lote registrado. Clique no botão acima para registrar um novo lote."
              refreshInterval={30000} // Atualizar a cada 30 segundos
              highlightVencidos
              highlightSemEstoque
            />
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
      <Modal
        isOpen={isRegistroCompraOpen}
        onClose={() => setRegistroCompraOpen(false)}
        title="Registro de Compra"
      >
        <RegistroCompra onClose={() => setRegistroCompraOpen(false)} />
      </Modal>
    </>
  );
}
