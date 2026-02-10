'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import Button from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { OrdemProducao } from '@/lib/types/producao';
import SeletorProduto from './SeletorProduto';

type OrdemProducaoFormData = {
  id?: string;
  numero_op?: string;
  produto_final_id: string;
  quantidade_prevista: number;
  status: 'pendente' | 'em_producao' | 'pausada' | 'finalizada' | 'cancelada';
  data_prevista: string;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  prioridade: number;
  lote_producao?: string;
  versao_ficha_tecnica?: number;
  custo_previsto?: number;
};

interface OrdemProducaoFormProps {
  ordem?: OrdemProducao;
  onSuccess?: () => void;
}

export default function OrdemProducaoForm({ ordem, onSuccess }: OrdemProducaoFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: _isSubmitting },
    setValue,
    watch,
    control: _control,
  } = useForm<OrdemProducaoFormData>({
    defaultValues: ordem
      ? {
          id: ordem.id,
          numero_op: ordem.numero_op,
          produto_final_id: ordem.produto_final_id,
          quantidade_prevista: ordem.quantidade_prevista,
          status: ordem.status as
            | 'pendente'
            | 'em_producao'
            | 'pausada'
            | 'finalizada'
            | 'cancelada',
          data_prevista: ordem.data_prevista,
          data_inicio: ordem.data_inicio || undefined,
          data_fim: ordem.data_fim || undefined,
          observacoes: ordem.observacoes || undefined,
          prioridade: ordem.prioridade,
          lote_producao: ordem.lote_producao || undefined,
          versao_ficha_tecnica: ordem.versao_ficha_tecnica || undefined,
          custo_previsto: ordem.custo_previsto || undefined,
        }
      : {
          status: 'pendente',
          data_prevista: new Date().toISOString(),
          quantidade_prevista: 1,
          prioridade: 1,
        },
  });

  const onSubmit = async (data: OrdemProducaoFormData) => {
    try {
      setLoading(true);

      if (ordem) {
        const res = await supabase.from('ordens_producao').update(data).eq('id', ordem.id);
        if (res?.error && (res.error as { message?: string }).message) {
          throw new Error((res.error as { message?: string }).message as string);
        }

        toast({
          title: 'Ordem atualizada',
          description: 'As alterações foram salvas com sucesso.',
          variant: 'success',
        });
      } else {
        const res = await supabase.from('ordens_producao').insert(data);
        if (res?.error && (res.error as { message?: string }).message) {
          throw new Error((res.error as { message?: string }).message as string);
        }

        toast({
          title: 'Ordem criada',
          description: 'A ordem de produção foi criada com sucesso.',
          variant: 'success',
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/producao/ordens');
      }
    } catch (err) {
      if (err instanceof Error) console.error('Erro ao salvar ordem de produção:', err.message);
      else console.error('Erro ao salvar ordem de produção:', err);

      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar a ordem de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const produto_id = watch('produto_final_id');

  function getFieldErrorMessage(fieldError: unknown) {
    if (!fieldError) return '';
    if (typeof fieldError === 'string') return fieldError;
    if (typeof fieldError === 'object' && fieldError !== null && 'message' in fieldError) {
      return String((fieldError as { message?: unknown }).message ?? '');
    }
    return String(fieldError);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Produto</label>
          <div className="mt-1">
            <SeletorProduto
              value={produto_id}
              onChange={(id) => setValue('produto_final_id', id)}
            />
          </div>
          {errors.produto_final_id && (
            <p className="mt-1 text-sm text-red-600">
              {getFieldErrorMessage(errors.produto_final_id)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Quantidade Planejada</label>
          <input
            type="number"
            min="1"
            {...register('quantidade_prevista', { valueAsNumber: true })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.quantidade_prevista ? 'border-red-300' : ''}`}
          />
          {errors.quantidade_prevista && (
            <p className="mt-1 text-sm text-red-600">
              {getFieldErrorMessage(errors.quantidade_prevista)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Data Prevista</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              {...register('data_prevista')}
              className={`block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                ${errors.data_prevista ? 'border-red-300' : ''}`}
            />
          </div>
          {errors.data_prevista && (
            <p className="mt-1 text-sm text-red-600">
              {getFieldErrorMessage(errors.data_prevista)}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Observações</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {ordem ? 'Salvar Alterações' : 'Criar Ordem'}
        </Button>
      </div>
    </form>
  );
}
