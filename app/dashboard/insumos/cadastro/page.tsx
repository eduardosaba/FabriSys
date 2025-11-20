'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Insumo } from '@/lib/types';
import { z } from 'zod';
import { insumoSchema } from '@/lib/validations';
import InsumosTable from '@/components/insumos/InsumosTable';
import { Toaster, toast } from 'react-hot-toast';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import StatusIcon from '@/components/ui/StatusIcon';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import InsumoForm from '@/components/insumos/InsumoForm';
import PageHeader from '@/components/ui/PageHeader';
import { Package } from 'lucide-react';

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
      const res = await supabase
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

      if (res?.error && (res.error as { message?: string }).message) {
        throw new Error((res.error as { message?: string }).message as string);
      }

      setInsumos((res?.data as Insumo[]) || []);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Erro ao buscar insumos:', err.message);
        toast.error(err.message);
      } else {
        console.error('Erro desconhecido:', err);
        toast.error('Erro desconhecido ao carregar insumos');
      }
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
      const resLotes = await supabase
        .from('lotes_insumos')
        .select('id')
        .eq('insumo_id', insumo.id)
        .limit(1);

      if (resLotes?.error && (resLotes.error as { message?: string }).message)
        throw new Error((resLotes.error as { message?: string }).message as string);

      if (resLotes?.data && resLotes.data.length > 0) {
        toast.error('Não é possível excluir este insumo pois existem lotes associados.');
        return;
      }

      const resDelete = await supabase.from('insumos').delete().eq('id', insumo.id);
      if (resDelete?.error && (resDelete.error as { message?: string }).message)
        throw new Error((resDelete.error as { message?: string }).message as string);

      toast.success('Insumo excluído com sucesso!');
      await fetchInsumos();
    } catch (err) {
      if (err instanceof Error) {
        console.error('Erro ao excluir insumo:', err.message);
        toast.error(err.message);
      } else {
        console.error('Erro desconhecido ao excluir insumo:', err);
        toast.error('Não foi possível excluir o insumo. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(values: z.infer<typeof insumoSchema>) {
    try {
      setSaving(true);

      const safeValues = {
        nome: String(values.nome ?? ''),
        unidade_medida: String(values.unidade_medida ?? 'un'),
        estoque_minimo_alerta: Number(values.estoque_minimo_alerta ?? 0),
        categoria_id: values.categoria_id || undefined,
        atributos_dinamicos: values.atributos_dinamicos || {},
        unidade_estoque: values.unidade_estoque || undefined,
        unidade_consumo: values.unidade_consumo || undefined,
        fator_conversao: Number(values.fator_conversao ?? 1),
        custo_por_ue: values.custo_por_ue ? Number(values.custo_por_ue) : undefined,
      };

      const resInsert = await supabase.from('insumos').insert(safeValues);
      if (resInsert?.error && (resInsert.error as { message?: string }).message)
        throw new Error((resInsert.error as { message?: string }).message as string);
      toast.success('Insumo salvo com sucesso!');
    } catch (err) {
      if (err instanceof Error) {
        console.error('Erro ao salvar insumo:', err.message);
        toast.error(err.message);
      } else {
        console.error('Erro desconhecido ao salvar insumo:', err);
        toast.error('Não foi possível salvar o insumo. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Cadastro de Insumos"
        description="Gerencie o cadastro de matérias-primas e insumos"
        icon={Package}
      >
        <Button
          onClick={() => {
            setEditingInsumo(null);
            setIsModalOpen(true);
          }}
        >
          Novo Insumo
        </Button>
      </PageHeader>

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
          initialValues={(() => {
            if (!editingInsumo) return undefined;

            return {
              nome: String(editingInsumo.nome),
              unidade_medida: String(editingInsumo.unidade_medida),
              estoque_minimo_alerta: editingInsumo.estoque_minimo_alerta,
            };
          })()}
        />
      </Modal>
    </>
  );
}
