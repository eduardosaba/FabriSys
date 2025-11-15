import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

// Campos de customização para usuários admin (limitados - apenas cores principais)
const ADMIN_FIELDS = [
  {
    key: 'primary',
    label: 'Cor Principal',
    description: 'Cor principal do tema, usada em botões e destaques',
  },
  {
    key: 'secondary',
    label: 'Cor Secundária',
    description: 'Cor secundária para elementos complementares',
  },
  {
    key: 'tituloPaginas',
    label: 'Títulos e Navegação',
    description: 'Cor dos títulos das páginas e elementos de navegação',
  },
  {
    key: 'background',
    label: 'Fundo da Interface',
    description: 'Cor de fundo principal da interface',
  },
  {
    key: 'text',
    label: 'Texto Principal',
    description: 'Cor padrão dos textos na interface',
  },
];

// Campos para usuários master (mesmas opções de admin + secundária e botões de pesquisa)
const MASTER_FIELDS = [
  {
    key: 'primary',
    label: 'Cor Principal',
    description: 'Cor principal do tema, usada em botões e destaques',
  },
  {
    key: 'tituloPaginas',
    label: 'Títulos e Navegação',
    description: 'Cor dos títulos das páginas e elementos de navegação',
  },
  {
    key: 'secondary',
    label: 'Cor Secundária',
    description: 'Cor secundária para elementos complementares',
  },
  {
    key: 'background',
    label: 'Fundo da Interface',
    description: 'Cor de fundo principal da interface',
  },
  {
    key: 'text',
    label: 'Texto Principal',
    description: 'Cor padrão dos textos na interface',
  },
  { key: 'botaoPesquisar', label: 'Botão Pesquisar', description: 'Cor do botão pesquisar' },
  {
    key: 'botaoPesquisarAtivo',
    label: 'Botão Pesquisar Ativo',
    description: 'Cor do botão pesquisar quando ativo',
  },
];

