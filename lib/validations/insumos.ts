import { z } from 'zod';

// Unidades de medida disponíveis
export const unidadesMedida = ['Kg', 'g', 'ml', 'Lt', 'un', 'lata'] as const;

// Unidades de estoque (UE) - como os itens são comprados e armazenados
export const unidadesEstoque = [
  'Lata',
  'Caixa',
  'Saco',
  'Pacote',
  'KG',
  'UN',
  'LT',
  'ML',
  'G',
] as const;

// Unidades de consumo (UC) - como os itens são usados nas receitas
export const unidadesConsumo = ['g', 'ml', 'kg', 'lt', 'un'] as const;

// Schema de validação do formulário de insumo
export const insumoSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  unidade_medida: z.enum(unidadesMedida, {
    errorMap: () => ({ message: 'Selecione uma unidade de medida válida' }),
  }),
  estoque_minimo_alerta: z.number().min(0, 'Estoque mínimo não pode ser negativo').default(0),
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  atributos_dinamicos: z.record(z.string(), z.unknown()).default({}),
  // Novos campos para sistema de unidades duplas
  unidade_estoque: z.enum(unidadesEstoque, {
    errorMap: () => ({ message: 'Selecione uma unidade de estoque válida' }),
  }),
  custo_por_ue: z.number().min(0, 'Custo deve ser maior que zero').optional(),
  unidade_consumo: z.enum(unidadesConsumo, {
    errorMap: () => ({ message: 'Selecione uma unidade de consumo válida' }),
  }),
  fator_conversao: z.number().min(0.001, 'Fator de conversão deve ser maior que zero'),
});
