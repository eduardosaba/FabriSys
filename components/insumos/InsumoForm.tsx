'use client';

import { useState } from 'react';
import {
  InsumoFormData,
  insumoSchema,
  unidadesMedida,
  unidadesEstoque,
  unidadesConsumo,
} from '@/lib/validations/insumos';
import Button from '@/components/Button';
import { z } from 'zod';
import CategoriaSelector from './CategoriaSelector';

type Props = {
  onSubmit: (values: InsumoFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  initialValues?: Partial<InsumoFormData>;
};

type FormState = {
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
  categoria_id: string;
  atributos_dinamicos: Record<string, unknown>;
  unidade_estoque: string;
  custo_por_ue?: number;
  unidade_consumo: string;
  fator_conversao: number;
};

type InitialValues = {
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
  categoria_id: string;
  atributos_dinamicos: Record<string, string | number>;
  unidade_estoque: string;
  custo_por_ue: number;
  unidade_consumo: string;
  fator_conversao: number;
};

export default function InsumoForm({ onSubmit, onCancel, loading, initialValues }: Props) {
  const validateInitialValues = (values: unknown): InitialValues => {
    const v = values as Record<string, unknown> | undefined;
    return {
      nome: typeof v?.['nome'] === 'string' ? String(v?.['nome']) : '',
      unidade_medida:
        typeof v?.['unidade_medida'] === 'string'
          ? String(v?.['unidade_medida'])
          : unidadesMedida[0],
      estoque_minimo_alerta:
        typeof v?.['estoque_minimo_alerta'] === 'number' ? Number(v?.['estoque_minimo_alerta']) : 0,
      categoria_id: typeof v?.['categoria_id'] === 'string' ? String(v?.['categoria_id']) : '',
      atributos_dinamicos:
        typeof v?.['atributos_dinamicos'] === 'object' && v?.['atributos_dinamicos'] !== null
          ? (v?.['atributos_dinamicos'] as Record<string, string | number>)
          : {},
      unidade_estoque:
        typeof v?.['unidade_estoque'] === 'string'
          ? String(v?.['unidade_estoque'])
          : unidadesEstoque[0],
      custo_por_ue: typeof v?.['custo_por_ue'] === 'number' ? Number(v?.['custo_por_ue']) : 0,
      unidade_consumo:
        typeof v?.['unidade_consumo'] === 'string'
          ? String(v?.['unidade_consumo'])
          : unidadesConsumo[0],
      fator_conversao:
        typeof v?.['fator_conversao'] === 'number' ? Number(v?.['fator_conversao']) : 1,
    };
  };

  const safeInitialValues: InitialValues = validateInitialValues(initialValues);

  // Estado inicial mais flexível para evitar erros de tipo
  const [formData, setFormData] = useState<FormState>({
    nome: safeInitialValues.nome ?? '',
    unidade_medida: safeInitialValues.unidade_medida ?? unidadesMedida[0],
    estoque_minimo_alerta: safeInitialValues.estoque_minimo_alerta ?? 0,
    categoria_id: safeInitialValues.categoria_id ?? '',
    atributos_dinamicos: safeInitialValues.atributos_dinamicos ?? {},
    // Novos campos para sistema de unidades duplas
    unidade_estoque: safeInitialValues.unidade_estoque ?? unidadesEstoque[0],
    custo_por_ue: safeInitialValues.custo_por_ue,
    unidade_consumo: safeInitialValues.unidade_consumo ?? unidadesConsumo[0],
    fator_conversao: safeInitialValues.fator_conversao ?? 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: { target: { name: string; value: string; type: string } }) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      const newValue = type === 'number' ? Number(value) : value;

      // Validação adicional para garantir valores seguros
      if (name === 'estoque_minimo_alerta' && isNaN(newValue)) {
        return prev; // Ignorar valores inválidos
      }

      if (name === 'fator_conversao' && (newValue <= 0 || isNaN(newValue))) {
        return prev; // Ignorar valores inválidos
      }

      return {
        ...prev,
        [name]: newValue,
      };
    });

    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const _validateForm = () => {
    try {
      insumoSchema.parse(formData);
      const categoriaId =
        formData.categoria_id ||
        (initialValues && typeof initialValues === 'object' && 'categoria_id' in initialValues
          ? (initialValues as { categoria_id?: string }).categoria_id
          : '');
      if (!categoriaId) {
        throw new Error('Categoria é obrigatória.');
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(newErrors);
      } else if (err instanceof Error) {
        setErrors((prev) => ({ ...prev, categoria_id: err.message }));
      } else {
        setErrors((prev) => ({ ...prev, categoria_id: 'Erro desconhecido ao validar categoria.' }));
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const safeFormData = {
        ...formData,
        categoria_id: safeInitialValues.categoria_id,
        custo_por_ue: safeInitialValues.custo_por_ue,
        estoque_minimo_alerta: safeInitialValues.estoque_minimo_alerta,
        custo_por_uc: calcularCustoPorUC(
          safeInitialValues.custo_por_ue,
          safeInitialValues.fator_conversao
        ),
      };

      const parsedData = insumoSchema.parse(safeFormData);

      await onSubmit(parsedData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path) {
            fieldErrors[error.path[0]] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else if (err instanceof Error) {
        setErrors((prev) => ({ ...prev, categoria_id: err.message }));
      } else {
        setErrors((prev) => ({
          ...prev,
          categoria_id: 'Erro desconhecido ao submeter formulário.',
        }));
      }
    }
  };

  // Adiciona máscara de moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calcularCustoPorUC = (custoPorUE: number, fatorConversao: number): string => {
    if (fatorConversao === 0) return 'N/A';
    const custoPorUC = custoPorUE / fatorConversao;
    return custoPorUC.toFixed(4); // Exibir com 4 casas decimais
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium">
          Nome do Insumo
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.nome ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          disabled={loading}
        />
        {errors.nome && <p className="mt-1 text-sm text-red-500">{errors.nome}</p>}
      </div>
      <div>
        <label htmlFor="categoria_id" className="block text-sm font-medium">
          Categoria
        </label>
        <CategoriaSelector
          value={
            formData.categoria_id ||
            (initialValues && typeof initialValues === 'object' && 'categoria_id' in initialValues
              ? (initialValues as { categoria_id?: string }).categoria_id
              : '') ||
            ''
          }
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              categoria_id: String(value),
            }))
          }
          required
          className={errors.categoria_id ? 'border-red-500' : 'border-gray-300'}
        />
        {errors.categoria_id && <p className="mt-1 text-sm text-red-500">{errors.categoria_id}</p>}
      </div>

      <div>
        <label htmlFor="unidade_medida" className="block text-sm font-medium">
          Unidade de Medida
        </label>
        <select
          id="unidade_medida"
          name="unidade_medida"
          value={formData.unidade_medida}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.unidade_medida ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          disabled={loading}
        >
          <option value="">Selecione uma unidade</option>
          <option value="Kg">Quilograma (Kg)</option>
          <option value="g">Grama (g)</option>
          <option value="ml">Mililitro (ml)</option>
          <option value="Lt">Litro (Lt)</option>
          <option value="un">Unidade (un)</option>
          <option value="lata">Lata</option>
        </select>
        {errors.unidade_medida && (
          <p className="mt-1 text-sm text-red-500">{errors.unidade_medida}</p>
        )}
      </div>

      {/* Sistema de Unidades Duplas */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-3">Sistema de Unidades Duplas</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="unidade_estoque" className="block text-sm font-medium text-gray-700">
              Unidade de Estoque (UE)
            </label>
            <select
              id="unidade_estoque"
              name="unidade_estoque"
              value={formData.unidade_estoque}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md ${
                errors.unidade_estoque ? 'border-red-500' : 'border-gray-300'
              } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              required
              disabled={loading}
            >
              <option value="">Selecione UE</option>
              {unidadesEstoque.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
            {errors.unidade_estoque && (
              <p className="mt-1 text-sm text-red-500">{errors.unidade_estoque}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Como o item é comprado e armazenado</p>
          </div>

          <div>
            <label htmlFor="custo_por_ue" className="block text-sm font-medium text-gray-700">
              Custo por UE (R$)
            </label>
            <input
              type="text"
              id="custo_por_ue"
              name="custo_por_ue"
              value={formatCurrency(formData.custo_por_ue || 0)}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: 'custo_por_ue',
                    value: parseFloat(e.target.value.replace(/[^0-9,-]+/g, '').replace(',', '.')),
                    type: 'number',
                  },
                })
              }
              className={`mt-1 block w-full rounded-md ${
                errors.custo_por_ue ? 'border-red-500' : 'border-gray-300'
              } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              disabled={loading}
            />
            {errors.custo_por_ue && (
              <p className="mt-1 text-sm text-red-500">{errors.custo_por_ue}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Preço de compra de 1 unidade de estoque</p>
          </div>

          <div>
            <label htmlFor="unidade_consumo" className="block text-sm font-medium text-gray-700">
              Unidade de Consumo (UC)
            </label>
            <select
              id="unidade_consumo"
              name="unidade_consumo"
              value={formData.unidade_consumo}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md ${
                errors.unidade_consumo ? 'border-red-500' : 'border-gray-300'
              } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              required
              disabled={loading}
            >
              <option value="">Selecione UC</option>
              {unidadesConsumo.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
            {errors.unidade_consumo && (
              <p className="mt-1 text-sm text-red-500">{errors.unidade_consumo}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Como o item é usado na receita</p>
          </div>

          <div>
            <label htmlFor="fator_conversao" className="block text-sm font-medium text-gray-700">
              Fator de Conversão (FC)
            </label>
            <input
              type="number"
              id="fator_conversao"
              name="fator_conversao"
              value={formData.fator_conversao}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md ${
                errors.fator_conversao ? 'border-red-500' : 'border-gray-300'
              } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              required
              min={0.001}
              step={0.001}
              disabled={loading}
            />
            {errors.fator_conversao && (
              <p className="mt-1 text-sm text-red-500">{errors.fator_conversao}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Quantidade de UC em 1 UE (ex: 395g por lata)
            </p>
          </div>
        </div>

        {/* Cálculo automático do custo por UC */}
        {formData.custo_por_ue && formData.fator_conversao && (
          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
            <p className="text-sm text-green-800">
              <strong>Custo por UC:</strong> R${' '}
              {(formData.custo_por_ue / formData.fator_conversao).toFixed(4)}/
              {formData.unidade_consumo}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Esse é o custo que será usado nos cálculos de produção
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="estoque_minimo_alerta" className="block text-sm font-medium">
          Alerta de Estoque Mínimo
        </label>
        <input
          type="number"
          id="estoque_minimo_alerta"
          name="estoque_minimo_alerta"
          value={safeInitialValues.estoque_minimo_alerta}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.estoque_minimo_alerta ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          min={0}
          step={1}
          disabled={loading}
        />
        {errors.estoque_minimo_alerta && (
          <p className="mt-1 text-sm text-red-500">{errors.estoque_minimo_alerta}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Preencha este campo em Unidade de Estoque (UE).
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || Object.keys(errors).length > 0}>
          {loading ? 'Salvando...' : initialValues ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}