// Predefinições de temas disponíveis para admin
const THEME_PRESETS = [
  {
    name: 'Padrão Confectio',
    description:
      'Paleta quente e acolhedora inspirada em chocolate e creme para um sistema elegante e convidativo.',
    colors: {
      light: {
        primary: '#88544c', // Caramelo - Botões, Links
        tituloPaginas: '#4a2c2b', // Chocolate Escuro
        secondary: '#e9c4c2', // Rosa Claro - Destaques suaves
        accent: '#88544c',
        background: '#fdfafa', // Pêssego Claro - Fundo Geral
        text: '#4a2c2b',
        hover3Submenu: '#e9c4c2',
        textoGeralHover: '#4a2c2b',
        bordasHeaderPerfil: '#e9c4c2',
        bordasSelecaoListagens: '#88544c',
        barraDashboard: '#88544c',
        barraDashboardHover: '#4a2c2b',
        receitasGraficos: '#88544c',
        receitasGraficosSecundaria: '#e9c4c2',
        despesasGraficos: '#dc2626', // Vermelho Padrão
        despesasGraficosSecundaria: '#ef4444', // Vermelho Padrão
        barraRolagem: '#88544c',
        barraRolagemFundo: '#f5e4e2',
        fundoLinkEAD: '#88544c',
        textoLinkEAD: '#4a2c2b',
        botaoSalvar: '#88544c',
        botaoSalvarAtivo: '#4a2c2b',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#dc2626',
        botaoCancelarAtivo: '#b91c1c',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#059669', // Verde Padrão
        botaoPesquisarAtivo: '#047857', // Verde Padrão
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b', // Laranja Padrão
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#88544c',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#88544c',
      },
      dark: {
        primary: '#e9c4c2', // Rosa Claro - Destaque em fundo escuro
        tituloPaginas: '#f2e8e3', // Branco Suave
        secondary: '#88544c', // Caramelo
        accent: '#e9c4c2',
        background: '#4a2c2b', // Chocolate Escuro - Fundo Geral
        text: '#f2e8e3',
        hover3Submenu: '#88544c',
        textoGeralHover: '#f2e8e3',
        bordasHeaderPerfil: '#88544c',
        bordasSelecaoListagens: '#e9c4c2',
        barraDashboard: '#88544c',
        barraDashboardHover: '#f2e8e3',
        receitasGraficos: '#e9c4c2',
        receitasGraficosSecundaria: '#88544c',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#e9c4c2',
        barraRolagemFundo: '#4a2c2b',
        fundoLinkEAD: '#e9c4c2',
        textoLinkEAD: '#f2e8e3',
        botaoSalvar: '#e9c4c2',
        botaoSalvarAtivo: '#f2e8e3',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#ef4444',
        botaoCancelarAtivo: '#f87171',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#10b981',
        botaoPesquisarAtivo: '#34d399',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#88544c',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#e9c4c2',
      },
    },
    sidebar_bg: '#e9c4c2',
    sidebar_hover_bg: '#88544c',
    header_bg: '#e9c4c2',
  },
  {
    name: 'Azul Profissional',
    description: 'Azul corporativo elegante, ideal para empresas tradicionais',
    colors: {
      light: {
        primary: '#1e40af',
        tituloPaginas: '#1e3a8a',
        secondary: '#3b82f6',
        accent: '#06b6d4',
        background: '#ffffff',
        text: '#1f2937',
        hover3Submenu: '#3b82f6',
        textoGeralHover: '#1e3a8a',
        bordasHeaderPerfil: '#dbeafe',
        bordasSelecaoListagens: '#bfdbfe',
        barraDashboard: '#1e40af',
        barraDashboardHover: '#1e3a8a',
        receitasGraficos: '#1e40af',
        receitasGraficosSecundaria: '#3b82f6',
        despesasGraficos: '#dc2626',
        despesasGraficosSecundaria: '#ef4444',
        barraRolagem: '#1e40af',
        barraRolagemFundo: '#dbeafe',
        fundoLinkEAD: '#1e40af',
        textoLinkEAD: '#1e3a8a',
        botaoSalvar: '#1e40af',
        botaoSalvarAtivo: '#1e3a8a',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#dc2626',
        botaoCancelarAtivo: '#b91c1c',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#059669',
        botaoPesquisarAtivo: '#047857',
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b',
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#1e40af',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#1e40af',
      },
      dark: {
        primary: '#3b82f6',
        tituloPaginas: '#60a5fa',
        secondary: '#6366f1',
        accent: '#06b6d4',
        background: '#111827',
        text: '#f9fafb',
        hover3Submenu: '#6366f1',
        textoGeralHover: '#60a5fa',
        bordasHeaderPerfil: '#1e3a8a',
        bordasSelecaoListagens: '#1e40af',
        barraDashboard: '#3b82f6',
        barraDashboardHover: '#60a5fa',
        receitasGraficos: '#3b82f6',
        receitasGraficosSecundaria: '#60a5fa',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#3b82f6',
        barraRolagemFundo: '#1e3a8a',
        fundoLinkEAD: '#3b82f6',
        textoLinkEAD: '#60a5fa',
        botaoSalvar: '#3b82f6',
        botaoSalvarAtivo: '#60a5fa',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#ef4444',
        botaoCancelarAtivo: '#f87171',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#10b981',
        botaoPesquisarAtivo: '#34d399',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#3b82f6',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#3b82f6',
      },
    },
    sidebar_bg: '#3b82f6',
    sidebar_hover_bg: '#1e40af',
    header_bg: '#3b82f6',
  },
  {
    name: 'Verde Moderno',
    description: 'Verde contemporâneo, perfeito para empresas de tecnologia e inovação',
    colors: {
      light: {
        primary: '#059669',
        tituloPaginas: '#065f46',
        secondary: '#10b981',
        accent: '#84cc16',
        background: '#ffffff',
        text: '#1f2937',
        hover3Submenu: '#10b981',
        textoGeralHover: '#065f46',
        bordasHeaderPerfil: '#d1fae5',
        bordasSelecaoListagens: '#a7f3d0',
        barraDashboard: '#059669',
        barraDashboardHover: '#065f46',
        receitasGraficos: '#059669',
        receitasGraficosSecundaria: '#10b981',
        despesasGraficos: '#dc2626',
        despesasGraficosSecundaria: '#ef4444',
        barraRolagem: '#059669',
        barraRolagemFundo: '#d1fae5',
        fundoLinkEAD: '#059669',
        textoLinkEAD: '#065f46',
        botaoSalvar: '#059669',
        botaoSalvarAtivo: '#065f46',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#dc2626',
        botaoCancelarAtivo: '#b91c1c',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#7c3aed',
        botaoPesquisarAtivo: '#6d28d9',
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b',
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#059669',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#059669',
      },
      dark: {
        primary: '#10b981',
        tituloPaginas: '#34d399',
        secondary: '#059669',
        accent: '#84cc16',
        background: '#111827',
        text: '#f9fafb',
        hover3Submenu: '#059669',
        textoGeralHover: '#34d399',
        bordasHeaderPerfil: '#065f46',
        bordasSelecaoListagens: '#059669',
        barraDashboard: '#10b981',
        barraDashboardHover: '#34d399',
        receitasGraficos: '#10b981',
        receitasGraficosSecundaria: '#34d399',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#10b981',
        barraRolagemFundo: '#065f46',
        fundoLinkEAD: '#10b981',
        textoLinkEAD: '#34d399',
        botaoSalvar: '#10b981',
        botaoSalvarAtivo: '#34d399',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#ef4444',
        botaoCancelarAtivo: '#f87171',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#a855f7',
        botaoPesquisarAtivo: '#c084fc',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#10b981',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#10b981',
      },
    },
    sidebar_bg: '#10b981',
    sidebar_hover_bg: '#059669',
    header_bg: '#10b981',
  },
  {
    name: 'Roxo Criativo',
    description: 'Roxo sofisticado, ideal para empresas criativas e de design',
    colors: {
      light: {
        primary: '#7c3aed',
        tituloPaginas: '#581c87',
        secondary: '#a855f7',
        accent: '#ec4899',
        background: '#ffffff',
        text: '#1f2937',
        hover3Submenu: '#a855f7',
        textoGeralHover: '#581c87',
        bordasHeaderPerfil: '#e9d5ff',
        bordasSelecaoListagens: '#d8b4fe',
        barraDashboard: '#7c3aed',
        barraDashboardHover: '#581c87',
        receitasGraficos: '#7c3aed',
        receitasGraficosSecundaria: '#a855f7',
        despesasGraficos: '#dc2626',
        despesasGraficosSecundaria: '#ef4444',
        barraRolagem: '#7c3aed',
        barraRolagemFundo: '#e9d5ff',
        fundoLinkEAD: '#7c3aed',
        textoLinkEAD: '#581c87',
        botaoSalvar: '#7c3aed',
        botaoSalvarAtivo: '#581c87',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#dc2626',
        botaoCancelarAtivo: '#b91c1c',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#059669',
        botaoPesquisarAtivo: '#047857',
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b',
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#7c3aed',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#7c3aed',
      },
      dark: {
        primary: '#a855f7',
        tituloPaginas: '#c084fc',
        secondary: '#7c3aed',
        accent: '#ec4899',
        background: '#111827',
        text: '#f9fafb',
        hover3Submenu: '#7c3aed',
        textoGeralHover: '#c084fc',
        bordasHeaderPerfil: '#581c87',
        bordasSelecaoListagens: '#7c3aed',
        barraDashboard: '#a855f7',
        barraDashboardHover: '#c084fc',
        receitasGraficos: '#a855f7',
        receitasGraficosSecundaria: '#c084fc',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#a855f7',
        barraRolagemFundo: '#581c87',
        fundoLinkEAD: '#a855f7',
        textoLinkEAD: '#c084fc',
        botaoSalvar: '#a855f7',
        botaoSalvarAtivo: '#c084fc',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#ef4444',
        botaoCancelarAtivo: '#f87171',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#10b981',
        botaoPesquisarAtivo: '#34d399',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#a855f7',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#a855f7',
      },
    },
    sidebar_bg: '#a855f7',
    sidebar_hover_bg: '#7c3aed',
    header_bg: '#a855f7',
  },
  {
    name: 'Laranja Energético',
    description: 'Laranja vibrante, perfeito para empresas dinâmicas e startups',
    colors: {
      light: {
        primary: '#ea580c',
        tituloPaginas: '#c2410c',
        secondary: '#f97316',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#1f2937',
        hover3Submenu: '#f97316',
        textoGeralHover: '#c2410c',
        bordasHeaderPerfil: '#fed7aa',
        bordasSelecaoListagens: '#fdba74',
        barraDashboard: '#ea580c',
        barraDashboardHover: '#c2410c',
        receitasGraficos: '#ea580c',
        receitasGraficosSecundaria: '#f97316',
        despesasGraficos: '#dc2626',
        despesasGraficosSecundaria: '#ef4444',
        barraRolagem: '#ea580c',
        barraRolagemFundo: '#fed7aa',
        fundoLinkEAD: '#ea580c',
        textoLinkEAD: '#c2410c',
        botaoSalvar: '#ea580c',
        botaoSalvarAtivo: '#c2410c',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#dc2626',
        botaoCancelarAtivo: '#b91c1c',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#059669',
        botaoPesquisarAtivo: '#047857',
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b',
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#ea580c',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#ea580c',
      },
      dark: {
        primary: '#f97316',
        tituloPaginas: '#fb923c',
        secondary: '#ea580c',
        accent: '#fbbf24',
        background: '#111827',
        text: '#f9fafb',
        hover3Submenu: '#ea580c',
        textoGeralHover: '#fb923c',
        bordasHeaderPerfil: '#c2410c',
        bordasSelecaoListagens: '#ea580c',
        barraDashboard: '#f97316',
        barraDashboardHover: '#fb923c',
        receitasGraficos: '#f97316',
        receitasGraficosSecundaria: '#fb923c',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#f97316',
        barraRolagemFundo: '#c2410c',
        fundoLinkEAD: '#f97316',
        textoLinkEAD: '#fb923c',
        botaoSalvar: '#f97316',
        botaoSalvarAtivo: '#fb923c',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#ef4444',
        botaoCancelarAtivo: '#f87171',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#10b981',
        botaoPesquisarAtivo: '#34d399',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#f97316',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#f97316',
      },
    },
    sidebar_bg: '#f97316',
    sidebar_hover_bg: '#ea580c',
    header_bg: '#f97316',
  },
  {
    name: 'Rosa Minimalista',
    description: 'Rosa suave e elegante, ideal para empresas de lifestyle e bem-estar',
    colors: {
      light: {
        primary: '#be185d',
        tituloPaginas: '#9d174d',
        secondary: '#ec4899',
        accent: '#8b5cf6',
        background: '#ffffff',
        text: '#1f2937',
        hover3Submenu: '#ec4899',
        textoGeralHover: '#9d174d',
        bordasHeaderPerfil: '#fce7f3',
        bordasSelecaoListagens: '#f9a8d4',
        barraDashboard: '#be185d',
        barraDashboardHover: '#9d174d',
        receitasGraficos: '#be185d',
        receitasGraficosSecundaria: '#ec4899',
        despesasGraficos: '#dc2626',
        despesasGraficosSecundaria: '#ef4444',
        barraRolagem: '#be185d',
        barraRolagemFundo: '#fce7f3',
        fundoLinkEAD: '#be185d',
        textoLinkEAD: '#9d174d',
        botaoSalvar: '#be185d',
        botaoSalvarAtivo: '#9d174d',
        botaoSalvarDesabilitado: '#9ca3af',
        botaoCancelar: '#6b7280',
        botaoCancelarAtivo: '#4b5563',
        botaoCancelarDesabilitado: '#d1d5db',
        botaoPesquisar: '#059669',
        botaoPesquisarAtivo: '#047857',
        botaoPesquisarDesabilitado: '#d1d5db',
        camposObrigatorios: '#f59e0b',
        camposNaoObrigatorios: '#f3f4f6',
        barraSuperiorMenu: '#be185d',
        textoIconeAjuda: '#374151',
        iconeAjuda: '#be185d',
      },
      dark: {
        primary: '#ec4899',
        tituloPaginas: '#f9a8d4',
        secondary: '#be185d',
        accent: '#8b5cf6',
        background: '#111827',
        text: '#f9fafb',
        hover3Submenu: '#be185d',
        textoGeralHover: '#f9a8d4',
        bordasHeaderPerfil: '#9d174d',
        bordasSelecaoListagens: '#be185d',
        barraDashboard: '#ec4899',
        barraDashboardHover: '#f9a8d4',
        receitasGraficos: '#ec4899',
        receitasGraficosSecundaria: '#f9a8d4',
        despesasGraficos: '#ef4444',
        despesasGraficosSecundaria: '#f87171',
        barraRolagem: '#ec4899',
        barraRolagemFundo: '#9d174d',
        fundoLinkEAD: '#ec4899',
        textoLinkEAD: '#f9a8d4',
        botaoSalvar: '#ec4899',
        botaoSalvarAtivo: '#f9a8d4',
        botaoSalvarDesabilitado: '#6b7280',
        botaoCancelar: '#9ca3af',
        botaoCancelarAtivo: '#d1d5db',
        botaoCancelarDesabilitado: '#9ca3af',
        botaoPesquisar: '#10b981',
        botaoPesquisarAtivo: '#34d399',
        botaoPesquisarDesabilitado: '#9ca3af',
        camposObrigatorios: '#fbbf24',
        camposNaoObrigatorios: '#374151',
        barraSuperiorMenu: '#ec4899',
        textoIconeAjuda: '#9ca3af',
        iconeAjuda: '#ec4899',
      },
    },
    sidebar_bg: '#ec4899',
    sidebar_hover_bg: '#be185d',
    header_bg: '#ec4899',
  },
];

