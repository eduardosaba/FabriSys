'use client';

import { useState, useCallback } from 'react';
import { useProfile, useKPIs } from '@/hooks/useDashboardData';
import type { Profile as ProfileType, KPIs as KPIsType } from '@/hooks/useDashboardData';
import { DashboardProvider } from '@/contexts/DashboardContext';
import Card from '@/components/ui/Card';
import Button from '@/components/Button';
import { Package, AlertTriangle, BarChart, List, EyeOff, Factory } from 'lucide-react';
import { KPISection } from '@/components/ui/KPICards';
import PageHeader from '@/components/ui/PageHeader';

function DashboardProducaoContent() {
  type FiltrosAtuais = {
    dataInicial: string;
    dataFinal: string;
    periodoSelecionado: string;
    statusSelecionado: string;
  };

  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosAtuais>({
    dataInicial: '2025-01-01',
    dataFinal: new Date().toISOString().split('T')[0],
    periodoSelecionado: 'personalizado',
    statusSelecionado: 'all',
  });

  const profileResult: {
    data: ProfileType | null | undefined;
    error?: Error;
    isLoading?: boolean;
  } = useProfile();
  const productionResult: {
    data: KPIsType | null | undefined;
    error?: Error;
    isLoading?: boolean;
  } = useKPIs({
    dataInicial: filtrosAtuais.dataInicial,
    dataFinal: filtrosAtuais.dataFinal,
    statusSelecionado: filtrosAtuais.statusSelecionado,
  });

  const profile = profileResult.data;
  const profileError = profileResult.error;
  const profileLoading = Boolean(profileResult.isLoading);

  const productionData = productionResult.data;
  const kpisError = productionResult.error;
  const isLoadingKpis = Boolean(productionResult.isLoading);

  const [visibleCards, setVisibleCards] = useState({
    ordens: true,
    alertas: true,
    relatorios: true,
    ranking: true,
  });

  const calcularDatasPorPeriodo = useCallback((periodo: string) => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();
    const diaSemana = hoje.getDay();

    let dataInicial: Date;
    let dataFinal: Date;

    switch (periodo) {
      case 'hoje':
        dataInicial = new Date(ano, mes, dia);
        dataFinal = new Date(ano, mes, dia);
        break;
      case 'ontem':
        dataInicial = new Date(ano, mes, dia - 1);
        dataFinal = new Date(ano, mes, dia - 1);
        break;
      case 'esta-semana': {
        const diasAteDomingo = diaSemana;
        dataInicial = new Date(ano, mes, dia - diasAteDomingo);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'ultimos-7-dias':
        dataInicial = new Date(ano, mes, dia - 6);
        dataFinal = new Date(ano, mes, dia);
        break;
      default:
        return;
    }

    const dataInicialStr = dataInicial.toISOString().split('T')[0];
    const dataFinalStr = dataFinal.toISOString().split('T')[0];

    setFiltrosAtuais((prev) => ({
      ...prev,
      dataInicial: dataInicialStr,
      dataFinal: dataFinalStr,
      periodoSelecionado: periodo,
    }));
  }, []);

  const aplicarFiltroDashboard = useCallback(() => {
    try {
      // Revalidação será feita automaticamente pelo SWR quando os filtros mudarem
      console.log('Filtros aplicados, dados serão revalidados automaticamente');
    } catch (e) {
      console.warn('Erro ao aplicar filtros', e);
    }
  }, []);

  const toggleCardVisibility = (cardKey: 'ordens' | 'alertas' | 'relatorios' | 'ranking') => {
    setVisibleCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  if (profileError) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar perfil:{' '}
        {String(profileError instanceof Error ? profileError.message : profileError)}
      </div>
    );
  }
  if (kpisError) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar KPIs: {String(kpisError instanceof Error ? kpisError.message : kpisError)}
      </div>
    );
  }
  if (profileLoading || isLoadingKpis) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2"
            style={{ borderColor: 'var(--color-primary)' }}
          ></div>
          <p className="mt-4 text-gray-600">Carregando dashboard de produção...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Produção"
        description={
          typeof profile?.nome === 'string'
            ? `Bem-vindo, ${profile.nome}`
            : 'Visão geral da produção e ordens'
        }
        icon={Factory}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-4">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end lg:gap-4">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Período
            </label>
            <div className="relative">
              <select
                value={filtrosAtuais.periodoSelecionado}
                onChange={(e) => calcularDatasPorPeriodo(e.target.value)}
                className="w-full appearance-none rounded-md border border-gray-300 bg-white p-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="personalizado">Personalizado</option>
                <option value="hoje">Hoje</option>
                <option value="ultimos-7-dias">Últimos 7 dias</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="lg:flex-shrink-0">
            <Button
              onClick={aplicarFiltroDashboard}
              disabled={isLoadingKpis}
              loading={isLoadingKpis}
              variant="primary"
              className="w-full lg:w-auto"
            >
              🔍 Aplicar
            </Button>
          </div>
        </div>
      </div>

      {productionData && <KPISection kpis={productionData} isLoading={isLoadingKpis} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.ordens && productionData && (
          <Card variant="default" className="relative transition-colors hover:border-primary">
            <button
              className="absolute right-2 top-2 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleCardVisibility('ordens')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium">Produção Total</h4>
                <p className="text-sm text-gray-500">
                  {productionData.producaoTotal?.toLocaleString() ?? '-'} unidades
                </p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.alertas && productionData && (
          <Card variant="default" className="relative transition-colors hover:border-primary">
            <button
              className="absolute right-2 top-2 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleCardVisibility('alertas')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/50">
                <AlertTriangle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium">Eficiência</h4>
                <p className="text-sm text-gray-500">
                  {productionData.eficiencia?.toFixed(1) ?? '-'}%
                </p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.relatorios && productionData && (
          <Card variant="default" className="relative transition-colors hover:border-primary">
            <button
              className="absolute right-2 top-2 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleCardVisibility('relatorios')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
                <BarChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium">Produtividade</h4>
                <p className="text-sm text-gray-500">
                  {productionData.produtividade?.toFixed(1) ?? '-'} unidades/hora
                </p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.ranking && productionData && (
          <Card variant="default" className="relative transition-colors hover:border-primary">
            <button
              className="absolute right-2 top-2 rounded-full bg-gray-200 p-1"
              onClick={() => toggleCardVisibility('ranking')}
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/50">
                <List className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium">Perdas</h4>
                <p className="text-sm text-gray-500">{productionData.perdas?.toFixed(1) ?? '-'}%</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DashboardProducaoPage() {
  return (
    <DashboardProvider>
      <DashboardProducaoContent />
    </DashboardProvider>
  );
}
