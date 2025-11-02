// Definição dos tipos de dados que serão usados no sistema

export type Insumo = {
  id: string;
  created_at: string;
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
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
