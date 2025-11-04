'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/Button';

interface Profile {
  id: string;
  nome?: string;
  role: string;
  email: string;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && profileData) {
            setProfile(profileData as Profile);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    void getProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo ao Sistema Lari, {profile?.nome || 'Usuário'}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Pedidos de Compra */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pedidos de Compra
          </h3>
          <p className="text-gray-600 mb-4">
            Gerencie pedidos de compra e fornecedores
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/pedidos-compra'}
            className="w-full"
          >
            Acessar
          </Button>
        </Card>

        {/* Card de Fornecedores */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Fornecedores
          </h3>
          <p className="text-gray-600 mb-4">
            Cadastre e gerencie fornecedores
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/fornecedores'}
            className="w-full"
          >
            Acessar
          </Button>
        </Card>

        {/* Card de Insumos */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Insumos
          </h3>
          <p className="text-gray-600 mb-4">
            Controle de insumos e estoque
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/insumos'}
            className="w-full"
          >
            Acessar
          </Button>
        </Card>

        {/* Card de Produção */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Produção
          </h3>
          <p className="text-gray-600 mb-4">
            Controle de produção e processos
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/producao'}
            className="w-full"
          >
            Acessar
          </Button>
        </Card>

        {/* Card de Configurações */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Configurações
          </h3>
          <p className="text-gray-600 mb-4">
            Configurações do sistema
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/configuracoes'}
            className="w-full"
          >
            Acessar
          </Button>
        </Card>
      </div>
    </div>
  );
}