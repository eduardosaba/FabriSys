'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Building2, Save, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InputField, SelectField } from '@/components/ui/shared';

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    empresaNome: '',
    plano: 'pro',
    adminNome: '',
    adminEmail: '',
    adminSenha: '', // Senha inicial para o cliente
  });

  const handleSave = async () => {
    if (!formData.empresaNome || !formData.adminEmail || !formData.adminSenha) {
      return toast.error('Preencha todos os campos obrigatórios');
    }

    setLoading(true);
    try {
      // Chama a API Backend (que criaremos a seguir) para fazer tudo de uma vez
      const res = await fetch('/api/master/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success('Cliente criado com sucesso!');
      router.push('/dashboard/admin'); // Volta para a lista de clientes
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-up">
      <PageHeader
        title="Cadastrar Novo Cliente (Tenant)"
        description="Cria uma nova empresa isolada e seu usuário administrador."
        icon={Building2}
      />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <Building2 size={18} /> Dados da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Nome da Empresa"
              placeholder="Ex: Confeitaria da Maria"
              value={formData.empresaNome}
              onChange={(e: any) => setFormData({ ...formData, empresaNome: e.target.value })}
            />
            <SelectField
              label="Plano Contratado"
              value={formData.plano}
              onChange={(e: any) => setFormData({ ...formData, plano: e.target.value })}
              options={[
                { value: 'basic', label: 'Básico (Apenas PDV)' },
                { value: 'pro', label: 'Pro (Completo)' },
                { value: 'enterprise', label: 'Enterprise (Multi-lojas)' },
              ]}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <User size={18} /> Dados do Administrador (Dono)
          </h3>
          <InputField
            label="Nome do Responsável"
            placeholder="Ex: Maria Silva"
            value={formData.adminNome}
            onChange={(e: any) => setFormData({ ...formData, adminNome: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="E-mail de Acesso"
              type="email"
              placeholder="maria@confeitaria.com"
              value={formData.adminEmail}
              onChange={(e: any) => setFormData({ ...formData, adminEmail: e.target.value })}
            />
            <InputField
              label="Senha Inicial"
              type="text" // Visível para você copiar e enviar
              placeholder="Mínimo 6 dígitos"
              value={formData.adminSenha}
              onChange={(e: any) => setFormData({ ...formData, adminSenha: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading} icon={Save}>
            Criar Cliente e Liberar Acesso
          </Button>
        </div>
      </div>
    </div>
  );
}
