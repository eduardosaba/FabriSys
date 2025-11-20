'use client';

import Card from '@/components/ui/Card';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  Truck,
  Plus,
  List,
  BarChart,
  EyeOff,
} from 'lucide-react';
import { KPISection } from '@/components/ui/KPICards';
import Chart from '@/components/ui/Charts';
import Button from '@/components/Button';
import AlertasEstoque from '@/components/insumos/Alertas';
import PageHeader from '@/components/ui/PageHeader';
import { useState, useCallback, useMemo } from 'react';

export default function ProducaoDashboard() {
  // Tipos para filtros inteligentes
  type KpisData = {
    producaoTotal: number;
    eficiencia: number;
    produtividade: number;
    perdas: number;
  };

  type FiltrosAtuais = {
    dataInicial: string;
    dataFinal: string;
    filialSelecionada: string;
    categoriaSelecionada: string;
    periodoSelecionado: string;
  };

  // Estados para filtros inteligentes
  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosAtuais>({
    dataInicial: '2025-01-01',
    dataFinal: new Date().toISOString().split('T')[0],
    filialSelecionada: 'Geral',
    categoriaSelecionada: 'all',
    periodoSelecionado: 'personalizado',
  });

  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [kpisData, setKpisData] = useState<KpisData | null>({
    producaoTotal: 15234,
    eficiencia: 87.5,
    produtividade: 42.8,
    perdas: 1.8,
  });

  // Estados existentes mantidos
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [hiddenChartCards, setHiddenChartCards] = useState<string[]>([]);
  const [inventoryData, _setInventoryData] = useState({
    produtos: 245,
    fornecedores: 12,
    alertas: 8,
    valorEstoque: 125000,
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

  // Função para aplicar filtros inteligentes
  const aplicarFiltroDashboard = useCallback(async () => {
    try {
      // 3. ESTADO DE LOADING: Definir loading como TRUE
      setIsLoadingKpis(true);

      // 4. CHAMADA À API: Fazer requisição para o endpoint
      const queryParams = new URLSearchParams({
        dataInicial: filtrosAtuais.dataInicial,
        dataFinal: filtrosAtuais.dataFinal,
        filialSelecionada: filtrosAtuais.filialSelecionada,
        categoriaSelecionada: filtrosAtuais.categoriaSelecionada,
      });

      const response = await fetch(`/api/dashboard/kpis?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as KpisData;
        // 5. ATUALIZAÇÃO DE DADOS: Atualizar estado com novos valores
        setKpisData(data);
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

  // Dados de gráficos integrados com filtros
  const chartData = useMemo(() => {
    const baseData = [
      { name: 'Jan', Produto1: 400, Produto2: 300, Produto3: 200 },
      { name: 'Fev', Produto1: 500, Produto2: 400, Produto3: 250 },
      { name: 'Mar', Produto1: 450, Produto2: 350, Produto3: 220 },
      { name: 'Abr', Produto1: 600, Produto2: 500, Produto3: 300 },
      { name: 'Mai', Produto1: 550, Produto2: 450, Produto3: 280 },
      { name: 'Jun', Produto1: 700, Produto2: 600, Produto3: 350 },
    ];

    // Aplicar filtros aos dados
    const multiplier =
      filtrosAtuais.filialSelecionada === 'Geral'
        ? 1
        : filtrosAtuais.filialSelecionada === 'Matriz'
          ? 0.7
          : filtrosAtuais.filialSelecionada === 'Filial1'
            ? 0.8
            : 0.6;

    return baseData.map((item) => ({
      ...item,
      Produto1: Math.round(item.Produto1 * multiplier),
      Produto2: Math.round(item.Produto2 * multiplier),
      Produto3: Math.round(item.Produto3 * multiplier),
    }));
  }, [filtrosAtuais.filialSelecionada]);

  const productionChartData = useMemo(() => {
    const baseData = [
      { mes: 'Jan', producao: 900 },
      { mes: 'Fev', producao: 1150 },
      { mes: 'Mar', producao: 1020 },
      { mes: 'Abr', producao: 1300 },
      { mes: 'Mai', producao: 1180 },
      { mes: 'Jun', producao: 1450 },
    ];

    const multiplier =
      filtrosAtuais.categoriaSelecionada === 'all'
        ? 1
        : filtrosAtuais.categoriaSelecionada === 'produtos'
          ? 0.9
          : filtrosAtuais.categoriaSelecionada === 'insumos'
            ? 1.1
            : 0.8;

    return baseData.map((item) => ({
      ...item,
      producao: Math.round(item.producao * multiplier),
    }));
  }, [filtrosAtuais.categoriaSelecionada]);

  const toggleCardVisibility = (cardKey: string) => {
    if (hiddenCards.includes(cardKey)) {
      setHiddenCards(hiddenCards.filter((key) => key !== cardKey));
    } else {
      setHiddenCards([...hiddenCards, cardKey]);
    }
  };

  const toggleChartCardVisibility = (cardKey: string) => {
    if (hiddenChartCards.includes(cardKey)) {
      setHiddenChartCards(hiddenChartCards.filter((key) => key !== cardKey));
    } else {
      setHiddenChartCards([...hiddenChartCards, cardKey]);
    }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <PageHeader
          title="Dashboard de Mercadoria"
          description="Visão geral do estoque, fornecedores e produtos"
          icon={Package}
        >
          <div className="flex gap-2">
            <Link href="/dashboard/insumos/cadastro">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </Link>
            <Link href="/dashboard/fornecedores">
              <Button variant="secondary" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Fornecedor
              </Button>
            </Link>
          </div>
        </PageHeader>
      </Panel>

      {/* Filtros Interativos Inteligentes */}
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

          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:disabled:bg-gray-800"
            />
          </div>

          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:disabled:bg-gray-800"
            />
          </div>

          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filial
            </label>
            <div className="relative">
              <select
                value={filtrosAtuais.filialSelecionada}
                onChange={(e) =>
                  setFiltrosAtuais((prev) => ({ ...prev, filialSelecionada: e.target.value }))
                }
                className="w-full appearance-none rounded-md border border-gray-300 bg-white p-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="Geral">Todas as Filiais</option>
                <option value="Matriz">Matriz</option>
                <option value="Filial1">Filial Centro</option>
                <option value="Filial2">Filial Norte</option>
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

          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria
            </label>
            <div className="relative">
              <select
                value={filtrosAtuais.categoriaSelecionada}
                onChange={(e) =>
                  setFiltrosAtuais((prev) => ({ ...prev, categoriaSelecionada: e.target.value }))
                }
                className="w-full appearance-none rounded-md border border-gray-300 bg-white p-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="all">Todas as Categorias</option>
                <option value="produtos">Produtos</option>
                <option value="insumos">Insumos</option>
                <option value="materias-primas">Matérias-Primas</option>
                <option value="embalagens">Embalagens</option>
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
              className="w-full lg:w-auto"
            >
              🔍 Aplicar
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Ação Rápida */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {(
          [
            {
              title: 'Cadastrar Produto',
              key: 'cadastrarProduto',
              icon: Package,
              color: 'blue',
              description: 'Adicionar novo produto',
            },
            {
              title: 'Estoque',
              key: 'estoque',
              icon: ShoppingCart,
              color: 'green',
              description: `${inventoryData.produtos} produtos ativos`,
            },
            {
              title: 'Alertas',
              key: 'alertas',
              icon: AlertTriangle,
              color: 'yellow',
              description: `${inventoryData.alertas} alertas ativos`,
            },
            {
              title: 'Fornecedores',
              key: 'fornecedores',
              icon: Truck,
              color: 'purple',
              description: `${inventoryData.fornecedores} fornecedores`,
            },
          ] as const
        ).map(
          (card) =>
            !hiddenCards.includes(card.key) && (
              <Card key={card.key} className="relative transition-colors hover:border-primary">
                <button
                  className="absolute right-2 top-2 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
                  onClick={() => toggleCardVisibility(card.key)}
                  title="Ocultar card"
                >
                  <EyeOff className="h-4 w-4 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 bg-${card.color}-100 dark:bg-${card.color}-900/50 rounded-lg`}
                  >
                    <card.icon
                      className={`h-6 w-6 text-${card.color}-600 dark:text-${card.color}-400`}
                    />
                  </div>
                  <div>
                    <Text variant="h4" weight="medium">
                      {card.title}
                    </Text>
                    <Text color="muted" className="text-sm">
                      {card.description}
                    </Text>
                  </div>
                </div>
              </Card>
            )
        )}
      </div>

      {/* Botão para reexibir todos os cards ocultados */}
      {hiddenCards.length > 0 && (
        <div className="mt-6 flex items-center gap-4">
          <button
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            onClick={() => setHiddenCards([])}
          >
            <EyeOff className="h-4 w-4" />
            Reexibir Todos ({hiddenCards.length} oculto{hiddenCards.length > 1 ? 's' : ''})
          </button>
          <span className="text-sm text-gray-600">Cards ocultos: {hiddenCards.join(', ')}</span>
        </div>
      )}

      {/* KPIs */}
      <KPISection
        kpis={
          kpisData || {
            producaoTotal: 15234,
            eficiencia: 87.5,
            produtividade: 42.8,
            perdas: 1.8,
          }
        }
        isLoading={isLoadingKpis}
      />

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-2">
        {/* Produção Mensal por Produto */}
        {!hiddenChartCards.includes('producao-mensal') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('producao-mensal')}
              title="Ocultar gráfico"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <Text variant="h3" weight="medium" className="mb-4">
              Produção Mensal por Produto
            </Text>
            {isLoadingKpis ? (
              <div className="animate-pulse">
                <div className="h-64 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            ) : (
              <Chart
                type="bar"
                height={300}
                data={chartData}
                series={[{ dataKey: 'Produto1', name: 'Produto 1' }]}
              />
            )}
          </Card>
        )}

        {/* Análise de Produção Anual */}
        {!hiddenChartCards.includes('analise-producao') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('analise-producao')}
              title="Ocultar gráfico"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <Text variant="h3" weight="medium" className="mb-4">
              Análise de Produção Anual
            </Text>
            {isLoadingKpis ? (
              <div className="animate-pulse">
                <div className="h-64 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            ) : (
              <Chart
                type="line"
                height={300}
                data={productionChartData}
                series={[{ dataKey: 'producao', name: 'Produção' }]}
                xAxisKey="mes"
              />
            )}
          </Card>
        )}

        {/* Alertas de Estoque */}
        {!hiddenChartCards.includes('alertas-estoque') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('alertas-estoque')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <Text variant="h3" weight="medium" className="mb-4">
              Alertas de Estoque
            </Text>
            <AlertasEstoque />
          </Card>
        )}

        {/* Resumo de Produtos */}
        {!hiddenChartCards.includes('resumo-produtos') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('resumo-produtos')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <Text variant="h3" weight="medium" className="mb-4">
              Resumo de Produtos
            </Text>
            <div className="space-y-4">
              {/* TODO: Adicionar gráficos e estatísticas de produtos */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <Text variant="h4" weight="medium">
                  Estatísticas em breve...
                </Text>
                <Text color="muted">
                  Gráficos e análises detalhadas serão adicionados em breve.
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* Lista de Compras */}
        {!hiddenChartCards.includes('lista-compras') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('lista-compras')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <div className="mb-4 flex items-center justify-between">
              <Text variant="h3" weight="medium">
                Lista de Compras
              </Text>
              <Button variant="secondary" className="flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Nova Lista
              </Button>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <Text variant="h4" weight="medium">
                Lista de Compras em breve...
              </Text>
              <Text color="muted">Sistema de lista de compras será implementado em breve.</Text>
            </div>
          </Card>
        )}

        {/* Relatórios Rápidos */}
        {!hiddenChartCards.includes('relatorios-rapidos') && (
          <Card className="relative p-4">
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
              onClick={() => toggleChartCardVisibility('relatorios-rapidos')}
              title="Ocultar card"
            >
              <EyeOff className="h-4 w-4 text-gray-600" />
            </button>
            <Text variant="h3" weight="medium" className="mb-4">
              Relatórios Rápidos
            </Text>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/dashboard/relatorios/validade">
                <Button
                  variant="secondary"
                  className="flex w-full items-center justify-center gap-2"
                >
                  <BarChart className="h-4 w-4" />
                  Relatório de Validade
                </Button>
              </Link>
              <Link href="/dashboard/relatorios/estoque">
                <Button
                  variant="secondary"
                  className="flex w-full items-center justify-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Relatório de Estoque
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Botão para reexibir todos os cards de gráficos ocultados */}
      {hiddenChartCards.length > 0 && (
        <div className="mt-6 flex items-center gap-4">
          <button
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            onClick={() => setHiddenChartCards([])}
          >
            <EyeOff className="h-4 w-4" />
            Reexibir Todos os Gráficos ({hiddenChartCards.length} oculto
            {hiddenChartCards.length > 1 ? 's' : ''})
          </button>
          <span className="text-sm text-gray-600">
            Gráficos ocultos: {hiddenChartCards.join(', ')}
          </span>
        </div>
      )}

      {/* Filtros Modernos */}
    </div>
  );
}
