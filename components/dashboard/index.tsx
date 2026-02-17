import { WidgetConfig } from '@/lib/types/dashboard';
import { ComponentType } from 'react';
import dynamic from 'next/dynamic';

// Tipo auxiliar para o registro
type WidgetRegistryItem = {
  // Usamos dynamic do Next.js para carregar sob demanda (Code Splitting)
  // Aceitamos qualquer props para tornar o registro flexível entre widgets
  component: ComponentType<any>;
  title: string;
  defaultSize: '1x1' | '2x1' | '1x2' | '2x2' | '4x1';
};

// REGISTRO DE WIDGETS
// Mapeia a string do banco de dados (key) para o componente React
export const WIDGET_REGISTRY: Record<string, WidgetRegistryItem> = {
  
  // --- FINANCEIRO & ADM ---
  'admin-financial': { 
    component: dynamic(() => import('./AdminFinancialWidget'), { 
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" /> 
    }), 
    title: 'Resumo Financeiro', 
    defaultSize: '4x1' // Ocupa a linha toda pois contém 3 cards internos
  },
  
  'profit-margin': { 
    component: dynamic(() => import('./ProfitMarginWidget'), { 
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" /> 
    }), 
    title: 'Lucro Bruto e Margem', 
    defaultSize: '2x1' 
  },
  'cash-flow': { 
    component: dynamic(() => import('./CashFlowWidget'), { 
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" /> 
    }), 
    title: 'Fluxo de Caixa', 
    defaultSize: '2x1' 
  },
  
  'accounts-payable': {
    component: dynamic(() => import('./AccountsPayableWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Contas a Pagar',
    defaultSize: '1x2'
  },
  
  'sales-chart': { 
    component: dynamic(() => import('./SalesChartWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }), 
    title: 'Gráfico de Vendas', 
    defaultSize: '2x1' 
  },

  'kpis': { 
    component: dynamic(() => import('./KPIsMetas')), 
    title: 'KPIs e Metas', 
    defaultSize: '2x1' 
  },
  'valor-producao': {
    component: dynamic(() => import('./ValorProducaoWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Valor Produção',
    defaultSize: '4x1'
  },

  // --- LOJA & OPERACIONAL ---
  'caixa-status': { 
    component: dynamic(() => import('./CaixaStatusWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }), 
    title: 'Monitor de Caixa', 
    defaultSize: '1x1' 
  },

  'ranking-produtos': { 
    component: dynamic(() => import('./RankingProdutosWidget')), // (Exemplo futuro)
    title: 'Ranking de Produtos', 
    defaultSize: '1x2' // Mais alto para caber a lista
  },

  'peak-hours': {
    component: dynamic(() => import('./PeakHoursWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Horários de Pico',
    defaultSize: '2x1'
  },

  'losses': {
    component: dynamic(() => import('./LossesWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Perdas e Quebras',
    defaultSize: '2x1'
  },

  'meta-dia': { 
    component: dynamic(() => import('./pdv/MetaDoDiaWidget')), 
    title: 'Meta do Dia', 
    defaultSize: '1x1' 
  },

  // --- ESTOQUE & FÁBRICA ---
  'low-stock': { 
    component: dynamic(() => import('./LowStockWidget')), 
    title: 'Estoque Crítico', 
    defaultSize: '1x1' 
  },

  'inventory-value': {
    component: dynamic(() => import('./InventoryValueWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Valor de Estoque',
    defaultSize: '1x1'
  },

  'purchase-orders': {
    component: dynamic(() => import('./PurchaseOrdersWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Pedidos de Compra',
    defaultSize: '1x1'
  },

  'producao': { 
    component: dynamic(() => import('./ProductionQueueWidget')), 
    title: 'Fila de Produção', 
    defaultSize: '2x1' 
  },
  'expedicao_stats': {
    component: dynamic(() => import('./widgets/ExpedicaoStatusWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Logística',
    defaultSize: '2x1'
  },
  // --- WIDGETS PDV ---
  'pdv-meta': {
    component: dynamic(() => import('./pdv/MetaDoDiaWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Minha Meta Diária',
    defaultSize: '1x1'
  },

  'pdv-status': {
    component: dynamic(() => import('./pdv/MeuCaixaWidget'), {
      loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
    }),
    title: 'Controle de Caixa',
    defaultSize: '1x1'
  },
};

// CONFIGURAÇÃO PADRÃO POR CARGO (Onboarding)
// Define quais widgets aparecem automaticamente quando um usuário novo entra
export const DEFAULT_LAYOUT_BY_ROLE: Record<string, string[]> = {
  master: ['valor-producao','profit-margin', 'cash-flow', 'accounts-payable', 'admin-financial', 'sales-chart', 'low-stock', 'caixa-status'],
  admin: ['valor-producao','profit-margin', 'admin-financial', 'sales-chart', 'low-stock'],
  gerente: ['caixa-status', 'sales-chart', 'low-stock', 'ranking-produtos'],
  compras: ['inventory-value', 'purchase-orders', 'low-stock', 'ranking-produtos'],
  fabrica: ['producao', 'expedicao_stats'],
  pdv: ['pdv-status', 'pdv-meta'], // Layout focado para PDV: essencial e operacional
};

// Helper para converter o registro antigo (se necessário) ou para uso no DashboardLayout
export const getWidgetComponent = (type: string) => {
  return WIDGET_REGISTRY[type]?.component || null;
};