'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Store, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Modal, InputField } from '@/components/ui/shared';

interface Local {
  id: string;
  nome: string;
  tipo: 'pdv' | 'fabrica' | 'deposito';
  ativo: boolean;
}

export default function LojasPage() {
  const { profile, loading: authLoading } = useAuth();
  const confirmDialog = useConfirm();
  const [locais, setLocais] = useState<Local[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '', tipo: 'pdv' });
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from('locais').select('*').order('nome');
    setLocais(data || []);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const handleSave = async () => {
    if (!formData.nome) return toast.error('Nome obrigatório');
    if (authLoading) return toast.error('Autenticação em andamento, aguarde.');
    if (!profile?.id) return toast.error('Perfil não definido. Faça login novamente.');
    setLoading(true);

    if (editingId) {
      // Editar existente
      const { error } = await supabase
        .from('locais')
        .update({ nome: formData.nome, tipo: formData.tipo })
        .eq('id', editingId);
      setLoading(false);
      if (error) {
        toast.error('Erro ao atualizar');
      } else {
        toast.success('Loja atualizada!');
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ nome: '', tipo: 'pdv' });
        void carregar();
      }
    } else {
      // Criar novo
      const payload: Record<string, unknown> = {
        ...formData,
        created_by: profile.id,
      };
      if (profile.organization_id) payload.organization_id = profile.organization_id;

      const { error } = await supabase.from('locais').insert(payload);
      setLoading(false);
      if (error) {
        toast.error('Erro ao salvar');
      } else {
        toast.success('Loja cadastrada!');
        setIsModalOpen(false);
        setFormData({ nome: '', tipo: 'pdv' });
        void carregar();
      }
    }
  };

  const handleEdit = (local: Local) => {
    setEditingId(local.id);
    setFormData({ nome: local.nome, tipo: local.tipo });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Loja',
      message: 'Deseja excluir esta loja? Pode haver vendas vinculadas que impedirão a exclusão.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;
    const { error } = await supabase.from('locais').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir (pode haver vendas vinculadas)');
    else {
      toast.success('Loja excluída');
      void carregar();
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-3 md:p-6 pb-20 md:pb-6 animate-fade-up">
      <PageHeader
        title="Gerenciar Lojas e Locais"
        description="Cadastre seus Pontos de Venda (PDVs) e Fábricas."
        icon={Store}
      >
        <Button
          icon={Plus}
          onClick={() => {
            setEditingId(null);
            setFormData({ nome: '', tipo: 'pdv' });
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto"
        >
          Nova Loja
        </Button>
      </PageHeader>

      {/* Versão Desktop - Tabela */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Nome do Local</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {locais.map((local) => (
              <tr key={local.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{local.nome}</td>
                <td className="px-6 py-4">
                  <span
                    className={
                      'px-2 py-1 rounded text-xs font-bold uppercase border ' +
                      (local.tipo === 'fabrica'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-primary text-primary border-primary')
                    }
                  >
                    {local.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label={`Editar ${local.nome}`}
                      onClick={() => handleEdit(local)}
                      className="text-primary hover:bg-primary p-2 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      aria-label={`Excluir ${local.nome}`}
                      onClick={() => handleDelete(local.id)}
                      className="text-red-400 hover:bg-red-50 p-2 rounded"
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

      {/* Versão Mobile - Cards */}
      <div className="md:hidden space-y-3">
        {locais.map((local) => (
          <div key={local.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm">{local.nome}</h3>
                <span
                  className={
                    'inline-block mt-2 px-2 py-1 rounded text-xs font-bold uppercase border ' +
                    (local.tipo === 'fabrica'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200')
                  }
                >
                  {local.tipo}
                </span>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  aria-label={`Editar ${local.nome}`}
                  onClick={() => handleEdit(local)}
                  className="p-2 hover:bg-primary text-primary rounded"
                >
                  <Edit size={16} />
                </button>
                <button
                  aria-label={`Excluir ${local.nome}`}
                  onClick={() => handleDelete(local.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {locais.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
            Nenhuma loja cadastrada.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ nome: '', tipo: 'pdv' });
        }}
        title={editingId ? 'Editar Local' : 'Cadastrar Local'}
      >
        <div className="space-y-4 p-4">
          <InputField
            label="Nome da Loja / Local"
            value={formData.nome}
            onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: PDV Shopping"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Tipo</label>
            <select
              className="w-full border p-2 rounded-lg bg-white"
              value={formData.tipo}
              onChange={(e: any) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="pdv">Ponto de Venda (Loja)</option>
              <option value="fabrica">Fábrica (Produção)</option>
              <option value="deposito">Depósito</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({ nome: '', tipo: 'pdv' });
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={loading} className="w-full sm:w-auto">
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </div>
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
