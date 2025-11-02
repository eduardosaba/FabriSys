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

export interface ThemeSettings {
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  border_radius: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: ThemeSettings;
  updated_at: string;
  updated_by: string | null;
}

export type Insumo = {
  id: string;
  created_at: string;
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
  estoque_atual?: number;
};

export type Fornecedor = {
  id: string;
  created_at: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
};

export type LoteInsumo = {
  id: string;
  created_at: string;
  insumo_id: string;
  fornecedor_id: string | null;
  quantidade_inicial: number;
  quantidade_restante: number;
  data_recebimento: string;
  data_validade: string | null;
  numero_lote: string | null;
  numero_nota_fiscal: string | null;
  insumo?: Insumo;
  fornecedor?: Fornecedor;
};
