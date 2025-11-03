'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { type Fornecedor } from '@/lib/types/fornecedores';
import { maskCNPJ, onlyDigits, formatCNPJ } from '@/lib/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Toaster, toast } from 'react-hot-toast';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
// import StatusIcon from '@/components/ui/StatusIcon';

const fornecedorSchema = z.object({
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

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
  });

  useEffect(() => {
    void fetchFornecedores();
  }, []);

  useEffect(() => {
    if (editingFornecedor) {
      reset({
        nome: editingFornecedor.nome,
        cnpj: editingFornecedor.cnpj ?? '',
        email: editingFornecedor.email ?? undefined,
        telefone: editingFornecedor.telefone ?? undefined,
        endereco: editingFornecedor.endereco ?? undefined,
      });
    } else {
      reset({});
    }
  }, [editingFornecedor, reset]);

  async function fetchFornecedores() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('fornecedores').select('*').order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(values: FornecedorFormData) {
    try {
      setSaving(true);
      const payload = {
        ...values,
        cnpj: onlyDigits(values.cnpj || ''),
      };
      let error;

      if (editingFornecedor) {
        const result = await supabase
          .from('fornecedores')
          .update(payload)
          .eq('id', editingFornecedor.id);
        error = result.error;

        if (!error) {
          toast.success('Fornecedor atualizado com sucesso!');
        }
      } else {
        const result = await supabase.from('fornecedores').insert(payload);
        error = result.error;

        if (!error) {
          toast.success('Fornecedor cadastrado com sucesso!');
        }
      }

      if (error) throw error;

      await fetchFornecedores();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        toast.error('Já existe um fornecedor com este CNPJ.');
      } else {
        toast.error('Não foi possível salvar o fornecedor. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fornecedor: Fornecedor) {
    try {
      setSaving(true);
      const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedor.id);

      if (error) throw error;

      toast.success('Fornecedor excluído com sucesso!');
      await fetchFornecedores();
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === '23503') {
        toast.error(
          'Este fornecedor não pode ser excluído pois está vinculado a um ou mais lotes.'
        );
      } else {
        toast.error('Não foi possível excluir o fornecedor. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (!saving) {
      setIsModalOpen(false);
      setEditingFornecedor(null);
    }
  }

  return (
    <>
      <div className="mb-6 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gestão de Fornecedores
        </h1>
        <div className="mt-3 sm:mt-0">
          <Button
            onClick={() => {
              setEditingFornecedor(null);
              reset({});
              setIsModalOpen(true);
            }}
          >
            Adicionar Fornecedor
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white dark:border-t-transparent"></div>
            <span className="text-gray-700 dark:text-gray-300">Carregando...</span>
          </div>
        </div>
      ) : fornecedores.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum fornecedor cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique no botão acima para adicionar um novo fornecedor
          </p>
        </div>
      ) : (
        <Card variant="default">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fornecedor.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCNPJ(fornecedor.cnpj)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fornecedor.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fornecedor.telefone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="secondary"
                        className="mr-2"
                        onClick={() => {
                          setEditingFornecedor(fornecedor);
                          setIsModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="primary" onClick={() => handleDelete(fornecedor)}>
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Toaster position="top-right" />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form onSubmit={handleSubmit((data) => handleSave(data))} className="space-y-4">
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

          <div className="mt-5 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
