export interface ItemContagemProjetado {
  produto_id: string;
  sobra: number;
  perda: number;
}

export interface CaixaSessaoCompleto {
  id: string;
  data_abertura: string;
  data_fechamento?: string;
  saldo_inicial: number;
  saldo_final_informado?: number;
  total_vendas_sistema: number;
  diferenca?: number;
  status: 'aberto' | 'fechado';
  observacoes?: string;
  usuario?: { nome: string } | null;
  loja?: { nome: string } | null;
}
