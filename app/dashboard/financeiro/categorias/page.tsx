'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import { Toaster, toast } from 'react-hot-toast';
import { Button } from '@/components/ui/shared';
import { Plus, Save, Edit3, Trash2, Loader2 } from 'lucide-react';

export default function CategoriasFinanceirasPage() {
  const { profile, loading: authLoading } = useAuth();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    if (!profile?.organization_id) return;
    void load();
  }, [profile]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fin_categorias_despesa')
        .select('*')
        .order('nome');
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile?.organization_id) return toast.error('Usuário não associado a organização');
    if (!name.trim()) return toast.error('Nome da categoria é obrigatório');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('fin_categorias_despesa')
        .insert([{ nome: name.trim(), organization_id: profile.organization_id }]);
      if (error) throw error;
      toast.success('Categoria criada');
      setName('');
      setModalOpen(false);
      await load();
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err);
      toast.error(err?.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Financeiro: Categorias"
        description="Gerencie categorias de despesas."
        icon={Plus}
      >
        <div className="flex gap-2">
          <Button onClick={() => setModalOpen(true)} icon={Plus}>
            Nova Categoria
          </Button>
        </div>
      </PageHeader>

      <div className="bg-white rounded-xl border p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : categorias.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhuma categoria encontrada.</div>
        ) : (
          <ul className="space-y-2">
            {(() => {
              const start = (page - 1) * perPage;
              const pageItems = categorias.slice(start, start + perPage);
              return pageItems.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between border p-3 rounded">
                  <div>
                    <div className="font-bold">{cat.nome}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm text-slate-500 hover:text-slate-800"
                      onClick={() => {
                        setEditId(cat.id);
                        setEditName(cat.nome || '');
                        setEditModalOpen(true);
                      }}
                      aria-label={`Editar ${cat.nome}`}
                    >
                      <Edit3 />
                    </button>
                    <button
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-2"
                      onClick={() => {
                        setDeleteTargetId(cat.id);
                        setDeleteTargetName(cat.nome || null);
                        setDeleteModalOpen(true);
                      }}
                      aria-label={`Excluir ${cat.nome}`}
                    >
                      {deletingId === cat.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </button>
                  </div>
                </li>
              ));
            })()}
          </ul>
        )}
      </div>

      {/* Paginação simples */}
      {categorias.length > perPage && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Linhas:</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <div className="text-sm text-slate-600">
              {page} / {Math.max(1, Math.ceil(categorias.length / perPage))}
            </div>
            <button
              className="px-3 py-1 border rounded"
              disabled={page >= Math.ceil(categorias.length / perPage)}
              onClick={() => setPage((p) => p + 1)}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-2">Nova Categoria</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} icon={Save}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-2">Editar Categoria</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editId) return;
                if (!editName.trim()) return toast.error('Nome é obrigatório');
                try {
                  const { error } = await supabase
                    .from('fin_categorias_despesa')
                    .update({ nome: editName.trim() })
                    .eq('id', editId);
                  if (error) throw error;
                  toast.success('Categoria atualizada');
                  setEditModalOpen(false);
                  setEditId(null);
                  setEditName('');
                  await load();
                } catch (err: any) {
                  console.error('Erro ao atualizar categoria:', err);
                  toast.error(err?.message || 'Erro ao atualizar categoria');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" icon={Save}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-2 text-red-600">Confirmar exclusão</h3>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir a categoria <strong>{deleteTargetName}</strong>? Esta
              ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTargetId(null);
                  setDeleteTargetName(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex items-center"
                onClick={async () => {
                  if (!deleteTargetId) return;
                  setDeletingId(deleteTargetId);
                  try {
                    const { error } = await supabase
                      .from('fin_categorias_despesa')
                      .delete()
                      .eq('id', deleteTargetId);
                    if (error) throw error;
                    toast.success('Categoria removida');
                    const remaining = categorias.length - 1;
                    const newTotalPages = Math.max(1, Math.ceil(remaining / perPage));
                    if (page > newTotalPages) setPage(newTotalPages);
                    await load();
                  } catch (err: any) {
                    console.error('Erro ao excluir categoria:', err);
                    toast.error(err?.message || 'Erro ao excluir categoria');
                  } finally {
                    setDeletingId(null);
                    setDeleteModalOpen(false);
                    setDeleteTargetId(null);
                    setDeleteTargetName(null);
                  }
                }}
              >
                {deletingId === deleteTargetId ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
