'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Insumo } from '@/lib/types';
import { InsumoFormData } from '@/lib/validations/insumos';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import InsumoForm from '@/components/insumos/InsumoForm';
import { unidadesMedida } from '@/lib/validations/insumos';
import InsumosTable from '@/components/insumos/InsumosTable';
import { Toaster, toast } from 'react-hot-toast';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import StatusIcon from '@/components/ui/StatusIcon';

// Componente "InsumosPorCategoria" removido por não ser utilizado

export default function InsumosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);

  useEffect(() => {
    void fetchInsumos();
  }, []);

  async function fetchInsumos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insumos')
        .select(
          `
          *,
          categoria:categorias (
            id,
            nome
          )
        `
        )
        .order('nome');

      if (error) throw error;
      setInsumos(data || []);
    } catch (err) {
      console.error('Erro ao buscar insumos:', err);
      toast.error('Erro ao carregar insumos');
    } finally {
      setLoading(false);
    }
  }

  function handleCloseModal() {
    if (!saving) {
      setIsModalOpen(false);
      setEditingInsumo(null);
    }
  }

  async function handleDelete(insumo: Insumo) {
    try {
      setLoading(true);

      // Verificar se há lotes associados
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes_insumos')
        .select('id')
        .eq('insumo_id', insumo.id)
        .limit(1);

      if (lotesError) throw lotesError;

      if (lotes && lotes.length > 0) {
        toast.error('Não é possível excluir este insumo pois existem lotes associados.');
        return;
      }

      const { error } = await supabase.from('insumos').delete().eq('id', insumo.id);

      if (error) throw error;

      toast.success('Insumo excluído com sucesso!');
      await fetchInsumos();
    } catch (err) {
      console.error('Erro ao excluir insumo:', err);
      toast.error('Não foi possível excluir o insumo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(values: InsumoFormData) {
    try {
      setSaving(true);

      if (editingInsumo) {
        const { error } = await supabase
          .from('insumos')
          .update({
            nome: values.nome,
            unidade_medida: values.unidade_medida,
            estoque_minimo_alerta: values.estoque_minimo_alerta,
            categoria_id: values.categoria_id,
            atributos_dinamicos: values.atributos_dinamicos,
          })
          .eq('id', editingInsumo.id);

        if (error) throw error;
        toast.success('Insumo atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('insumos').insert({
          nome: values.nome,
          unidade_medida: values.unidade_medida,
          estoque_minimo_alerta: values.estoque_minimo_alerta,
        });

        if (error) throw error;
        toast.success('Insumo cadastrado com sucesso!');
      }

      await fetchInsumos();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      toast.error(
        `Não foi possível ${editingInsumo ? 'atualizar' : 'cadastrar'} o insumo. Tente novamente.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel variant="default" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <Text variant="h2" weight="semibold">
            Insumos
          </Text>
          <div className="mt-3 sm:mt-0">
            <Button
              onClick={() => {
                setEditingInsumo(null);
                setIsModalOpen(true);
              }}
            >
              Novo Insumo
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
      ) : (
        <Card variant="default" className="mt-6">
          <InsumosTable
            insumos={insumos}
            onEdit={(insumo) => {
              setEditingInsumo(insumo);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
            loading={loading}
          />
        </Card>
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
      >
        <InsumoForm
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          loading={saving}
          initialValues={
            editingInsumo
              ? {
                  nome: editingInsumo.nome,
                  unidade_medida: (unidadesMedida as readonly string[]).includes(
                    editingInsumo.unidade_medida
                  )
                    ? (editingInsumo.unidade_medida as (typeof unidadesMedida)[number])
                    : 'un',
                  estoque_minimo_alerta: editingInsumo.estoque_minimo_alerta,
                  categoria_id: editingInsumo.categoria_id,
                  atributos_dinamicos: editingInsumo.atributos_dinamicos ?? {},
                }
              : undefined
          }
        />
      </Modal>
    </>
  );
}
