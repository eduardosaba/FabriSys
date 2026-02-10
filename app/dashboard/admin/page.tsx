'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import {
  Shield,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  Search,
  Edit,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { Modal, InputField, SelectField } from '@/components/ui/shared';

interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  role: string;
  plano: string;
  status_conta: string;
  data_vencimento_licenca: string | null;
  ativo: boolean;
  created_at: string;
}

export default function AdminMasterPage() {
  const { profile } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  // Modal de Edição de Licença
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);

  // Estado do formulário de edição
  const [formData, setFormData] = useState({
    plano: 'basic',
    status_conta: 'ativo',
    data_vencimento_licenca: '',
  });

  // 1. Carregar todos os usuários do sistema
  const carregarBase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar base de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Segurança extra: Só carrega se for MASTER
    if (profile?.role === 'master') {
      void carregarBase();
    }
  }, [profile]);

  // 2. Salvar Alterações de Licença
  const handleSalvarLicenca = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          plano: formData.plano,
          status_conta: formData.status_conta,
          data_vencimento_licenca: formData.data_vencimento_licenca || null,
          // Se suspender a conta, desativa o acesso
          ativo: formData.status_conta === 'ativo',
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success(`Licença de ${editingUser.nome} atualizada!`);
      setIsModalOpen(false);
      void carregarBase();
    } catch (err) {
      toast.error('Erro ao atualizar licença.');
    }
  };

  // Helper de cores para status
  const getStatusColor = (status: string, dataVencimento: string | null) => {
    if (status !== 'ativo') return 'bg-red-100 text-red-700 border-red-200';

    if (dataVencimento) {
      const hoje = new Date();
      const venc = new Date(dataVencimento);
      const diffDias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDias < 0) return 'bg-gray-100 text-gray-600 border-gray-300 line-through'; // Vencido
      if (diffDias < 7) return 'bg-orange-100 text-orange-700 border-orange-200'; // Vence logo
    }

    return 'bg-green-100 text-green-700 border-green-200';
  };

  // Bloqueio de tela para não masters
  if (profile?.role !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Shield size={64} className="text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-600">Acesso Restrito</h1>
        <p className="text-gray-400">Apenas o administrador Master pode acessar este painel.</p>
      </div>
    );
  }

  if (loading) return <Loading />;

  // Filtragem
  const listaFiltrada = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      u.email.toLowerCase().includes(filtro.toLowerCase())
  );

  // KPIs Rápidos
  const totalAtivos = usuarios.filter((u) => u.status_conta === 'ativo').length;
  const totalVencendo = usuarios.filter((u) => {
    if (!u.data_vencimento_licenca) return false;
    const hoje = new Date();
    const venc = new Date(u.data_vencimento_licenca);
    const diff = (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 15;
  }).length;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Administração Master (SaaS)"
        description="Gestão de licenças, planos e validade de acesso dos clientes."
        icon={Activity}
      />

      {/* KPIs de Negócio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Usuários</p>
            <h3 className="text-3xl font-bold text-slate-800">{usuarios.length}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600">
            <Users size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Licenças Ativas</p>
            <h3 className="text-3xl font-bold text-green-600">{totalAtivos}</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-full text-green-600">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Vencendo (15 dias)</p>
            <h3 className="text-3xl font-bold text-orange-600">{totalVencendo}</h3>
          </div>
          <div className="bg-orange-50 p-3 rounded-full text-orange-600">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Tabela de Gestão */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <Button
            icon={Users}
            variant="outline"
            onClick={() => (window.location.href = '/dashboard/configuracoes/usuarios')}
          >
            Criar Novo Usuário
          </Button>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b">
            <tr>
              <th className="px-6 py-3">Cliente / Usuário</th>
              <th className="px-6 py-3">Plano</th>
              <th className="px-6 py-3">Validade</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Gerenciar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listaFiltrada.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800">{user.nome}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <p className="text-[10px] text-blue-500 font-medium uppercase mt-1">
                    {user.role}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-slate-50 text-slate-600 text-xs font-bold uppercase">
                    <CreditCard size={12} /> {user.plano || 'Basic'}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-600">
                  {user.data_vencimento_licenca ? (
                    new Date(user.data_vencimento_licenca).toLocaleDateString('pt-BR')
                  ) : (
                    <span className="text-green-600 font-bold">Vitalício</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(
                      user.status_conta,
                      user.data_vencimento_licenca
                    )}`}
                  >
                    {user.status_conta}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setFormData({
                        plano: user.plano || 'basic',
                        status_conta: user.status_conta || 'ativo',
                        data_vencimento_licenca: user.data_vencimento_licenca || '',
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all text-slate-500"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição de Licença */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Gerenciar Licença: ${editingUser?.nome}`}
      >
        <div className="space-y-4 p-2">
          <SelectField
            label="Plano de Assinatura"
            value={formData.plano}
            onChange={(e: any) => setFormData({ ...formData, plano: e.target.value })}
            options={[
              { value: 'basic', label: 'Básico (Apenas PDV)' },
              { value: 'pro', label: 'Pro (Fábrica + PDV)' },
              { value: 'enterprise', label: 'Enterprise (Multi-loja)' },
            ]}
          />

          <InputField
            label="Data de Vencimento"
            type="date"
            value={formData.data_vencimento_licenca}
            onChange={(e: any) =>
              setFormData({ ...formData, data_vencimento_licenca: e.target.value })
            }
            placeholder="Deixe vazio para vitalício"
          />
          <p className="text-xs text-slate-400 -mt-2">Se deixar vazio, o acesso nunca expira.</p>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Status do Acesso
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, status_conta: 'ativo' })}
                className={`flex-1 py-2 rounded border text-sm font-bold transition-all ${
                  formData.status_conta === 'ativo'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                Ativo
              </button>
              <button
                onClick={() => setFormData({ ...formData, status_conta: 'suspenso' })}
                className={`flex-1 py-2 rounded border text-sm font-bold transition-all ${
                  formData.status_conta === 'suspenso'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                Suspenso (Bloquear)
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarLicenca}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
