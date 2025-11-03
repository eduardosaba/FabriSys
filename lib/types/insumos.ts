export interface Categoria {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Insumo {
  id: string;
  created_at: string;
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
  estoque_atual?: number;
  ultimo_valor?: number;
  categoria_id: string;
  categoria?: Categoria;
  atributos_dinamicos?: Record<string, any>;
}

export interface LoteInsumo {
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
  fornecedor?: {
    id: string;
    nome: string;
    cnpj: string | null;
    email?: string | null;
    telefone?: string | null;
    endereco?: string | null;
  } | null;
}
