export interface Categoria {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Insumo {
  id: string;
  created_at: string;
  nome: string;
  unidade_medida: string; // Mantido para compatibilidade
  estoque_minimo_alerta: number;
  estoque_atual?: number;
  ultimo_valor: number | null;
  categoria_id: number;
  categoria?: Categoria;
  atributos_dinamicos?: Record<string, unknown>;
  // Novos campos do sistema de unidades duplas
  unidade_estoque: string; // UE - Unidade de Estoque (ex: 'Lata', 'KG', 'UN')
  custo_por_ue?: number; // Custo por Unidade de Estoque
  unidade_consumo: string; // UC - Unidade de Consumo (ex: 'g', 'ml')
  fator_conversao: number; // FC - Fator de Conversão (quantidade UC em 1 UE)
  // Novos campos para produtos semi-acabados
  produto_final_id?: string; // Referência a produto semi-acabado
  tipo_insumo?: 'fisico' | 'virtual'; // Tipo do insumo
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
