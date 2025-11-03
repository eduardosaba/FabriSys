'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Categoria } from '@/lib/types/insumos';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import { toast } from 'sonner';

interface CategoriaFormData {
  nome: string;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<CategoriaFormData>({ nome: '' });

  useEffect(() => {
    void fetchCategorias();
  }, []);

  async function fetchCategorias() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('categorias').select('*').order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(categoria?: Categoria) {
    if (categoria) {
      setEditingCategoria(categoria);
      setFormData({ nome: categoria.nome });
    } else {
      setEditingCategoria(null);
      setFormData({ nome: '' });
    }
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias')
          .update({ nome: formData.nome })
          .eq('id', editingCategoria.id);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('categorias').insert([{ nome: formData.nome }]);

        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setIsModalOpen(false);
      await fetchCategorias();
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      toast.error('Erro ao salvar categoria');
    }
  }

  async function handleDelete(categoria: Categoria) {
    try {
      // Verificar se há insumos usando esta categoria
      const { data: insumos, error: checkError } = await supabase
        .from('insumos')
        .select('id')
        .eq('categoria_id', categoria.id)
        .limit(1);

      if (checkError) throw checkError;

      if (insumos && insumos.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui insumos');
        return;
      }

      const { error } = await supabase.from('categorias').delete().eq('id', categoria.id);

      if (error) throw error;
      toast.success('Categoria excluída com sucesso!');
      await fetchCategorias();
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      toast.error('Erro ao excluir categoria');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Text variant="h4">Categorias de Insumos</Text>
        <Button onClick={() => handleOpenModal()}>Nova Categoria</Button>
      </div>

      <Panel>
        {loading ? (
          <Text>Carregando...</Text>
        ) : categorias.length === 0 ? (
          <Text>Nenhuma categoria cadastrada.</Text>
        ) : (
          <div className="divide-y">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="flex justify-between items-center py-4 px-6 first:pt-2 last:pb-2"
              >
                <Text>{categoria.nome}</Text>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleOpenModal(categoria)}>
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir a categoria "${categoria.nome}"?`)) {
                        void handleDelete(categoria);
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium">
              Nome da Categoria
            </label>
            <input
              type="text"
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editingCategoria ? 'Atualizar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
