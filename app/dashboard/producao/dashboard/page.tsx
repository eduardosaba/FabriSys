'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart2, Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalOrdens: number;
  ordensPendentes: number;
  ordensEmProducao: number;
  ordensFinalizadas: number;
  totalProdutos: number;
  produtosComEstoqueBaixo: number;
}

export default function ProducaoDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrdens: 0,
    ordensPendentes: 0,
    ordensEmProducao: 0,
    ordensFinalizadas: 0,
    totalProdutos: 0,
    produtosComEstoqueBaixo: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Carregar estatísticas das ordens
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_producao')
        .select('status');

      if (ordensError) throw ordensError;

      // Carregar estatísticas dos produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos_finais')
        .select('id, nome');

      if (produtosError) throw produtosError;

      // Calcular estatísticas
      const ordens = ordensData || [];
      const produtos = produtosData || [];

      const stats: DashboardStats = {
        totalOrdens: ordens.length,
        ordensPendentes: ordens.filter((o) => o.status === 'pendente').length,
        ordensEmProducao: ordens.filter((o) => o.status === 'em_producao').length,
        ordensFinalizadas: ordens.filter((o) => o.status === 'finalizada').length,
        totalProdutos: produtos.length,
        produtosComEstoqueBaixo: 0, // Por enquanto, sem cálculo de estoque baixo
      };

      setStats(stats);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Produção</h1>
        <p className="mt-2 text-gray-600">Visão geral do sistema de produção</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-2">
              <BarChart2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Ordens</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrdens}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ordens Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ordensPendentes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Em Produção</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ordensEmProducao}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Finalizadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ordensFinalizadas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards adicionais */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-purple-100 p-2">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produtos Cadastrados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produtos com Estoque Baixo</p>
              <p className="text-2xl font-bold text-gray-900">{stats.produtosComEstoqueBaixo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seções de atalho rápido */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Ações Rápidas</h3>
          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = '/dashboard/producao/ordens/nova')}
              className="w-full rounded-md bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100"
            >
              <div className="font-medium text-blue-900">Nova Ordem de Produção</div>
              <div className="text-sm text-blue-700">Criar uma nova ordem</div>
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard/producao/produtos/novo')}
              className="w-full rounded-md bg-green-50 p-3 text-left transition-colors hover:bg-green-100"
            >
              <div className="font-medium text-green-900">Novo Produto Final</div>
              <div className="text-sm text-green-700">Cadastrar produto</div>
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Ordens Recentes</h3>
          <div className="text-sm text-gray-600">
            <p>Visualize as últimas ordens criadas</p>
            <button
              onClick={() => (window.location.href = '/dashboard/producao/ordens')}
              className="mt-3 font-medium text-blue-600 hover:text-blue-800"
            >
              Ver todas as ordens →
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Relatórios</h3>
          <div className="text-sm text-gray-600">
            <p>Acesse relatórios de produção</p>
            <button
              onClick={() => (window.location.href = '/dashboard/producao/relatorios')}
              className="mt-3 font-medium text-blue-600 hover:text-blue-800"
            >
              Ver relatórios →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
