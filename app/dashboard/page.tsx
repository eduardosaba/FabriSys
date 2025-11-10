'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { KPISection } from '@/components/ui/KPICards';

function DashboardContent() {
  // Tipos para filtros inteligentes
  type FiltrosAtuais = {
    dataInicial: string;
    dataFinal: string;
    periodoSelecionado: string;
    categoriaSelecionada: string;
  };

  // Estados para filtros inteligentes
  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosAtuais>({
    dataInicial: '2025-01-01',
    dataFinal: new Date().toISOString().split('T')[0],
    periodoSelecionado: 'personalizado',
    categoriaSelecionada: 'all',
  });

  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    lucro: 150000,
    vendas: 500000,
    custo: 200000,
    perdas: 10000,
  });

  // Função para calcular datas baseado no período selecionado
  const calcularDatasPorPeriodo = useCallback((periodo: string) => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();
    const diaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    let dataInicial: Date;
    let dataFinal: Date;

    switch (periodo) {
      case 'hoje': {
        dataInicial = new Date(ano, mes, dia);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'ontem': {
        dataInicial = new Date(ano, mes, dia - 1);
        dataFinal = new Date(ano, mes, dia - 1);
        break;
      }
      case 'amanha': {
        dataInicial = new Date(ano, mes, dia + 1);
        dataFinal = new Date(ano, mes, dia + 1);
        break;
      }
      case 'esta-semana': {
        // Domingo desta semana até hoje
        const diasAteDomingo = diaSemana;
        dataInicial = new Date(ano, mes, dia - diasAteDomingo);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'ultimos-7-dias': {
        dataInicial = new Date(ano, mes, dia - 6);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'semana-passada': {
        // Domingo da semana passada até sábado da semana passada
        const diasAteDomingoPassado = diaSemana + 7;
        dataInicial = new Date(ano, mes, dia - diasAteDomingoPassado);
        dataFinal = new Date(ano, mes, dia - diasAteDomingoPassado + 6);
        break;
      }
      case 'este-mes': {
        dataInicial = new Date(ano, mes, 1);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'ultimos-30-dias': {
        dataInicial = new Date(ano, mes, dia - 29);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      case 'mes-passado': {
        const mesPassado = mes - 1;
        const anoMesPassado = mesPassado < 0 ? ano - 1 : ano;
        const mesAjustado = mesPassado < 0 ? 11 : mesPassado;
        dataInicial = new Date(anoMesPassado, mesAjustado, 1);
        dataFinal = new Date(anoMesPassado, mesAjustado + 1, 0); // Último dia do mês
        break;
      }
      case 'ano': {
        dataInicial = new Date(ano, 0, 1);
        dataFinal = new Date(ano, mes, dia);
        break;
      }
      default:
        // personalizado - manter as datas atuais
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

  // Tipos para a resposta da API
  type DashboardData = {
    lucro: number;
    vendas: number;
    custo: number;
    perdas: number;
  };

  // Função para aplicar filtros inteligentes
  const aplicarFiltroDashboard = useCallback(async () => {
    try {
      // 3. ESTADO DE LOADING: Definir loading como TRUE
      setIsLoadingKpis(true);

      // 4. CHAMADA À API: Fazer requisição para o endpoint
      const queryParams = new URLSearchParams({
        dataInicial: filtrosAtuais.dataInicial,
        dataFinal: filtrosAtuais.dataFinal,
        categoriaSelecionada: filtrosAtuais.categoriaSelecionada,
      });

      const response = await fetch(`/api/dashboard/principal?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = (await response.json()) as DashboardData;
        // 5. ATUALIZAÇÃO DE DADOS: Atualizar estado com novos valores
        setData(responseData);
      } else {
        throw new Error('Erro ao buscar dados dos KPIs');
      }
    } catch (error) {
      // 6. TRATAMENTO DE ERRO: Lidar com erros
      console.error('Erro ao aplicar filtros:', error);
      // Aqui poderia usar uma função de notificação como toast
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      // 7. FIM DO LOADING: Garantir que loading seja FALSE
      setIsLoadingKpis(false);
    }
  }, [filtrosAtuais]);

  useEffect(() => {
    // Simular carregamento inicial
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros Interativos Inteligentes */}
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
              <option value="ontem">Ontem</option>
              <option value="amanha">Amanhã</option>
              <option value="esta-semana">Esta semana (dom até hoje)</option>
              <option value="ultimos-7-dias">Últimos 7 dias</option>
              <option value="semana-passada">Semana passada</option>
              <option value="este-mes">Este mês</option>
              <option value="ultimos-30-dias">Últimos 30 dias</option>
              <option value="mes-passado">Mês passado</option>
              <option value="ano">Ano</option>
            </select>
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filtrosAtuais.dataInicial}
              onChange={(e) =>
                setFiltrosAtuais((prev) => ({
                  ...prev,
                  dataInicial: e.target.value,
                  periodoSelecionado: 'personalizado',
                }))
              }
              disabled={filtrosAtuais.periodoSelecionado !== 'personalizado'}
              className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filtrosAtuais.dataFinal}
              onChange={(e) =>
                setFiltrosAtuais((prev) => ({
                  ...prev,
                  dataFinal: e.target.value,
                  periodoSelecionado: 'personalizado',
                }))
              }
              disabled={filtrosAtuais.periodoSelecionado !== 'personalizado'}
              className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoria
            </label>
            <select
              value={filtrosAtuais.categoriaSelecionada}
              onChange={(e) =>
                setFiltrosAtuais((prev) => ({ ...prev, categoriaSelecionada: e.target.value }))
              }
              className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas as categorias</option>
              <option value="sales">Vendas</option>
              <option value="loss">Perdas</option>
              <option value="costs">Custos</option>
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

      {/* KPIs */}
      <KPISection kpis={data} isLoading={isLoadingKpis} type="financial" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
