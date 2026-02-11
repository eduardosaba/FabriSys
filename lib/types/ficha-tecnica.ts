// Tipos para o sistema de Ficha Técnica de Produção

export interface InsumoFicha {
  // ID único temporário para manipulação no frontend
  idLocal: string;

  // ID do insumo na tabela 'itens_estoque'
  insumoId: string | null;

  // Nome do insumo (para exibição)
  nomeInsumo: string;

  // Quantidade utilizada na receita (Ex: 0.15) - AGORA EM UNIDADE DE CONSUMO (UC)
  quantidade: number;

  // Unidade de medida do insumo (Ex: 'kg', 'ml', 'un') - AGORA É UNIDADE DE CONSUMO (UC)
  unidadeMedida: string;

  // Percentual de perda esperada (Ex: 5)
  perdaPadrao: number;

  // Custo unitário do insumo (para cálculo em tempo real) - AGORA É CUSTO POR UC
  custoUnitario: number;

  // Novos campos para sistema de unidades duplas
  unidadeEstoque?: string; // UE - Unidade de Estoque
  custoPorUE?: number; // Custo por Unidade de Estoque
  fatorConversao?: number; // Fator de Conversão (FC)
  // Suporte a insumos compostos (preparações / produtos finais usados como insumo)
  isComposto?: boolean;
  compostoProdutoId?: string | null;
}

export interface FichaTecnicaData {
  produtoFinalId: string;
  nomeProduto: string;
  precoVenda: number;
  insumos: InsumoFicha[];
}

export interface FichaTecnicaDB {
  id: string;
  produto_final_id: string;
  insumo_id: string;
  quantidade: number;
  unidade_medida: string;
  perda_padrao: number;
  rendimento_unidades: number;
  instrucoes: string | null;
  tempo_preparo_minutos: number | null;
  ordem_producao: number | null;
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustoResumo {
  custoTotal: number;
  precoVenda: number;
  margemBruta: number;
  margemBrutaPercentual: number;
}
