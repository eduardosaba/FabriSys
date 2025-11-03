'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';
import { toast } from 'react-hot-toast';

// Schema de validação para um item da compra
const itemCompraSchema = z.object({
  insumo_id: z.string().min(1, 'Selecione um insumo'),
  quantidade_inicial: z.number().min(0.01, 'Quantidade deve ser maior que 0'),
  data_validade: z.string().optional(),
  valor_unitario: z.number().min(0, 'Valor deve ser maior ou igual a 0'),
  numero_lote: z.string().optional(),
});

// Schema de validação para a compra completa
const compraSchema = z.object({
  fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
  data_recebimento: z.string().min(1, 'Data de recebimento é obrigatória'),
  numero_nota_fiscal: z.string().optional(),
  itens: z.array(itemCompraSchema).min(1, 'Adicione pelo menos um item'),
});

type CompraFormData = z.infer<typeof compraSchema>;

interface RegistroCompraProps {
  onClose: () => void;
}

export default function RegistroCompra({ onClose }: RegistroCompraProps) {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [insumos, setInsumos] = useState<{ id: string; nome: string; unidade_medida: string }[]>(
    []
  );

  // Configuração do formulário
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompraFormData>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      data_recebimento: new Date().toISOString().split('T')[0],
      itens: [{}], // Iniciar com um item vazio
    },
  });

  // Configuração do array de itens
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  });

  // Carregar fornecedores e insumos
  useEffect(() => {
    async function loadData() {
      const [fornecedoresRes, insumosRes] = await Promise.all([
        supabase.from('fornecedores').select('id, nome'),
        supabase.from('insumos').select('id, nome, unidade_medida'),
      ]);

      if (fornecedoresRes.data) setFornecedores(fornecedoresRes.data);
      if (insumosRes.data) setInsumos(insumosRes.data);
    }

    loadData();
  }, []);

  // Função para registrar a compra
  async function onSubmit(data: CompraFormData) {
    try {
      setLoading(true);

      // Criar array de lotes para inserção
      const lotes = data.itens.map((item) => ({
        insumo_id: item.insumo_id,
        fornecedor_id: data.fornecedor_id,
        quantidade_inicial: item.quantidade_inicial,
        quantidade_restante: item.quantidade_inicial,
        data_recebimento: data.data_recebimento,
        data_validade: item.data_validade || null,
        numero_lote: item.numero_lote || null,
        numero_nota_fiscal: data.numero_nota_fiscal || null,
        valor_unitario: item.valor_unitario,
      }));

      // Inserir todos os lotes em uma única transação
      const { error } = await supabase.from('lotes_insumos').insert(lotes);

      if (error) throw error;

      toast.success('Compra registrada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro ao registrar compra:', err);
      toast.error('Erro ao registrar compra. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Text variant="h3" weight="semibold">
          Registrar Compra
        </Text>
        <Text variant="body-sm" color="muted">
          Registre uma nova compra com múltiplos itens
        </Text>
      </div>

      {/* Dados da compra */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fornecedor
          </label>
          <select
            {...register('fornecedor_id')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="">Selecione um fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          {errors.fornecedor_id && (
            <p className="mt-1 text-sm text-red-600">{errors.fornecedor_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data de Recebimento
            </label>
            <input
              type="date"
              {...register('data_recebimento')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
            />
            {errors.data_recebimento && (
              <p className="mt-1 text-sm text-red-600">{errors.data_recebimento.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Número da Nota Fiscal
            </label>
            <input
              type="text"
              {...register('numero_nota_fiscal')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Opcional"
            />
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Text variant="body" weight="medium">
            Itens da Compra
          </Text>
          <Button
            type="button"
            variant="secondary"
            onClick={() => append({ insumo_id: '', quantidade_inicial: 0, valor_unitario: 0 })}
          >
            Adicionar Item
          </Button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="mb-4 flex items-center justify-between">
              <Text variant="body-sm" weight="medium">
                Item {index + 1}
              </Text>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remover
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Insumo
                </label>
                <select
                  {...register(`itens.${index}.insumo_id`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="">Selecione um insumo</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome} ({i.unidade_medida})
                    </option>
                  ))}
                </select>
                {errors.itens?.[index]?.insumo_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.itens[index]?.insumo_id?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`itens.${index}.quantidade_inicial`, { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
                {errors.itens?.[index]?.quantidade_inicial && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.itens[index]?.quantidade_inicial?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor Unitário
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`itens.${index}.valor_unitario`, { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
                {errors.itens?.[index]?.valor_unitario && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.itens[index]?.valor_unitario?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de Validade
                </label>
                <input
                  type="date"
                  {...register(`itens.${index}.data_validade`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número do Lote
                </label>
                <input
                  type="text"
                  {...register(`itens.${index}.numero_lote`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar Compra'}
        </Button>
      </div>
    </form>
  );
}
