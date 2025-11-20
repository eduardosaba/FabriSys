import { z } from 'zod';

// Unidades de medida disponíveis
export const unidadesMedida = ['Kg', 'g', 'ml', 'Lt', 'un', 'lata'] as const;

// Unidades de estoque (UE) - como os itens são comprados e armazenados
export const unidadesEstoque = [
  'Lata',
  'Caixa',
  'Saco',
  'Pacote',
  'Rolo',
  'Tubo',
  'Galão',
  'Tambor',
  'Saco 25kg',
  'Saco 50kg',
  'ML',
  'L',
] as const;

// Unidades de consumo (UC) - como os itens são usados nas receitas
export const unidadesConsumo = ['g', 'Kg', 'ml', 'Lt', 'un', 'lata'] as const;

export const themeSettingsSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  logo_url: z.string().min(1, 'Logo é obrigatório'),
  logo_scale: z
    .number()
    .min(0.1, 'Escala mínima é 0.1')
    .max(2.0, 'Escala máxima é 2.0')
    .default(1.0)
    .transform((val) => val ?? 1.0),
  colors: z.object({
    light: z.object({
      primary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      secondary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      accent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      background: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      text: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
    }),
    dark: z.object({
      primary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      secondary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      accent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      background: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
      text: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
    }),
  }),
  font_family: z.string().min(1, 'Fonte é obrigatória').max(50, 'Nome da fonte muito longo'),
  border_radius: z.string().regex(/^\d+(\.\d+)?rem$/, 'Raio da borda deve estar no formato 0.5rem'),
  theme_mode: z.enum(['light', 'dark', 'system'], {
    required_error: 'Selecione um modo de tema',
  }),
  sidebar_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  density: z.enum(['comfortable', 'compact'], {
    required_error: 'Selecione uma densidade',
  }),
});

export const insumoSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  unidade_medida: z
    .string()
    .min(1, 'Unidade de medida é obrigatória')
    .max(10, 'Unidade deve ter no máximo 10 caracteres')
    .trim(),
  estoque_minimo_alerta: z
    .number()
    .min(0, 'Estoque mínimo não pode ser negativo')
    .max(999999, 'Valor muito alto para estoque mínimo'),
  categoria_id: z.string().uuid('ID da categoria inválido').optional(),
  atributos_dinamicos: z.record(z.unknown()).optional().default({}),
  unidade_estoque: z
    .enum(
      [
        'Lata',
        'Caixa',
        'Saco',
        'Pacote',
        'Rolo',
        'Tubo',
        'Galão',
        'Tambor',
        'Saco 25kg',
        'Saco 50kg',
        'ML',
        'L',
      ],
      {
        required_error: 'Selecione a unidade de estoque',
      }
    )
    .optional(),
  unidade_consumo: z
    .enum(['g', 'Kg', 'ml', 'Lt', 'un', 'lata'], {
      required_error: 'Selecione a unidade de consumo',
    })
    .optional(),
  fator_conversao: z
    .number()
    .min(0.001, 'Fator deve ser maior que zero')
    .max(10000, 'Fator muito alto')
    .optional()
    .default(1),
  custo_por_ue: z
    .number()
    .min(0, 'Custo não pode ser negativo')
    .max(999999, 'Custo muito alto')
    .optional(),
});

export const fornecedorSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  contato: z
    .string()
    .max(100, 'Contato deve ter no máximo 100 caracteres')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export const loteInsumoSchema = z.object({
  insumo_id: z.string().uuid('ID do insumo inválido'),
  fornecedor_id: z.string().uuid('ID do fornecedor inválido').nullable(),
  quantidade_inicial: z
    .number()
    .min(0.01, 'Quantidade deve ser maior que zero')
    .max(999999, 'Quantidade muito alta'),
  data_recebimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD'),
  data_validade: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
    .nullable()
    .optional(),
  numero_lote: z
    .string()
    .max(50, 'Número do lote deve ter no máximo 50 caracteres')
    .nullable()
    .optional(),
  numero_nota_fiscal: z
    .string()
    .max(50, 'Número da nota fiscal deve ter no máximo 50 caracteres')
    .nullable()
    .optional(),
});

export type InsumoFormData = z.infer<typeof insumoSchema>;
export type FornecedorFormData = z.infer<typeof fornecedorSchema>;
export type LoteInsumoFormData = z.infer<typeof loteInsumoSchema>;
