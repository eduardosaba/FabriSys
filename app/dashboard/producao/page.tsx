'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import Card from '@/components/ui/Card';
import { Package, AlertTriangle, BarChart, List, EyeOff } from 'lucide-react';
import { KPISection } from '@/components/ui/KPICards';

interface Profile {
  id: string;
  nome?: string;
  role: string;
  email: string;
}

function DashboardProducaoContent() {
  // Tipos para filtros inteligentes
  type FiltrosAtuais = {
    dataInicial: string;
    dataFinal: string;
    periodoSelecionado: string;
    statusSelecionado: string;
  };

  // Estados para filtros inteligentes
  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosAtuais>({
    dataInicial: '2025-01-01',
    dataFinal: new Date().toISOString().split('T')[0],
    periodoSelecionado: 'personalizado',
    statusSelecionado: 'all',
  });

  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState({
    ordens: true,
    alertas: true,
    relatorios: true,
    ranking: true,
  });
  const [productionData, setProductionData] = useState({
    producaoTotal: 15234,
    eficiencia: 87.5,
    produtividade: 42.8,
    perdas: 1.8,
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
  type ProductionData = {
    producaoTotal: number;
    eficiencia: number;
    produtividade: number;
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
        statusSelecionado: filtrosAtuais.statusSelecionado,
      });

      const response = await fetch(`/api/dashboard/producao?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = (await response.json()) as ProductionData;
        // 5. ATUALIZAÇÃO DE DADOS: Atualizar estado com novos valores
        setProductionData(responseData);
      } else {
        throw new Error('Erro ao buscar dados da produção');
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
    const getProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          const response = await supabase.from('profiles').select('*').eq('id', user.id).single();

          if (!response.error && response.data) {
            setProfile(response.data as Profile);
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

  const toggleCardVisibility = (cardKey: 'ordens' | 'alertas' | 'relatorios' | 'ranking') => {
    setVisibleCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  if (loading) {
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
          {profile?.nome && <p className="text-gray-600">Bem-vindo, {profile.nome}</p>}
        </div>
      </div>

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
              Status
            </label>
            <select
              value={filtrosAtuais.statusSelecionado}
              onChange={(e) =>
                setFiltrosAtuais((prev) => ({ ...prev, statusSelecionado: e.target.value }))
              }
              className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="completed">Concluídas</option>
              <option value="pending">Pendentes</option>
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
      <KPISection kpis={productionData} isLoading={isLoadingKpis} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleCards.ordens && (
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
                  {productionData.producaoTotal.toLocaleString()} unidades
                </p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.alertas && (
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
                <p className="text-sm text-gray-500">{productionData.eficiencia.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.relatorios && (
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
                  {productionData.produtividade.toFixed(1)} unidades/hora
                </p>
              </div>
            </div>
          </Card>
        )}

        {visibleCards.ranking && (
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
                <p className="text-sm text-gray-500">{productionData.perdas.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Botão para reexibir todos os cards ocultados */}
      {Object.values(visibleCards).some((isVisible) => !isVisible) && (
        <div className="mt-6 flex items-center gap-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            onClick={() =>
              setVisibleCards({ ordens: true, alertas: true, relatorios: true, ranking: true })
            }
          >
            <EyeOff className="h-4 w-4" />
            Reexibir Todos
          </button>
          <span className="text-sm text-gray-600">Alguns cards estão ocultos</span>
        </div>
      )}

      {/* Botão para reexibir todos os cards ocultados */}
      {Object.values(visibleCards).some((isVisible) => !isVisible) && (
        <div className="mt-6">
          <button
            className="p-2 border rounded bg-blue-500 text-white hover:bg-blue-600 transition"
            onClick={() =>
              setVisibleCards({ ordens: true, alertas: true, relatorios: true, ranking: true })
            }
          >
            Reexibir Todos
          </button>
        </div>
      )}

      {/* Filtros interativos */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="flex gap-4">
          <select className="p-2 border rounded bg-white dark:bg-gray-800">
            <option value="">Período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <select className="p-2 border rounded bg-white dark:bg-gray-800">
            <option value="">Categoria</option>
            <option value="producao">Produção</option>
            <option value="alertas">Alertas</option>
            <option value="relatorios">Relatórios</option>
          </select>
        </div>
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
