'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Insumo } from '@/lib/types';
import { insumoSchema } from '@/lib/validations';
import InsumosTable from '@/components/insumos/InsumosTable';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import InsumoForm from '@/components/insumos/InsumoForm';
import AlertasEstoque from '@/components/insumos/AlertasEstoque';
import RelatorioValidade from '@/components/insumos/RelatorioValidade';
import { Toaster, toast } from 'react-hot-toast';
import { z } from 'zod';

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);

  async function fetchInsumos() {
    setLoading(true);
    const { data, error } = await supabase.from('insumos').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar insumos:', error);
      toast.error('Não foi possível carregar os insumos. Tente novamente.');
    } else {
      setInsumos(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchInsumos();
  }, []);

  async function handleSave(values: { nome: string; unidade_medida: string; estoque_minimo_alerta: number }) {
    try {
      // Validar dados com Zod
      const validatedData = insumoSchema.parse(values);
      
      setSaving(true);
      let error;
      
      if (editingInsumo) {
        // Atualiza um insumo existente
        const result = await supabase
          .from('insumos')
          .update(validatedData)
          .eq('id', editingInsumo.id);
        error = result.error;

        if (!error) {
          toast.success('Insumo atualizado com sucesso!');
        }
      } else {
        // Cria um novo insumo
        const result = await supabase
          .from('insumos')
          .insert(validatedData);
        error = result.error;

        if (!error) {
          toast.success('Insumo cadastrado com sucesso!');
        }
      }

      if (error) throw error;
      
      await fetchInsumos();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        // Erro de validação
        toast.error(err.errors[0].message);
      } else if (err?.code === '23505') {
        // Erro de chave única (nome duplicado)
        toast.error('Já existe um insumo com este nome.');
      } else {
        toast.error('Não foi possível salvar o insumo. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(insumo: Insumo) {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('insumos')
        .delete()
        .eq('id', insumo.id);
      
      if (error) throw error;
      
      toast.success('Insumo excluído com sucesso!');
      await fetchInsumos();
    } catch (err) {
      console.error(err);
      if (err?.code === '23503') {
        toast.error('Este insumo não pode ser excluído pois está vinculado a um ou mais lotes.');
      } else {
        toast.error('Não foi possível excluir o insumo. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (!saving) {
      setIsModalOpen(false);
      setEditingInsumo(null);
    }
  }

  return (
    <>
      <div className="mb-6 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gestão de Insumos
        </h1>
        <div className="mt-3 sm:mt-0">
          <Button 
            onClick={() => {
              setEditingInsumo(null);
              setIsModalOpen(true);
            }}
          >
            Adicionar Insumo
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <AlertasEstoque />
      </div>

      <div className="mb-6">
        <RelatorioValidade diasAlerta={30} />
      </div>
      
      {loading ? (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white dark:border-t-transparent"></div>
            <span className="text-gray-700 dark:text-gray-300">Carregando...</span>
          </div>
        </div>
      ) : insumos.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum insumo cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique no botão acima para adicionar um novo insumo
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
          <InsumosTable 
            insumos={insumos}
            onEdit={(insumo) => {
              setEditingInsumo(insumo);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
            loading={saving}
          />
        </div>
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
      >
        <InsumoForm
          loading={saving}
          onCancel={handleCloseModal}
          onSubmit={handleSave}
          initialValues={editingInsumo ?? undefined}
        />
      </Modal>
    </>
  );
}
