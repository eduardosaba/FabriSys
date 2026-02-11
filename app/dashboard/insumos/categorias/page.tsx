'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tag, Plus, Search, Edit, Trash2, Loader2, FolderOpen, CheckCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

// --- IMPORTS ---
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Modal } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader';

// --- SCHEMA DE VALIDAÇÃO (ZOD) ---
const categoriaSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;

// --- TIPOS ---
interface Categoria {
  id: number;
  nome: string;
  // count?: number; // Futuro: quantidade de produtos vinculados
}

export default function CategoriasPage() {
  const confirmDialog = useConfirm();
  const { profile, loading: authLoading } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);

  // Configuração do React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
  });

  // --- BUSCAR DADOS ---
  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      // NOTE: prefer explicit organization filtering when available via profile
      let query = supabase.from('categorias').select('*').order('nome');
      if (profile?.organization_id) query = query.eq('organization_id', profile.organization_id);
      const { data, error } = await query;

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.organization_id) {
      void fetchCategorias();
    }
  }, [authLoading, fetchCategorias, profile?.organization_id]);

  // --- PREPARAR MODAL ---
  function handleOpenModal(categoria?: Categoria) {
    if (categoria) {
      setEditingCategoria(categoria);
      reset({ nome: categoria.nome });
    } else {
      setEditingCategoria(null);
      reset({ nome: '' });
    }
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingCategoria(null);
    reset();
  }

  // --- SALVAR ---
  async function handleSave(values: CategoriaFormData) {
    try {
      let error;
      // attach organization when inserting, if available (profile from hook above)

      if (editingCategoria) {
        // Update
        const { error: updateError } = await supabase
          .from('categorias')
          .update({ nome: values.nome })
          .eq('id', editingCategoria.id);
        error = updateError;
      } else {
        // Insert
        const payload: Record<string, unknown> = { nome: values.nome };
        if (profile?.organization_id) payload.organization_id = profile.organization_id;
        if (profile?.id) payload.created_by = profile.id;
        const { error: insertError } = await supabase.from('categorias').insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editingCategoria ? 'Categoria atualizada!' : 'Categoria criada!');
      handleCloseModal();
      await fetchCategorias();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao salvar categoria.');
    }
  }

  // --- EXCLUIR ---
  async function handleDelete(categoria: Categoria) {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Categoria',
      message: `Tem certeza que deseja excluir "${categoria.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      // 1. Verificar dependências
      const { data: insumos, error: checkError } = await supabase
        .from('insumos')
        .select('id')
        .eq('categoria_id', categoria.id)
        .limit(1);

      if (checkError) throw checkError;

      if (insumos && insumos.length > 0) {
        toast.error('Não é possível excluir: Existem produtos nesta categoria.');
        return;
      }

      // 2. Excluir
      const { error } = await supabase.from('categorias').delete().eq('id', categoria.id);

      if (error) throw error;

      toast.success('Categoria excluída!');
      setCategorias((prev) => prev.filter((c) => c.id !== categoria.id));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir categoria.');
    }
  }

  // --- FILTRO ---
  const filteredCategorias = useMemo(() => {
    if (!searchTerm) return categorias;
    return categorias.filter((c) => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [categorias, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Categorias de Produtos"
        description="Organize seus insumos para relatórios mais precisos."
        icon={Tag}
      >
        <Button onClick={() => handleOpenModal()} icon={Plus}>
          Nova Categoria
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white"
            />
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
        ) : filteredCategorias.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhuma categoria encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Nome da Categoria</th>
                  <th className="px-6 py-3 text-center w-32">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                          <Tag size={14} />
                        </div>
                        <span className="font-medium text-slate-700">{cat.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                        <CheckCircle size={10} /> Ativa
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-all">
                        <button
                          onClick={() => handleOpenModal(cat)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title={`Editar ${cat.nome}`}
                          aria-label={`Editar ${cat.nome}`}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title={`Excluir ${cat.nome}`}
                          aria-label={`Excluir ${cat.nome}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição com React Hook Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
        size="sm"
      >
        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome da Categoria
            </label>
            <input
              {...register('nome')}
              className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${errors.nome ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}`}
              placeholder="Ex: Laticínios, Embalagens..."
              autoFocus
            />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}

            <p className="text-xs text-slate-400 mt-2">
              Categorias são usadas para agrupar produtos em relatórios.
            </p>
          </div>

          <div className="flex gap-3 pt-2 border-t mt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="flex-1">
              {editingCategoria ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
}
