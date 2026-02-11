import { z } from 'zod';
import { StatusOP, PrioridadeOP } from '../types/producao';

// Validação de Produto Final
export const produtoFinalSchema = z
  .object({
    id: z.string().uuid().optional(),
    nome: z
      .string()
      .min(1, 'Nome é obrigatório')
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    descricao: z.preprocess((val) => (val === '' ? null : val), z.string().nullable()),
    preco_venda: z
      .number({
        invalid_type_error: 'Preço de venda deve ser um número válido',
      })
      .min(0, 'Preço de venda inválido')
      .max(999999.99, 'Preço de venda muito alto')
      .optional(),
    ativo: z.preprocess((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    }, z.boolean().default(true)),
    imagem_url: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().url('URL da imagem inválida').nullable()
    ),
    codigo_interno: z.preprocess((val) => (val === '' ? null : val), z.string().nullable()),
    tipo: z.enum(['final', 'semi_acabado']).default('final'),
    // aceitarmos strings numéricas vindas de formulários: coerce para número
    peso_unitario: z.coerce.number().optional(),
    categoria_id: z.preprocess((val) => {
      // aceitar string vazia => null, string numérica => number, ou number direto
      if (val === '') return null;
      if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
      return val;
    }, z.number().int().nullable().optional()),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // Para produtos finais, preco_venda é obrigatório; para semi_acabado pode ficar ausente
      if (data.tipo === 'final') {
        return typeof data.preco_venda === 'number' && data.preco_venda >= 0.01;
      }
      return true;
    },
    {
      message: 'Preço de venda é obrigatório para produtos finais',
      path: ['preco_venda'],
    }
  );

// Validação de Ficha Técnica
export const fichaTecnicaSchema = z.object({
  id: z.string().uuid().optional(),
  produto_final_id: z.string().uuid(),
  insumo_id: z.string().uuid(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  unidade_medida: z.string().min(1, 'Unidade de medida é obrigatória'),
  perda_padrao: z.number().min(0).max(100).default(0),
  rendimento_unidades: z.number().int().positive().default(1),
  instrucoes: z.string().optional(),
  tempo_preparo_minutos: z.number().int().positive().optional(),
  ordem_producao: z.number().int().positive().optional(),
  versao: z.number().int().positive().default(1),
  ativo: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
});

// Validação de Ordem de Produção
export const ordemProducaoSchema = z.object({
  id: z.string().uuid().optional(),
  numero_op: z.string().optional(), // Gerado automaticamente
  produto_final_id: z.string().uuid(),
  quantidade_prevista: z.number().int().positive('Quantidade deve ser maior que zero'),
  status: z
    .enum([
      StatusOP.PENDENTE,
      StatusOP.EM_PRODUCAO,
      StatusOP.PAUSADA,
      StatusOP.FINALIZADA,
      StatusOP.CANCELADA,
    ])
    .default(StatusOP.PENDENTE),
  data_prevista: z.string().datetime(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  observacoes: z.string().optional(),
  prioridade: z.number().int().min(1).max(3).default(PrioridadeOP.NORMAL),
  lote_producao: z.string().optional(),
  created_by: z.string().uuid().optional(),
  finalizado_por: z.string().uuid().optional(),
  versao_ficha_tecnica: z.number().int().positive().optional(),
  custo_previsto: z.number().optional(),
});

// Validação de Registro de Produção
export const registroProducaoSchema = z.object({
  id: z.string().uuid().optional(),
  ordem_producao_id: z.string().uuid(),
  quantidade_produzida: z.number().int().positive('Quantidade deve ser maior que zero'),
  quantidade_perda: z.number().int().min(0).default(0),
  motivo_perda: z.string().optional(),
  data_producao: z.string().datetime(),
  temperatura_ambiente: z.number().optional(),
  umidade_relativa: z.number().optional(),
  tempo_producao_minutos: z.number().int().positive().optional(),
  observacoes_processo: z.string().optional(),
  controle_qualidade: z.record(z.any()).optional(),
  created_by: z.string().uuid().optional(),
  supervisor_id: z.string().uuid().optional(),
});

// Validações de Período para KPIs
export const periodoKPISchema = z
  .object({
    data_inicio: z.string().datetime(),
    data_fim: z.string().datetime(),
  })
  .refine(
    (data) => {
      const inicio = new Date(data.data_inicio);
      const fim = new Date(data.data_fim);
      return inicio <= fim;
    },
    {
      message: 'Data fim deve ser maior ou igual à data início',
    }
  );
