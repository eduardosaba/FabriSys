'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { produtoFinalSchema } from '@/lib/validations/producao';

type ProdutoFormData = z.infer<typeof produtoFinalSchema>;

interface ProdutoFormProps {
  produto?: ProdutoFinal;
  onSuccess?: () => void;
}

// Função para formatar valor em reais brasileiros
const formatCurrency = (value: string | number): string => {
  if (!value) return '';

  // Remove tudo que não é dígito
  const numericValue = String(value).replace(/\D/g, '');

  // Converte para número (centavos)
  const numberValue = parseInt(numericValue, 10) / 100;

  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numberValue);
};

// Função para remover formatação e retornar apenas números
const unformatCurrency = (value: string): number => {
  if (!value) return 0;

  // Remove R$, espaços, pontos e converte vírgula para ponto
  const cleanValue = value
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return parseFloat(cleanValue) || 0;
};

export default function ProdutoForm({ produto, onSuccess }: ProdutoFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(produto?.imagem_url || null);
  const [precoDisplay, setPrecoDisplay] = useState<string>(
    produto?.preco_venda ? formatCurrency(produto.preco_venda) : ''
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm({
    // Temporariamente removendo validação para testar
    // resolver: zodResolver(produtoFinalSchema),
    defaultValues: produto
      ? {
          ...produto,
          descricao: produto.descricao || '',
          codigo_interno: produto.codigo_interno || '',
        }
      : {
          ativo: true,
          imagem_url: null,
          codigo_interno: null,
          descricao: null,
        },
  });

  // Atualizar precoDisplay quando produto muda
  useEffect(() => {
    if (produto?.preco_venda) {
      setPrecoDisplay(formatCurrency(produto.preco_venda));
    }
  }, [produto?.preco_venda]);

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `produtos/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('produtos').getPublicUrl(filePath);

      setValue('imagem_url', publicUrl);
      setImagePreview(publicUrl);

      toast({
        title: 'Imagem enviada',
        description: 'A imagem foi enviada com sucesso.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem.',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  // Função auxiliar para limpar campos vazios
  const cleanData = (data: ProdutoFormData): ProdutoFormData => {
    return {
      ...data,
      imagem_url: data.imagem_url || null,
      codigo_interno: data.codigo_interno || null,
      descricao: data.descricao || null,
      ativo: Boolean(data.ativo),
      // preco_venda já vem tratado da máscara, não alterar
      preco_venda: data.preco_venda,
    };
  };

  const onSubmit = async (data: ProdutoFormData) => {
    console.log('🎯 onSubmit FOI CHAMADA! Dados:', data);
    alert('onSubmit foi chamada! Verifique o console para mais detalhes.');
    alert('onSubmit foi chamada! Verifique o console para mais detalhes.');

    // Validar todos os campos antes de tentar salvar
    const isValid = await trigger();
    console.log('Validação passou:', isValid);

    if (!isValid) {
      const errorMessages = Object.values(errors)
        .map((error) => error?.message)
        .filter(Boolean)
        .join('. ');

      console.log('Mensagens de erro:', errorMessages);

      toast({
        title: 'Dados obrigatórios faltando',
        description: errorMessages || 'Por favor, corrija os erros no formulário.',
        variant: 'error',
      });
      return;
    }

    const cleanedData = cleanData(data);
    const dataToUse = cleanedData;
    console.log('Dados limpos:', dataToUse);

    try {
      if (produto) {
        console.log('=== MODO EDIÇÃO ===');
        console.log('ID do produto:', produto.id);
        console.log('Dados que serão enviados para update:', cleanedData);

        const { error, data: updateResult } = await supabase
          .from('produtos_finais')
          .update(cleanedData)
          .eq('id', produto.id)
          .select();

        if (error) {
          console.error('=== ERRO NO UPDATE ===');
          console.error('Erro retornado pelo Supabase:', error);
          console.error('Código do erro:', error.code);
          console.error('Mensagem do erro:', error.message);
          console.error('Detalhes do erro:', error.details);
          console.error('Dica do erro:', error.hint);
          throw error;
        }

        console.log('=== UPDATE REALIZADO COM SUCESSO ===');
        console.log('Resultado do update:', updateResult);
        toast({
          title: 'Produto atualizado',
          description: 'As alterações foram salvas com sucesso.',
          variant: 'success',
        });

        // Temporário: alert para confirmar que chegou aqui
        alert('✅ Produto atualizado com sucesso! Redirecionando...');
      } else {
        // Inserção: data já contém valores transformados (strings vazias -> null)
        const { error } = await supabase.from('produtos_finais').insert(cleanedData);

        if (error) throw error;

        toast({
          title: 'Produto cadastrado',
          description: 'O novo produto foi cadastrado com sucesso.',
          variant: 'success',
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/producao/produtos');
      }
    } catch (error: unknown) {
      console.error('Erro ao salvar produto:', error);

      let errorMessage = 'Ocorreu um erro ao salvar o produto.';

      if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
        errorMessage =
          'Você não tem permissão para criar produtos. Faça login com uma conta de administrador.';
      } else if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('violates row-level security policy')
      ) {
        errorMessage =
          'Você não tem permissão para criar produtos. Faça login com uma conta de administrador.';
      }

      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'error',
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      onSubmitCapture={() => console.log('📝 FORM SUBMIT CAPTURADO')}
    >
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Campos obrigatórios:</span> Nome e Preço de venda são
          obrigatórios.
          <span className="text-red-500 ml-1">*</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nome do Produto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('nome')}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.nome ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Digite o nome do produto"
          />
          {errors.nome && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.nome.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Código Interno</label>
          <input
            type="text"
            {...register('codigo_interno')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Código interno (opcional)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            {...register('descricao')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Preço de Venda (R$) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={precoDisplay}
            onChange={(e) => {
              const inputValue = e.target.value;
              const numericValue = inputValue.replace(/\D/g, '');

              if (numericValue === '') {
                setPrecoDisplay('');
                setValue('preco_venda', 0);
              } else {
                const formatted = formatCurrency(numericValue);
                setPrecoDisplay(formatted);
                setValue('preco_venda', unformatCurrency(formatted));
              }
            }}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.preco_venda ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="R$ 0,00"
          />
          {errors.preco_venda && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.preco_venda.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            {...register('ativo', {
              setValueAs: (value) => value === 'true' || value === true,
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            defaultValue="true"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Imagem do Produto</label>

          <div className="mt-2 flex items-center gap-4">
            {imagePreview ? (
              <div className="relative h-32 w-32">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  sizes="128px"
                  className="rounded-lg object-cover"
                />
              </div>
            ) : (
              <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
            )}

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                }}
                className="hidden"
                id="imagem"
              />
              <label
                htmlFor="imagem"
                className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? 'Enviando...' : 'Alterar Imagem'}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          // Temporariamente removendo desabilitação por erros
          // disabled={Object.keys(errors).length > 0}
          // className={Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed' : ''}
          onClick={() =>
            console.log('🖱️ BOTÃO SALVAR CLICADO!', {
              errors,
              hasErrors: Object.keys(errors).length > 0,
            })
          }
        >
          {produto ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </Button>
      </div>
    </form>
  );
}
