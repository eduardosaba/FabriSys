'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import Panel from '@/components/ui/Panel';
import { maskCNPJ, onlyDigits } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().refine((v) => onlyDigits(v).length === 14, 'CNPJ inválido'),
  email: z.string().email('Email inválido').optional().nullish(),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(11, 'Telefone inválido')
    .optional()
    .nullish(),
  endereco: z.string().optional().nullish(),
});

type FormData = z.infer<typeof schema>;

export default function CadastroFornecedorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    try {
      setSaving(true);
      const payload = { ...values, cnpj: onlyDigits(values.cnpj) };
      const { error } = await supabase.from('fornecedores').insert(payload);
      if (error) throw error;
      router.push('/dashboard/fornecedores');
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar o fornecedor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel>
        <Text variant="h2" weight="semibold">
          Cadastrar Fornecedor
        </Text>
      </Panel>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Text variant="body-sm" weight="semibold">
              Nome
            </Text>
            <input
              {...register('nome')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.nome && (
              <Text variant="caption" color="danger">
                {errors.nome.message}
              </Text>
            )}
          </div>

          <div>
            <Text variant="body-sm" weight="semibold">
              CNPJ
            </Text>
            <input
              {...register('cnpj')}
              onChange={(e) => {
                const masked = maskCNPJ(e.target.value);
                const setter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  'value'
                )?.set;
                setter?.call(e.target, masked);
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.cnpj && (
              <Text variant="caption" color="danger">
                {errors.cnpj.message}
              </Text>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Text variant="body-sm" weight="semibold">
                Email
              </Text>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.email && (
                <Text variant="caption" color="danger">
                  {errors.email.message}
                </Text>
              )}
            </div>
            <div>
              <Text variant="body-sm" weight="semibold">
                Telefone
              </Text>
              <input
                type="tel"
                {...register('telefone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.telefone && (
                <Text variant="caption" color="danger">
                  {errors.telefone.message}
                </Text>
              )}
            </div>
          </div>

          <div>
            <Text variant="body-sm" weight="semibold">
              Endereço
            </Text>
            <textarea
              {...register('endereco')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
            />
            {errors.endereco && (
              <Text variant="caption" color="danger">
                {errors.endereco.message}
              </Text>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
