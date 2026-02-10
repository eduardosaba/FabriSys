'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Users, Plus, Trash2, Edit, Shield, UserCheck, UserX, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, InputField } from '@/components/ui/shared';
import { useAuth } from '@/lib/auth';
import Loading from '@/components/ui/Loading';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

const PERFIS = [
  { value: 'admin', label: 'Administrador (Acesso Total)' },
  { value: 'gerente', label: 'Gerente (Sem config avançada)' },
  { value: 'caixa', label: 'Operador de Caixa (PDV)' },
  { value: 'cozinha', label: 'Produção (Kanban)' },
  { value: 'estoque', label: 'Estoquista' },
];

export default function UsuariosPage() {
  const { profile, loading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const confirmDialog = useConfirm();

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'caixa',
    ativo: true,
  });

  const podeGerenciar = profile?.role === 'master' || profile?.role === 'admin';

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('colaboradores').select('*').order('nome');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    if (podeGerenciar) {
      void carregarUsuarios();
    }
  }, [authLoading, profile, podeGerenciar]);

  const handleSave = async () => {
    if (!formData.nome || !formData.email) return toast.error('Preencha nome e email');

    // Validação de senha apenas na criação
    if (!editingId && (!formData.password || formData.password.length < 6)) {
      return toast.error('A senha deve ter no mínimo 6 caracteres');
    }

    try {
      if (editingId) {
        // EDITAR (Via Supabase direto)
        const { error } = await supabase
          .from('colaboradores')
          .update({
            nome: formData.nome,
            role: formData.role,
            ativo: formData.ativo,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Dados atualizados!');
      } else {
        // CRIAR NOVO (Via API)
        // Enviando currentUserId para a API validar a permissão
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            currentUserId: profile?.id, // ID de quem está criando
          }),
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Erro na API');

        toast.success('Usuário criado com sucesso!');
        toast('Anote a senha e envie para o funcionário.', { icon: '🔑', duration: 6000 });
      }

      setIsModalOpen(false);
      setFormData({ nome: '', email: '', password: '', role: 'caixa', ativo: true });
      setEditingId(null);
      void carregarUsuarios();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleEdit = (user: Colaborador) => {
    setFormData({
      nome: user.nome,
      email: user.email,
      password: '',
      role: user.role,
      ativo: user.ativo,
    });
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Remover Usuário',
      message: 'ATENÇÃO: Isso removerá o acesso do usuário. Esta ação não pode ser desfeita.',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Colaborador removido');
      void carregarUsuarios();
    }
  };

  if (!podeGerenciar) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <Shield size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Restrito</h2>
        <p>Apenas Administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Gestão de Equipe"
        description="Crie contas para seus funcionários e defina permissões."
        icon={Users}
      >
        <Button
          icon={Plus}
          onClick={() => {
            setEditingId(null);
            setFormData({ nome: '', email: '', password: '', role: 'caixa', ativo: true });
            setIsModalOpen(true);
          }}
        >
          Novo Usuário
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Email (Login)</th>
              <th className="px-6 py-3">Perfil / Cargo</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{user.nome}</td>
                <td className="px-6 py-3 text-slate-500">{user.email}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold border uppercase
                    ${
                      user.role === 'admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : user.role === 'master'
                          ? 'bg-slate-800 text-white border-slate-900'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  {user.ativo ? (
                    <span className="text-green-600 flex items-center justify-center gap-1 text-xs font-bold">
                      <UserCheck size={14} /> Ativo
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center justify-center gap-1 text-xs font-bold">
                      <UserX size={14} /> Bloqueado
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Nenhum colaborador cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Usuário' : 'Criar Nova Conta'}
      >
        <div className="space-y-4 p-1">
          <InputField
            label="Nome Completo"
            placeholder="Ex: João da Silva"
            value={formData.nome}
            onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })}
          />

          <InputField
            label="E-mail de Login"
            placeholder="joao@confectio.com"
            type="email"
            value={formData.email}
            disabled={!!editingId}
            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
          />

          {!editingId && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
              <InputField
                label="Senha Temporária"
                placeholder="Mínimo 6 caracteres"
                type="text"
                value={formData.password}
                onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                <Key size={12} /> Esta senha servirá para o primeiro acesso.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Perfil de Acesso
            </label>
            <select
              className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {PERFIS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="ativo" className="text-sm text-slate-700">
              Usuário Ativo (Acesso liberado)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Criar Conta'}</Button>
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
