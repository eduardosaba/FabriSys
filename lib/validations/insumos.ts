import { z } from 'zod';

// Unidades de medida disponíveis
export const unidadesMedida = ['Kg', 'g', 'ml', 'Lt', 'un', 'lata'] as const;

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
});

// Tipo gerado a partir do schema
export type InsumoFormData = z.infer<typeof insumoSchema>;
