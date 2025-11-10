'use client';

import { useState, useCallback } from 'react';
import { useProfile, useKPIs } from '@/hooks/useDashboardData';
import type { Profile as ProfileType, KPIs as KPIsType } from '@/hooks/useDashboardData';
import { DashboardProvider } from '@/contexts/DashboardContext';
import Card from '@/components/ui/Card';
import { Package, AlertTriangle, BarChart, List, EyeOff } from 'lucide-react';
import { KPISection } from '@/components/ui/KPICards';

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

  const profileResult: { data: ProfileType | null; error?: Error; isLoading?: boolean } =
    useProfile();
  const productionResult: { data: KPIsType | null; error?: Error; isLoading?: boolean } = useKPIs({
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
      if (typeof productionResult?.mutate === 'function') {
        void (productionResult.mutate as () => void)();
      }
    } catch (e) {
      console.warn('Erro ao forçar revalidação dos KPIs', e);
    }
  }, [productionResult]);

  const toggleCardVisibility = (cardKey: 'ordens' | 'alertas' | 'relatorios' | 'ranking') => {
    setVisibleCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  if (profileError) {
    return (
      <div className="text-red-600 p-6">
        Erro ao carregar perfil:{' '}
        {String(profileError instanceof Error ? profileError.message : profileError)}
      </div>
    );
  }
  if (kpisError) {
    return (
      <div className="text-red-600 p-6">
        Erro ao carregar KPIs: {String(kpisError instanceof Error ? kpisError.message : kpisError)}
      </div>
    );
  }
  if (profileLoading || isLoadingKpis) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard de produção...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Produção</h1>
          {typeof profile?.nome === 'string' ? (
            <p className="text-gray-600">Bem-vindo, {profile.nome}</p>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch lg:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Período
            </label>
            <select
              value={filtrosAtuais.periodoSelecionado}
              onChange={(e) => calcularDatasPorPeriodo(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="personalizado">Personalizado</option>
              <option value="hoje">Hoje</option>
              <option value="ultimos-7-dias">Últimos 7 dias</option>
            </select>
          </div>

          <div className="lg:flex-shrink-0">
            <button
              onClick={aplicarFiltroDashboard}
              disabled={isLoadingKpis}
              className="w-full lg:w-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoadingKpis ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Carregando...
                </>
              ) : (
                <>🔍 Aplicar</>
              )}
            </button>
          </div>
        </div>
      </div>

      <KPISection kpis={productionData} isLoading={isLoadingKpis} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleCards.ordens && productionData && (
          <Card variant="default" className="hover:border-primary transition-colors relative">
            <button
              className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              onClick={() => toggleCardVisibility('ordens')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
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
          <Card variant="default" className="hover:border-primary transition-colors relative">
            <button
              className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              onClick={() => toggleCardVisibility('alertas')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
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
          <Card variant="default" className="hover:border-primary transition-colors relative">
            <button
              className="absolute top-2 right-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              onClick={() => toggleCardVisibility('relatorios')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
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
          <Card variant="default" className="hover:border-primary transition-colors relative">
            <button
              className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full"
              onClick={() => toggleCardVisibility('ranking')}
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
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
