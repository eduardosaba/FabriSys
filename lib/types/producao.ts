import { Database } from './supabase';

// Enums e Constantes
export const StatusOP = {
  PENDENTE: 'pendente',
  EM_PRODUCAO: 'em_producao',
  PAUSADA: 'pausada',
  FINALIZADA: 'finalizada',
  CANCELADA: 'cancelada',
} as const;

export const PrioridadeOP = {
  NORMAL: 1,
  ALTA: 2,
  URGENTE: 3,
} as const;

// Types do Supabase
type Tables = Database['public']['Tables'];

// Produtos Finais
export type ProdutoFinal = Tables['produtos_finais']['Row'] & {
  tipo?: 'final' | 'semi_acabado';
};
export type ProdutoFinalInsert = Tables['produtos_finais']['Insert'];
export type ProdutoFinalUpdate = Tables['produtos_finais']['Update'];

// Ficha Técnica
export type FichaTecnica = Tables['ficha_tecnica']['Row'];
export type FichaTecnicaInsert = Tables['ficha_tecnica']['Insert'];
export type FichaTecnicaUpdate = Tables['ficha_tecnica']['Update'];

// Tipos para insumos teóricos e reais
export interface InsumoTeorico {
  insumo_id: string;
  nome_insumo: string;
  quantidade_uc: number; // Quantidade em Unidade de Consumo
  unidade_consumo: string;
  quantidade_ue: number; // Quantidade convertida para Unidade de Estoque
  unidade_estoque: string;
  custo_total: number;
  fator_conversao: number;
}

export interface InsumoReal {
  insumo_id: string;
  quantidade_ue_consumida: number; // Quantidade real baixada do estoque
  unidade_estoque: string;
}

// Ordens de Produção
export type OrdemProducao = Tables['ordens_producao']['Row'] & {
  // Novos campos para sistema de 3 fases
  quantidade_real_produzida?: number;
  custo_real_unitario?: number;
  custo_total_real?: number;
  percentual_perda_ganho?: number;
  insumos_teoricos?: InsumoTeorico[]; // JSONB com cálculo teórico
  insumos_reais?: InsumoReal[]; // JSONB com consumo real
  observacoes_producao?: string;
  supervisor_producao?: string;
};
export type OrdemProducaoInsert = Tables['ordens_producao']['Insert'];
export type OrdemProducaoUpdate = Tables['ordens_producao']['Update'];

// Registro de Produção
export type RegistroProducao = Tables['registro_producao_real']['Row'];
export type RegistroProducaoInsert = Tables['registro_producao_real']['Insert'];
export type RegistroProducaoUpdate = Tables['registro_producao_real']['Update'];

// View Types
export type AnaliseProducao = {
  numero_op: string;
  data_prevista: string;
  data_inicio: string | null;
  data_fim: string | null;
  produto: string;
  quantidade_prevista: number;
  quantidade_produzida: number;
  quantidade_perda: number;
  eficiencia_percentual: number;
  custo_previsto: number | null;
  status: (typeof StatusOP)[keyof typeof StatusOP];
  created_by: string;
  finalizado_por: string | null;
};

export type AnaliseCustosProducao = {
  numero_op: string;
  produto: string;
  quantidade_prevista: number;
  quantidade_produzida: number;
  quantidade_perda: number;
  custo_previsto: number;
  custo_perda: number;
  custo_unitario_real: number;
};

export type KPIsProducao = {
  total_ordens_producao: number;
  total_quantidade_prevista: number;
  total_quantidade_produzida: number;
  total_perdas: number;
  eficiencia_media: number;
  custo_total_previsto: number;
  custo_total_perdas: number;
  taxa_aproveitamento_percentual: number;
};

// Types Estendidos para UI
export type ProdutoFinalComFichaTecnica = ProdutoFinal & {
  ficha_tecnica?: FichaTecnica[];
};

export type OrdemProducaoDetalhada = OrdemProducao & {
  produto: ProdutoFinal;
  registros: RegistroProducao[];
  created_by_user?: { nome: string };
  finalizado_por_user?: { nome: string };
};

export type RegistroProducaoDetalhado = RegistroProducao & {
  ordem_producao: OrdemProducao;
  produto: ProdutoFinal;
  created_by_user?: { nome: string };
  supervisor?: { nome: string };
};
