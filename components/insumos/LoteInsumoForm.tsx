'use client';

import { useState, useEffect } from 'react';
import { Insumo, Fornecedor } from '@/lib/types';
import { LoteInsumoFormData, loteInsumoSchema } from '@/lib/validations';
import Button from '@/components/Button';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

type Props = {
  onSubmit: (values: LoteInsumoFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
};

export default function LoteInsumoForm({ onSubmit, onCancel, loading }: Props) {
  const [formData, setFormData] = useState<LoteInsumoFormData>({
    insumo_id: '',
    fornecedor_id: null,
    quantidade_inicial: 0,
    data_recebimento: new Date().toISOString().split('T')[0],
    data_validade: null,
    numero_lote: null,
    numero_nota_fiscal: null,
  });

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar insumos
        const { data: insumosData, error: insumosError } = await supabase
          .from('insumos')
          .select('*')
          .order('nome');

        if (insumosError) throw insumosError;
        setInsumos(insumosData);

        // Buscar fornecedores
        const { data: fornecedoresData, error: fornecedoresError } = await supabase
          .from('fornecedores')
          .select('*')
          .order('nome');

        if (fornecedoresError) throw fornecedoresError;
        setFornecedores(fornecedoresData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        toast.error('Erro ao carregar dados. Por favor, recarregue a página.');
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value === '' 
        ? null 
        : type === 'number' 
          ? Number(value) 
          : value,
    }));

    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    try {
      loteInsumoSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(error => {
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

  if (loadingData) {
    return <div>Carregando...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="insumo_id" className="block text-sm font-medium">
          Insumo
        </label>
        <select
          id="insumo_id"
          name="insumo_id"
          value={formData.insumo_id}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.insumo_id ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          disabled={loading}
        >
          <option value="">Selecione um insumo</option>
          {insumos.map(insumo => (
            <option key={insumo.id} value={insumo.id}>
              {insumo.nome} ({insumo.unidade_medida})
            </option>
          ))}
        </select>
        {errors.insumo_id && (
          <p className="mt-1 text-sm text-red-500">{errors.insumo_id}</p>
        )}
      </div>

      <div>
        <label htmlFor="fornecedor_id" className="block text-sm font-medium">
          Fornecedor
        </label>
        <select
          id="fornecedor_id"
          name="fornecedor_id"
          value={formData.fornecedor_id || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.fornecedor_id ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          disabled={loading}
        >
          <option value="">Selecione um fornecedor (opcional)</option>
          {fornecedores.map(fornecedor => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome}
            </option>
          ))}
        </select>
        {errors.fornecedor_id && (
          <p className="mt-1 text-sm text-red-500">{errors.fornecedor_id}</p>
        )}
      </div>

      <div>
        <label htmlFor="quantidade_inicial" className="block text-sm font-medium">
          Quantidade Recebida
        </label>
        <input
          type="number"
          id="quantidade_inicial"
          name="quantidade_inicial"
          value={formData.quantidade_inicial}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.quantidade_inicial ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          min={0.01}
          step={0.01}
          disabled={loading}
        />
        {errors.quantidade_inicial && (
          <p className="mt-1 text-sm text-red-500">{errors.quantidade_inicial}</p>
        )}
      </div>

      <div>
        <label htmlFor="data_recebimento" className="block text-sm font-medium">
          Data de Recebimento
        </label>
        <input
          type="date"
          id="data_recebimento"
          name="data_recebimento"
          value={formData.data_recebimento}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.data_recebimento ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          required
          disabled={loading}
        />
        {errors.data_recebimento && (
          <p className="mt-1 text-sm text-red-500">{errors.data_recebimento}</p>
        )}
      </div>

      <div>
        <label htmlFor="data_validade" className="block text-sm font-medium">
          Data de Validade
        </label>
        <input
          type="date"
          id="data_validade"
          name="data_validade"
          value={formData.data_validade || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.data_validade ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          disabled={loading}
        />
        {errors.data_validade && (
          <p className="mt-1 text-sm text-red-500">{errors.data_validade}</p>
        )}
      </div>

      <div>
        <label htmlFor="numero_lote" className="block text-sm font-medium">
          Número do Lote
        </label>
        <input
          type="text"
          id="numero_lote"
          name="numero_lote"
          value={formData.numero_lote || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.numero_lote ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          disabled={loading}
        />
        {errors.numero_lote && (
          <p className="mt-1 text-sm text-red-500">{errors.numero_lote}</p>
        )}
      </div>

      <div>
        <label htmlFor="numero_nota_fiscal" className="block text-sm font-medium">
          Número da Nota Fiscal
        </label>
        <input
          type="text"
          id="numero_nota_fiscal"
          name="numero_nota_fiscal"
          value={formData.numero_nota_fiscal || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.numero_nota_fiscal ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
          disabled={loading}
        />
        {errors.numero_nota_fiscal && (
          <p className="mt-1 text-sm text-red-500">{errors.numero_nota_fiscal}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || Object.keys(errors).length > 0}
        >
          {loading ? 'Salvando...' : 'Registrar Lote'}
        </Button>
      </div>
    </form>
  );
}