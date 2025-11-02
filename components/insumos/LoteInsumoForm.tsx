'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LoteInsumo, Insumo, Fornecedor } from '@/lib/types';
import Button from '@/components/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoteInsumoFormData, loteInsumoSchema } from '@/lib/validations';

type Props = {
  onSubmit: (values: LoteInsumoFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  initialData?: LoteInsumo | null;
};

export default function LoteInsumoForm({ onSubmit, onCancel, loading, initialData }: Props) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<LoteInsumoFormData>({
    resolver: zodResolver(loteInsumoSchema),
    defaultValues: {
      insumo_id: initialData?.insumo_id || '',
      fornecedor_id: initialData?.fornecedor_id || '',
      data_recebimento: initialData?.data_recebimento.split('T')[0] || new Date().toISOString().split('T')[0],
      data_validade: initialData?.data_validade?.split('T')[0] || '',
      quantidade_inicial: initialData?.quantidade_inicial || 0,
      numero_lote: initialData?.numero_lote || '',
      numero_nota_fiscal: initialData?.numero_nota_fiscal || '',

    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        insumo_id: initialData.insumo_id,
        fornecedor_id: initialData.fornecedor_id || '',
        data_recebimento: initialData.data_recebimento.split('T')[0],
        data_validade: initialData.data_validade?.split('T')[0] || '',
        quantidade_inicial: initialData.quantidade_inicial,
        numero_lote: initialData.numero_lote || '',
        numero_nota_fiscal: initialData.numero_nota_fiscal || '',

      });
    }
  }, [initialData, reset]);

  async function fetchData() {
    try {
      setLoadingData(true);
      const [insumos, fornecedores] = await Promise.all([
        supabase.from('insumos').select('*').order('nome'),
        supabase.from('fornecedores').select('*').order('nome'),
      ]);

      if (insumos.error) throw insumos.error;
      if (fornecedores.error) throw fornecedores.error;

      setInsumos(insumos.data || []);
      setFornecedores(fornecedores.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoadingData(false);
    }
  }

  const insumoSelecionado = insumos.find((insumo) => insumo.id === watch('insumo_id'));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="insumo_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Insumo *
        </label>
        <select
          id="insumo_id"
          {...register('insumo_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loadingData || loading || !!initialData}
        >
          <option value="">Selecione um insumo</option>
          {insumos.map((insumo) => (
            <option key={insumo.id} value={insumo.id}>
              {insumo.nome} ({insumo.unidade_medida})
            </option>
          ))}
        </select>
        {errors.insumo_id && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.insumo_id.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="fornecedor_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Fornecedor
        </label>
        <select
          id="fornecedor_id"
          {...register('fornecedor_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loadingData || loading}
        >
          <option value="">Selecione um fornecedor</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome}
            </option>
          ))}
        </select>
        {errors.fornecedor_id && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fornecedor_id.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="data_recebimento" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Data de Recebimento *
        </label>
        <input
          type="date"
          id="data_recebimento"
          {...register('data_recebimento')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loading}
        />
        {errors.data_recebimento && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.data_recebimento.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="data_validade" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Data de Validade
        </label>
        <input
          type="date"
          id="data_validade"
          {...register('data_validade')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loading}
        />
        {errors.data_validade && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.data_validade.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="quantidade_inicial" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Quantidade *
        </label>
        <div className="mt-1 flex items-center">
          <input
            type="number"
            step="any"
            id="quantidade_inicial"
            {...register('quantidade_inicial', { valueAsNumber: true })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          {insumoSelecionado && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{insumoSelecionado.unidade_medida}</span>
          )}
        </div>
        {errors.quantidade_inicial && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantidade_inicial.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="numero_lote" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Número do Lote
        </label>
        <input
          type="text"
          id="numero_lote"
          {...register('numero_lote')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loading}
        />
        {errors.numero_lote && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.numero_lote.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="numero_nota_fiscal" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Número da Nota Fiscal
        </label>
        <input
          type="text"
          id="numero_nota_fiscal"
          {...register('numero_nota_fiscal')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={loading}
        />
        {errors.numero_nota_fiscal && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.numero_nota_fiscal.message}</p>
        )}
      </div>



      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {initialData ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}