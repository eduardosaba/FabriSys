import { z } from 'zod';

export const themeSettingsSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  logo_url: z
    .string()
    .url('URL do logo inválida'),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  accent_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  background_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  text_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  font_family: z
    .string()
    .min(1, 'Fonte é obrigatória')
    .max(50, 'Nome da fonte muito longo'),
  border_radius: z
    .string()
    .regex(/^\d+(\.\d+)?rem$/, 'Raio da borda deve estar no formato 0.5rem')
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
    .transform(v => v === '' ? undefined : v),
  contato: z
    .string()
    .max(100, 'Contato deve ter no máximo 100 caracteres')
    .optional()
    .transform(v => v === '' ? undefined : v),
});

export const loteInsumoSchema = z.object({
  insumo_id: z
    .string()
    .uuid('ID do insumo inválido'),
  fornecedor_id: z
    .string()
    .uuid('ID do fornecedor inválido')
    .nullable(),
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