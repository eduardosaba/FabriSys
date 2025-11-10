export type Database = {
  public: {
    Tables: {
      produtos_finais: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          preco_venda: number;
          cmp: number | null;
          ativo: boolean;
          imagem_url: string | null;
          codigo_interno: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nome: string;
          descricao?: string | null;
          preco_venda: number;
          ativo?: boolean;
          imagem_url?: string | null;
          codigo_interno?: string | null;
        };
        Update: {
          nome?: string;
          descricao?: string | null;
          preco_venda?: number;
          ativo?: boolean;
          imagem_url?: string | null;
          codigo_interno?: string | null;
        };
      };
      ficha_tecnica: {
        Row: {
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
          created_at: string;
          updated_at: string;
          created_by: string | null;
          versao: number;
          ativo: boolean;
        };
        Insert: {
          produto_final_id: string;
          insumo_id: string;
          quantidade: number;
          unidade_medida: string;
          perda_padrao?: number;
          rendimento_unidades?: number;
          instrucoes?: string | null;
          tempo_preparo_minutos?: number | null;
          ordem_producao?: number | null;
          created_by?: string | null;
          versao?: number;
          ativo?: boolean;
        };
        Update: {
          produto_final_id?: string;
          insumo_id?: string;
          quantidade?: number;
          unidade_medida?: string;
          perda_padrao?: number;
          rendimento_unidades?: number;
          instrucoes?: string | null;
          tempo_preparo_minutos?: number | null;
          ordem_producao?: number | null;
          created_by?: string | null;
          versao?: number;
          ativo?: boolean;
        };
      };
      ordens_producao: {
        Row: {
          id: string;
          numero_op: string;
          produto_final_id: string;
          quantidade_prevista: number;
          status: string;
          data_prevista: string;
          data_inicio: string | null;
          data_fim: string | null;
          observacoes: string | null;
          prioridade: number;
          lote_producao: string | null;
          created_by: string | null;
          finalizado_por: string | null;
          created_at: string;
          updated_at: string;
          versao_ficha_tecnica: number | null;
          custo_previsto: number | null;
        };
        Insert: {
          produto_final_id: string;
          quantidade_prevista: number;
          status?: string;
          data_prevista: string;
          data_inicio?: string | null;
          data_fim?: string | null;
          observacoes?: string | null;
          prioridade?: number;
          lote_producao?: string | null;
          created_by?: string | null;
          finalizado_por?: string | null;
          versao_ficha_tecnica?: number | null;
        };
        Update: {
          produto_final_id?: string;
          quantidade_prevista?: number;
          status?: string;
          data_prevista?: string;
          data_inicio?: string | null;
          data_fim?: string | null;
          observacoes?: string | null;
          prioridade?: number;
          lote_producao?: string | null;
          created_by?: string | null;
          finalizado_por?: string | null;
          versao_ficha_tecnica?: number | null;
        };
      };
      registro_producao_real: {
        Row: {
          id: string;
          ordem_producao_id: string;
          quantidade_produzida: number;
          quantidade_perda: number;
          motivo_perda: string | null;
          data_producao: string;
          temperatura_ambiente: number | null;
          umidade_relativa: number | null;
          tempo_producao_minutos: number | null;
          observacoes_processo: string | null;
          controle_qualidade: Record<string, unknown> | null;
          created_by: string | null;
          supervisor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ordem_producao_id: string;
          quantidade_produzida: number;
          quantidade_perda?: number;
          motivo_perda?: string | null;
          data_producao: string;
          temperatura_ambiente?: number | null;
          umidade_relativa?: number | null;
          tempo_producao_minutos?: number | null;
          observacoes_processo?: string | null;
          controle_qualidade?: Record<string, unknown> | null;
          created_by?: string | null;
          supervisor_id?: string | null;
        };
        Update: {
          ordem_producao_id?: string;
          quantidade_produzida?: number;
          quantidade_perda?: number;
          motivo_perda?: string | null;
          data_producao?: string;
          temperatura_ambiente?: number | null;
          umidade_relativa?: number | null;
          tempo_producao_minutos?: number | null;
          observacoes_processo?: string | null;
          controle_qualidade?: Record<string, unknown> | null;
          created_by?: string | null;
          supervisor_id?: string | null;
        };
      };
    };
    Views: {
      vw_analise_producao: {
        Row: {
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
          status: string;
          created_by: string;
          finalizado_por: string | null;
        };
      };
      vw_analise_custos_producao: {
        Row: {
          numero_op: string;
          produto: string;
          quantidade_prevista: number;
          quantidade_produzida: number;
          quantidade_perda: number;
          custo_previsto: number;
          custo_perda: number;
          custo_unitario_real: number;
        };
      };
    };
    Functions: {
      calcular_kpis_producao: {
        Args: {
          data_inicio: string;
          data_fim: string;
        };
        Returns: {
          total_ordens_producao: number;
          total_quantidade_prevista: number;
          total_quantidade_produzida: number;
          total_perdas: number;
          eficiencia_media: number;
          custo_total_previsto: number;
          custo_total_perdas: number;
          taxa_aproveitamento_percentual: number;
        }[];
      };
    };
  };
};