export default function CustomizacaoTab() {
  const { theme, updateTheme, loading } = useTheme();
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'master';

  // Estado local para configurações
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [selectedCompanyFileName, setSelectedCompanyFileName] = useState<string>('');

  // Determinar quais campos mostrar baseado no tipo de usuário
  const availableFields = isMasterAdmin ? MASTER_FIELDS : ADMIN_FIELDS;

  // Inicializar configurações com valores atuais do tema
  useEffect(() => {
    const themeMode = theme.theme_mode;
    const themeColors = theme.colors;
    if (themeColors && typeof themeColors === 'object' && themeMode in themeColors) {
      const currentColors = themeColors[themeMode as keyof typeof themeColors];
      if (currentColors && typeof currentColors === 'object') {
        const initialSettings: Record<string, string | number> = {
          logo_url: theme.logo_url || '/logo.png',
          logo_scale: theme.logo_scale || 1,
          company_logo_url: theme.company_logo_url || '',
          company_logo_scale: theme.company_logo_scale || 1,
          font_family: theme.font_family || 'Inter',
          name: theme.name || 'Confectio',
          footer_company_name: theme.footer_company_name || 'Eduardo Saba',
          footer_system_version: theme.footer_system_version || '1.0.0',
          sidebar_bg: '#e8e8e8',
          sidebar_hover_bg: '#88544c',
          header_bg: '#e9c4c2',
        };

        // Adicionar todas as cores disponíveis baseado no tipo de usuário
        availableFields.forEach(({ key }) => {
          if (key in currentColors) {
            const colorValue = currentColors[key as keyof typeof currentColors];
            initialSettings[key] = typeof colorValue === 'string' ? colorValue : '#000000';
          }
        });

        setSettings(initialSettings);
      }
    }
  }, [theme, availableFields]);

  // Handler para mudanças nos campos
  const handleFieldChange = (key: string, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Atualizar variáveis CSS em tempo real para preview
    if (key === 'logo_scale' && typeof value === 'number') {
      document.documentElement.style.setProperty('--logo-scale', value.toString());
    } else if (key === 'company_logo_scale' && typeof value === 'number') {
      document.documentElement.style.setProperty('--company-logo-scale', value.toString());
    }
  };

  // Handler para upload de logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFileName('');
      return;
    }

    setSelectedFileName(file.name);

    console.log('Iniciando upload do arquivo:', file.name, file.size);

    // Verificar se o usuário está autenticado
    if (!profile?.id) {
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user-logo-${profile.id}-${Date.now()}.${fileExt}`;

      console.log('Fazendo upload para bucket "logos":', fileName);

      const { error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Erro no upload:', error);

        // Tratamento específico de erros
        if (error.message.includes('Bucket not found')) {
          toast.error('Bucket de armazenamento não encontrado. Contate o administrador.');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Sessão expirada. Faça login novamente.');
        } else {
          toast.error(`Erro no upload: ${error.message}`);
        }
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(fileName);

      console.log('URL pública gerada:', publicUrl);

      handleFieldChange('logo_url', publicUrl);

      // Limpar o input para permitir seleção do mesmo arquivo novamente
      e.target.value = '';
      setSelectedFileName('');

      toast.success('Logo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      // Não mostrar toast de erro aqui pois já foi mostrado acima
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handler para upload de logo da empresa
  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedCompanyFileName('');
      return;
    }

    setSelectedCompanyFileName(file.name);

    console.log('Iniciando upload do logo da empresa:', file.name, file.size);

    // Verificar se o usuário está autenticado
    if (!profile?.id) {
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploadingCompanyLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${profile.id}-${Date.now()}.${fileExt}`;

      console.log('Fazendo upload para:', fileName);

      const { error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Erro no upload:', error);

        // Tratamento específico de erros
        if (error.message.includes('Bucket not found')) {
          toast.error('Bucket de armazenamento não encontrado. Contate o administrador.');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Sessão expirada. Faça login novamente.');
        } else {
          toast.error(`Erro no upload: ${error.message}`);
        }
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(fileName);

      console.log('URL pública gerada:', publicUrl);

      handleFieldChange('company_logo_url', publicUrl);

      // Limpar o input para permitir seleção do mesmo arquivo novamente
      e.target.value = '';
      setSelectedCompanyFileName('');

      toast.success('Logo da empresa atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      // Não mostrar toast de erro aqui pois já foi mostrado acima
    } finally {
      setUploadingCompanyLogo(false);
    }
  };

  // Handler para aplicar predefinição
  const handleApplyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    const currentThemeMode = theme.theme_mode || 'light';
    const presetColors = preset.colors[currentThemeMode as keyof typeof preset.colors];

    if (!presetColors) {
      toast.error('Cores da predefinição não encontradas para o modo atual.');
      return;
    }

    const newSettings = { ...settings };
    Object.entries(presetColors).forEach(([key, value]) => {
      newSettings[key] = value;
    });
    setSettings(newSettings);
    toast.success(
      `Predefinição "${preset.name}" aplicada para o tema ${currentThemeMode === 'light' ? 'claro' : 'escuro'}!`
    );
  };

  // Salvar customização
  const handleSave = async () => {
    try {
      const themeMode = theme.theme_mode;
      const themeColors = theme.colors;
      if (!themeColors || typeof themeColors !== 'object' || !(themeMode in themeColors)) return;

      const currentColors = themeColors[themeMode as keyof typeof themeColors];
      if (!currentColors || typeof currentColors !== 'object') return;

      // Preparar as configurações a serem salvas
      const updatedColors: Record<string, string | number> = { ...currentColors };
      const updatedSettings = { ...theme };

      // Separar cores e configurações de logo
      Object.entries(settings).forEach(([key, value]) => {
        if (key === 'logo_url') {
          updatedSettings.logo_url = value as string;
        } else if (key === 'logo_scale') {
          updatedSettings.logo_scale = value as number;
        } else if (key === 'company_logo_url') {
          updatedSettings.company_logo_url = value as string;
        } else if (key === 'company_logo_scale') {
          updatedSettings.company_logo_scale = value as number;
        } else if (key === 'font_family') {
          updatedSettings.font_family = value as string;
        } else if (key === 'name') {
          updatedSettings.name = value as string;
        } else if (key === 'footer_company_name') {
          updatedSettings.footer_company_name = value as string;
        } else if (key === 'footer_system_version') {
          updatedSettings.footer_system_version = value as string;
        } else if (key === 'sidebar_bg') {
          updatedSettings.sidebar_bg = value as string;
        } else if (key === 'sidebar_hover_bg') {
          updatedSettings.sidebar_hover_bg = value as string;
        } else if (key === 'header_bg') {
          updatedSettings.header_bg = value as string;
        } else if (typeof value === 'string') {
          updatedColors[key] = value;
        }
      });

      // Salvar configurações específicas do usuário admin
      await updateTheme(
        {
          ...updatedSettings,
          colors: {
            ...themeColors,
            [themeMode]: updatedColors,
          },
        },
        false,
        profile?.id
      );
    } catch (error) {
      console.error('Erro ao salvar customização:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção Admin da Marca - Customização Pessoal */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Text variant="h3" className="text-primary">
              {isMasterAdmin ? '🎨 Configuração Completa do Tema' : '🎨 Customização do Sistema'}
            </Text>
            <span className="bg-primary/10 rounded px-2 py-1 text-xs text-primary">
              {isMasterAdmin ? 'Master Admin - Controle Total' : 'Personalização Individual'}
            </span>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            <p>
              {isMasterAdmin
                ? 'Configure todas as cores e elementos visuais do sistema. Suas mudanças afetam toda a interface.'
                : 'Personalize suas cores padrão que serão aplicadas em toda a interface do sistema.'}
            </p>
          </div>

          {/* Seção de Logo */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Logo Personalizado</Text>

            {/* Nome do Sistema */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Nome do Sistema</label>
              <input
                type="text"
                value={(settings.name as string) || 'Confectio'}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Digite o nome do sistema"
              />
              <p className="mt-1 text-xs text-gray-500">
                Este nome aparecerá no cabeçalho, login e em todo o sistema
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-lg border bg-white p-4">
              {settings.logo_url ? (
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-white">
                  <img
                    src={settings.logo_url as string}
                    alt="Logo atual"
                    className="rounded object-contain"
                    style={{
                      width: `${48 * ((settings.logo_scale as number) || 1)}px`,
                      height: `${48 * ((settings.logo_scale as number) || 1)}px`,
                      maxWidth: '48px',
                      maxHeight: '48px',
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
                  <span className="text-xs text-gray-400">Logo</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">Upload de Logo</label>
                  {uploadingLogo && (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enviando...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="text-muted-foreground file:bg-primary/10 hover:file:bg-primary/20 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
                  />
                  {selectedFileName && !uploadingLogo && (
                    <div className="absolute left-0 top-0 flex items-center h-full pl-3 pointer-events-none">
                      <span className="text-sm text-gray-600 truncate max-w-[200px]">
                        {selectedFileName}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Máximo 2MB. Formatos: PNG, JPG, SVG</p>
              </div>
            </div>

            {/* Escala do Logo */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium">Escala do Logo</label>
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={(settings.logo_scale as number) || 1}
                    onChange={(e) => handleFieldChange('logo_scale', parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span className="font-medium">
                      {((settings.logo_scale as number) || 1).toFixed(1)}x
                    </span>
                    <span>5.0x</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-32 h-20 border-2 border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url as string}
                      alt="Preview escala"
                      className="rounded object-contain"
                      style={{
                        width: `${64 * ((settings.logo_scale as number) || 1)}px`,
                        height: `${64 * ((settings.logo_scale as number) || 1)}px`,
                        maxWidth: '320px',
                        maxHeight: '80px',
                      }}
                    />
                  ) : (
                    <span className="text-sm text-gray-400">Logo</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Preview em tempo real - Ajuste a escala do logo do sistema
              </p>
            </div>
          </div>

          {/* Seção de Logo da Empresa */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Logo da Empresa</Text>
            <p className="mb-3 text-sm text-gray-600">
              Este logo aparecerá ao lado do logo do sistema no cabeçalho para identificação da sua
              empresa.
            </p>

            <div className="flex items-center gap-4 rounded-lg border bg-white p-4">
              {settings.company_logo_url ? (
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-white">
                  <img
                    src={settings.company_logo_url as string}
                    alt="Logo da empresa"
                    className="rounded object-contain"
                    style={{
                      width: '48px',
                      height: '48px',
                      maxWidth: '48px',
                      maxHeight: '48px',
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
                  <span className="text-xs text-gray-400">Empresa</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">Upload do Logo da Empresa</label>
                  {uploadingCompanyLogo && (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enviando...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCompanyLogoUpload}
                    disabled={uploadingCompanyLogo}
                    className="text-muted-foreground file:bg-primary/10 hover:file:bg-primary/20 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
                  />
                  {selectedCompanyFileName && !uploadingCompanyLogo && (
                    <div className="absolute left-0 top-0 flex items-center h-full pl-3 pointer-events-none">
                      <span className="text-sm text-gray-600 truncate max-w-[200px]">
                        {selectedCompanyFileName}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Máximo 2MB. Formatos: PNG, JPG, SVG</p>
              </div>
            </div>

            {/* Escala do Logo da Empresa */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium">Escala do Logo da Empresa</label>
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={(settings.company_logo_scale as number) || 1}
                    onChange={(e) =>
                      handleFieldChange('company_logo_scale', parseFloat(e.target.value))
                    }
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span className="font-medium">
                      {((settings.company_logo_scale as number) || 1).toFixed(1)}x
                    </span>
                    <span>5.0x</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-32 h-20 border-2 border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  {settings.company_logo_url ? (
                    <img
                      src={settings.company_logo_url as string}
                      alt="Preview escala empresa"
                      className="rounded object-contain"
                      style={{
                        width: `${64 * ((settings.company_logo_scale as number) || 1)}px`,
                        height: `${64 * ((settings.company_logo_scale as number) || 1)}px`,
                        maxWidth: '320px',
                        maxHeight: '80px',
                      }}
                    />
                  ) : (
                    <span className="text-sm text-gray-400">Empresa</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Preview em tempo real - Ajuste a escala do logo da empresa
              </p>
            </div>
          </div>

          {/* Seção de Fonte */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Fonte do Sistema</Text>
            <div className="flex gap-6 items-start">
              <div className="flex-1 max-w-md">
                <label className="mb-2 block text-sm font-medium">Fonte Principal</label>
                <div className="relative">
                  <select
                    value={(settings.font_family as string) || theme.font_family || 'Inter'}
                    onChange={(e) => handleFieldChange('font_family', e.target.value)}
                    className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{
                      fontFamily: (settings.font_family as string) || theme.font_family || 'Inter',
                    }}
                  >
                    <option value="Inter" style={{ fontFamily: 'Inter' }}>
                      Inter
                    </option>
                    <option value="Poppins" style={{ fontFamily: 'Poppins' }}>
                      Poppins
                    </option>
                    <option value="Roboto" style={{ fontFamily: 'Roboto' }}>
                      Roboto
                    </option>
                    <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>
                      Open Sans
                    </option>
                    <option value="Lato" style={{ fontFamily: 'Lato' }}>
                      Lato
                    </option>
                    <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>
                      Montserrat
                    </option>
                    <option value="Nunito" style={{ fontFamily: 'Nunito' }}>
                      Nunito
                    </option>
                    <option value="Ubuntu" style={{ fontFamily: 'Ubuntu' }}>
                      Ubuntu
                    </option>
                    <option value="Crimson Text" style={{ fontFamily: 'Crimson Text' }}>
                      Crimson Text
                    </option>
                    <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>
                      Playfair Display
                    </option>
                    <option value="Lora" style={{ fontFamily: 'Lora' }}>
                      Lora
                    </option>
                    <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>
                      Merriweather
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
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
                <p className="mt-1 text-xs text-gray-500">
                  A fonte será aplicada em todo o sistema após salvar
                </p>
              </div>

              {/* Preview da fonte */}
              <div className="flex-1 max-w-md">
                <label className="mb-2 block text-sm font-medium">Preview</label>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 min-h-[120px] flex flex-col justify-center">
                  <div
                    className="text-base leading-relaxed"
                    style={{
                      fontFamily: (settings.font_family as string) || theme.font_family || 'Inter',
                    }}
                  >
                    <p className="font-bold mb-1">{theme.name || 'Confectio'}</p>
                    <p className="text-sm mb-1">
                      A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
                    </p>
                    <p className="text-sm mb-1">
                      a b c d e f g h i j k l m n o p q r s t u v w x y z
                    </p>
                    <p className="text-sm">0 1 2 3 4 5 6 7 8 9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Predefinições */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Predefinições de Tema</Text>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {THEME_PRESETS.map((preset, index) => (
                <div
                  key={index}
                  className="hover:border-primary/30 rounded-lg border p-4 transition-colors"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">{preset.name}</h4>
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="bg-primary/10 hover:bg-primary/20 rounded px-2 py-1 text-xs text-primary transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                  <p className="mb-3 text-xs text-gray-600">{preset.description}</p>
                  <div className="flex gap-1">
                    {(() => {
                      const currentThemeMode = theme.theme_mode || 'light';
                      const currentColors =
                        preset.colors[currentThemeMode as keyof typeof preset.colors] || {};
                      return Object.entries(currentColors)
                        .slice(0, 3)
                        .map(([key, color]) => (
                          <div
                            key={key}
                            className="h-4 w-4 rounded border"
                            style={{ backgroundColor: color }}
                            title={`${key}: ${color}`}
                          />
                        ));
                    })()}
                    {(() => {
                      const currentThemeMode = theme.theme_mode || 'light';
                      const currentColors =
                        preset.colors[currentThemeMode as keyof typeof preset.colors] || {};
                      return (
                        Object.keys(currentColors).length > 3 && (
                          <div className="flex h-4 w-4 items-center justify-center rounded border bg-gray-200">
                            <span className="text-xs text-gray-600">+</span>
                          </div>
                        )
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Footer */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Configurações do Footer</Text>
            <p className="mb-3 text-sm text-gray-600">
              Personalize as informações exibidas no rodapé do sistema para suporte técnico e
              conformidade legal.
            </p>

            <div className="space-y-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800 dark:border-gray-700">
              {/* Nome da Empresa para Copyright */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nome da Empresa (Copyright)
                </label>
                <input
                  type="text"
                  value={(settings.footer_company_name as string) || 'Eduardo Saba'}
                  onChange={(e) => handleFieldChange('footer_company_name', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Digite o nome da empresa"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Este nome aparecerá nos direitos autorais do footer
                </p>
              </div>

              {/* Versão do Sistema */}
              <div>
                <label className="mb-2 block text-sm font-medium">Versão do Sistema</label>
                <input
                  type="text"
                  value={(settings.footer_system_version as string) || '1.0.0'}
                  onChange={(e) => handleFieldChange('footer_system_version', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 1.0.0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Versão atual do sistema (crucial para suporte técnico)
                </p>
              </div>
            </div>
          </div>

          {/* Campos de customização pessoal do admin */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Cores Principais</Text>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {availableFields.map(({ key, label, description }) => (
                <div key={key} className="flex flex-col">
                  <label className="mb-1 text-sm font-medium">{label}</label>
                  <p className="mb-2 text-xs text-gray-500">{description}</p>
                  <input
                    type="color"
                    value={(settings[key] as string) || '#000000'}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="h-8 w-16 rounded border"
                  />
                  <span className="ml-2 font-mono text-xs">
                    {(settings[key] as string) || '#000000'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Botão de salvar */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <div className="flex justify-center">
          <Button className="px-8 py-2" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Customização'}
          </Button>
        </div>
      )}

      {/* Mensagem para usuários sem permissão */}
      {(!profile || (profile.role !== 'admin' && profile.role !== 'master')) && (
        <Card className="p-6 text-center">
          <Text variant="h3" className="mb-2 text-gray-600">
            🔒 Acesso Restrito
          </Text>
          <Text className="text-gray-500">
            Apenas usuários com permissão de Admin ou Master Admin podem acessar a customização
            visual.
          </Text>
        </Card>
      )}
    </div>
  );
}
