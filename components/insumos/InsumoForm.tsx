'use client';

import { useState } from 'react';
import { InsumoFormData, insumoSchema, unidadesMedida } from '@/lib/validations/insumos';
import Button from '@/components/Button';
import { z } from 'zod';
import CategoriaSelector from './CategoriaSelector';

type Props = {
  onSubmit: (values: InsumoFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  initialValues?: InsumoFormData;
};

export default function InsumoForm({ onSubmit, onCancel, loading, initialValues }: Props) {
  const [formData, setFormData] = useState<InsumoFormData>({
    nome: initialValues?.nome ?? '',
    unidade_medida: initialValues?.unidade_medida ?? unidadesMedida[0],
    estoque_minimo_alerta: initialValues?.estoque_minimo_alerta ?? 0,
    categoria_id: initialValues?.categoria_id ?? '',
    atributos_dinamicos: initialValues?.atributos_dinamicos ?? {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: { target: { name: string; value: string; type: string } }) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));

    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    try {
      insumoSchema.parse(formData);
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
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onSubmit(formData);
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
          value={formData.categoria_id}
          onChange={(value) =>
            handleChange({ target: { name: 'categoria_id', value, type: 'text' } })
          }
          required
          disabled={loading}
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
      <div>
        <label htmlFor="estoque_minimo_alerta" className="block text-sm font-medium">
          Alerta de Estoque Mínimo
        </label>
        <input
          type="number"
          id="estoque_minimo_alerta"
          name="estoque_minimo_alerta"
          value={formData.estoque_minimo_alerta}
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
