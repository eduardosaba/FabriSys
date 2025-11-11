// Definição dos tipos de dados que serão usados no sistema

export type UserRole = 'admin' | 'gerente' | 'operador';

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  // Cores adicionais para customização completa
  tituloPaginas: string;
  hover3Submenu: string;
  textoGeralHover: string;
  bordasHeaderPerfil: string;
  bordasSelecaoListagens: string;
  barraDashboard: string;
  barraDashboardHover: string;
  receitasGraficos: string;
  receitasGraficosSecundaria: string;
  despesasGraficos: string;
  despesasGraficosSecundaria: string;
  barraRolagem: string;
  barraRolagemFundo: string;
  fundoLinkEAD: string;
  textoLinkEAD: string;
  botaoSalvar: string;
  botaoSalvarAtivo: string;
  botaoSalvarDesabilitado: string;
  botaoCancelar: string;
  botaoCancelarAtivo: string;
  botaoCancelarDesabilitado: string;
  botaoPesquisar: string;
  botaoPesquisarAtivo: string;
  botaoPesquisarDesabilitado: string;
  camposObrigatorios: string;
  camposNaoObrigatorios: string;
  barraSuperiorMenu: string;
  textoIconeAjuda: string;
  iconeAjuda: string;
  // Configurações de logo para usuários admin
  logo_url?: string;
  logo_scale?: number;
}

export interface ThemeSettings {
  name: string;
  logo_url: string;
  logo_scale: number;
  font_family: string;
  border_radius: string;
  theme_mode: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

export interface SystemSettings {
  id: string;
  key: string;
  value: ThemeSettings;
  updated_at: string;
  updated_by: string | null;
}

// Re-exportando os tipos específicos
export type { Insumo } from './types/insumos';
export type { Fornecedor } from './types/fornecedores';
export type { LoteInsumo } from './types/insumos';
