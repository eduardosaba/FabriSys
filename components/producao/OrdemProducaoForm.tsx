'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import Button from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { OrdemProducao } from '@/lib/types/producao';
import { ordemProducaoSchema } from '@/lib/validations/producao';
import SeletorProduto from './SeletorProduto';

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
    formState: { errors, isSubmitting },
    setValue,
    watch,
    control,
  } = useForm({
    resolver: zodResolver(ordemProducaoSchema),
    defaultValues: ordem || {
      status: 'pendente',
      data_prevista: new Date().toISOString().split('T')[0],
      quantidade_planejada: 1,
    },
  });

  const onSubmit = async (data: OrdemProducao) => {
    try {
      setLoading(true);

      if (ordem) {
        const { error } = await supabase.from('ordens_producao').update(data).eq('id', ordem.id);

        if (error) throw error;

        toast({
          title: 'Ordem atualizada',
          description: 'As alterações foram salvas com sucesso.',
          variant: 'success',
        });
      } else {
        const { error } = await supabase.from('ordens_producao').insert(data);

        if (error) throw error;

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
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar a ordem de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const produto_id = watch('produto_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Produto</label>
          <div className="mt-1">
            <SeletorProduto value={produto_id} onChange={(id) => setValue('produto_id', id)} />
          </div>
          {errors.produto_id && (
            <p className="mt-1 text-sm text-red-600">{errors.produto_id.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Quantidade Planejada</label>
          <input
            type="number"
            min="1"
            {...register('quantidade_planejada', { valueAsNumber: true })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.quantidade_planejada ? 'border-red-300' : ''}`}
          />
          {errors.quantidade_planejada && (
            <p className="mt-1 text-sm text-red-600">
              {errors.quantidade_planejada.message?.toString()}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Data Prevista</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              {...register('data_prevista')}
              className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                ${errors.data_prevista ? 'border-red-300' : ''}`}
            />
          </div>
          {errors.data_prevista && (
            <p className="mt-1 text-sm text-red-600">{errors.data_prevista.message?.toString()}</p>
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
