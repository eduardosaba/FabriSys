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
