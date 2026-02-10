'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { produtoFinalSchema } from '@/lib/validations/producao';
import { useAuth } from '@/lib/auth';

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
  const { user, profile, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(produto?.imagem_url || null);
  const [precoDisplay, setPrecoDisplay] = useState<string>(
    produto?.preco_venda ? formatCurrency(produto.preco_venda) : ''
  );
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string }>>([]);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [newCategoriaName, setNewCategoriaName] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoFinalSchema) as Resolver<ProdutoFormData>,
    defaultValues: produto || {
      ativo: true,
      imagem_url: null,
      codigo_interno: null,
      descricao: null,
      tipo: 'final',
      peso_unitario: 0,
    },
  });

  // Atualizar precoDisplay quando produto muda
  useEffect(() => {
    if (produto?.preco_venda) {
      setPrecoDisplay(formatCurrency(produto.preco_venda ?? 0));
    }
  }, [produto?.preco_venda]);

  // Reset form values when `produto` changes (edit mode)
  useEffect(() => {
    if (!produto || !produto.id) return;
    const prodRec = produto as unknown as Record<string, unknown>;
    setValue('nome', (prodRec['nome'] as string) ?? '');
    setValue('preco_venda', (prodRec['preco_venda'] as number) ?? 0);
    setValue('imagem_url', (prodRec['imagem_url'] as string) ?? null);
    setValue('codigo_interno', (prodRec['codigo_interno'] as string) ?? null);
    setValue('descricao', (prodRec['descricao'] as string) ?? null);
    setValue('ativo', (prodRec['ativo'] as boolean) ?? true);
    const tipoVal = prodRec['tipo'];
    if (tipoVal === 'final' || tipoVal === 'semi_acabado') {
      setValue('tipo', tipoVal as any);
    } else {
      setValue('tipo', 'final');
    }

    if ('categoria_id' in prodRec) {
      const cat = prodRec['categoria_id'];
      setValue('categoria_id', cat != null ? Number(cat) : null);
    }
    if ('peso_unitario' in prodRec) {
      setValue('peso_unitario', Number(prodRec['peso_unitario'] ?? 0));
    }

    setImagePreview((prodRec['imagem_url'] as string) ?? null);
  }, [produto, setValue, setImagePreview]);

  // Carregar categorias quando organization_id estiver disponível
  const fetchCategorias = useCallback(async (orgId?: string | number) => {
    if (!orgId) return [] as Array<{ id: number; nome: string }>;
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('organization_id', orgId)
      .order('nome');
    if (error) throw error;
    return ((data as { id: number | string; nome: string }[] | null) || []).map((r) => ({
      ...r,
      id: Number(r.id),
    })) as Array<{ id: number; nome: string }>;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (authLoading) return;

    if (!profile?.organization_id) {
      setCategorias([]);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const list = await fetchCategorias(profile.organization_id);
          if (mounted) setCategorias(list);
        } catch (err) {
          console.error('Erro ao carregar categorias:', err instanceof Error ? err.message : err);
        }
      })();
    }, 10);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [authLoading, profile?.organization_id, fetchCategorias]);

  const openCreateCategoria = () => {
    setNewCategoriaName('');
    setIsCategoriaModalOpen(true);
  };

  const handleCreateCategoria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nome = newCategoriaName?.trim();
    if (!nome) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da categoria',
        variant: 'error',
      });
      return;
    }

    try {
      if (!profile?.organization_id) {
        toast({
          title: 'Organização não encontrada',
          description: 'Não foi possível identificar a organização do usuário',
          variant: 'error',
        });
        return;
      }
      // Verificar se já existe categoria com mesmo nome (case-insensitive)
      const { data: existing, error: existingError } = await supabase
        .from('categorias')
        .select('id, nome')
        .ilike('nome', nome)
        .eq('organization_id', profile.organization_id)
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        // Selecionar existente e fechar modal
        setValue('categoria_id', Number(existing[0].id));
        setIsCategoriaModalOpen(false);
        toast({
          title: 'Categoria existente',
          description: 'Categoria já existe e foi selecionada',
          variant: 'info',
        });
        // Atualizar lista local por segurança
        const updated = await supabase
          .from('categorias')
          .select('id, nome')
          .eq('organization_id', profile.organization_id)
          .order('nome');
        if (!updated.error) {
          const normalized = (
            (updated.data as { id: number | string; nome: string }[] | null) || []
          ).map((r) => ({ ...r, id: Number(r.id) }));
          setCategorias(normalized);
        }
        return;
      }

      // Inserir nova categoria (anexa organization_id/created_by para respeitar RLS)
      const { data, error } = await supabase
        .from('categorias')
        .insert([{ nome, organization_id: profile.organization_id, created_by: profile.id }])
        .select()
        .limit(1);
      if (error) {
        // Se houver conflito de unicidade, tentar buscar novamente e selecionar existente
        console.error('Erro ao inserir categoria, tentando buscar existente:', error);
        const retry = await supabase
          .from('categorias')
          .select('id, nome')
          .ilike('nome', nome)
          .eq('organization_id', profile.organization_id)
          .limit(1);
        if (!retry.error && retry.data && retry.data.length > 0) {
          setValue('categoria_id', Number((retry.data as { id: number | string }[])[0].id));
          setIsCategoriaModalOpen(false);
          toast({
            title: 'Categoria existente',
            description: 'Categoria já existe e foi selecionada',
            variant: 'info',
          });
          const updated = await supabase
            .from('categorias')
            .select('id, nome')
            .eq('organization_id', profile.organization_id)
            .order('nome');
          if (!updated.error)
            setCategorias(
              ((updated.data as { id: number | string; nome: string }[] | null) || []).map((r) => ({
                ...r,
                id: Number(r.id),
              }))
            );
          return;
        }
        throw error;
      }

      const created = ((data as { id?: number | string }[]) || [])[0];
      // atualizar lista local e selecionar a nova categoria
      const updated = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('organization_id', profile.organization_id)
        .order('nome');
      if (updated.error) throw updated.error;
      const list = ((updated.data as { id: number | string; nome: string }[]) || []).map((r) => ({
        ...r,
        id: Number(r.id),
      }));
      setCategorias(list);
      if (created?.id) {
        setValue('categoria_id', Number(created.id));
      }

      setIsCategoriaModalOpen(false);
      toast({
        title: 'Categoria criada',
        description: 'Categoria adicionada com sucesso',
        variant: 'success',
      });
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      toast({ title: 'Erro', description: 'Não foi possível criar a categoria', variant: 'error' });
    }
  };

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

  // Normaliza dados antes de enviar ao servidor (converte categoria_id para number/null)
  const normalizeForInsert = (data: ProdutoFormData) => {
    const base = cleanData(data) as unknown as Record<string, unknown>;
    // Quando não houver categoria, removemos a chave para evitar enviar colunas
    // inexistentes ao PostgREST (evita erro PGRST204 se a coluna não existir).
    if (base.categoria_id === '' || base.categoria_id === null || base.categoria_id === undefined) {
      delete base.categoria_id;
    } else {
      // pode vir como string (do select) ou number
      const parsed = Number(base.categoria_id as string | number);
      if (Number.isNaN(parsed)) {
        delete base.categoria_id;
      } else {
        base.categoria_id = parsed;
      }
    }
    return base as ProdutoFormData;
  };

  const onSubmit = async (data: ProdutoFormData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== DEBUG PRODUTO FORM SUBMIT ===');
      console.log('Data recebida:', data);
      console.log('Produto existente:', produto);
      console.log('Usuário autenticado:', user);
      console.log('Perfil do usuário:', profile);
    }

    // Validar todos os campos antes de tentar salvar
    const isValid = await trigger();
    if (process.env.NODE_ENV === 'development') {
      console.log('Formulário válido:', isValid);
      console.log('Erros de validação:', errors);
    }

    if (!isValid) {
      const errorMessages = Object.values(errors)
        .map((error) => error?.message)
        .filter(Boolean)
        .join('. ');

      toast({
        title: 'Dados obrigatórios faltando',
        description: errorMessages || 'Por favor, corrija os erros no formulário.',
        variant: 'error',
      });
      return;
    }

    const cleanedData = normalizeForInsert(data);
    if (process.env.NODE_ENV === 'development') console.log('Dados limpos:', cleanedData);

    try {
      if (process.env.NODE_ENV === 'development') console.log('Tentando salvar produto...');

      if (produto) {
        if (process.env.NODE_ENV === 'development')
          console.log('Fazendo UPDATE do produto ID:', produto.id);
        const { error } = await supabase
          .from('produtos_finais')
          .update(cleanedData)
          .eq('id', produto.id);

        if (error) {
          console.error('Erro no UPDATE:', error);
          // Se o erro indicar coluna inexistente (ex: categoria_id), tentar remover e reenviar
          if (
            (error as any)?.code === 'PGRST204' ||
            (typeof (error as any)?.message === 'string' &&
              String((error as any).message).includes("Could not find the 'categoria_id'"))
          ) {
            const safeData = { ...cleanedData } as Record<string, unknown>;
            delete safeData.categoria_id;
            const { error: retryErr } = await supabase
              .from('produtos_finais')
              .update(safeData)
              .eq('id', produto.id);
            if (retryErr) {
              console.error('Erro no UPDATE (retry):', retryErr);
              throw retryErr;
            }
          } else {
            throw error;
          }
        }

        console.log('UPDATE realizado com sucesso!');
        toast({
          title: 'Produto atualizado',
          description: 'As alterações foram salvas com sucesso.',
          variant: 'success',
        });
      } else {
        console.log('Fazendo INSERT de novo produto');
        // Inserção: data já contém valores transformados (strings vazias -> null)
        let insertError = null;
        try {
          const { error } = await supabase.from('produtos_finais').insert(cleanedData);
          if (error) insertError = error;
        } catch (err) {
          insertError = err as Record<string, unknown>;
        }

        if (insertError) {
          console.error('Erro no INSERT:', insertError);
          // Se o erro indicar que a coluna categoria_id não existe no schema,
          // tentar reenviar sem o campo e avisar o usuário.
          const msg = String((insertError as any)?.message || '');
          const code = (insertError as any)?.code;
          if (code === 'PGRST204' || msg.includes("Could not find the 'categoria_id'")) {
            const safeData = { ...(cleanedData as Record<string, unknown>) };
            delete safeData.categoria_id;
            const { error: retryError } = await supabase.from('produtos_finais').insert(safeData);
            if (retryError) {
              console.error('Erro no INSERT (retry):', retryError);
              throw retryError;
            }
          }
          throw insertError as unknown as Error;
        }

        console.log('INSERT realizado com sucesso!');
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
      console.error(
        'Erro ao salvar produto:',
        error instanceof Error ? error.message : String(error)
      );

      let errorMessage = 'Ocorreu um erro ao salvar o produto.';

      if (error && typeof error === 'object' && error !== null) {
        const errObj = error as Record<string, unknown>;
        if (String(errObj['code']) === '42501') {
          errorMessage =
            'Você não tem permissão para criar produtos. Faça login com uma conta de administrador.';
        } else if (
          typeof errObj['message'] === 'string' &&
          String(errObj['message']).includes('violates row-level security policy')
        ) {
          errorMessage =
            'Você não tem permissão para editar produtos. Faça login com uma conta de administrador.';
        }
      }

      console.error('Mensagem de erro final:', errorMessage);

      toast({ title: 'Erro ao salvar', description: errorMessage, variant: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Campos obrigatórios:</span> Nome e Preço de venda são
          obrigatórios.
          <span className="ml-1 text-red-500">*</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
            <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
              <span>⚠️</span> {errors.nome.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Produto <span className="text-red-500">*</span>
          </label>
          <select
            {...register('tipo')}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.tipo ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
          >
            <option value="final">Produto Final (vendido ao cliente)</option>
            <option value="semi_acabado">Produto Semi-Acabado (massa, intermediário)</option>
          </select>
          {errors.tipo && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
              <span>⚠️</span> {errors.tipo.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Produtos semi-acabados podem ser usados como insumos em outras receitas
          </p>
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
            <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
              <span>⚠️</span> {errors.preco_venda.message}
            </p>
          )}
        </div>
        {/* --- BLOCO DO PESO UNITÁRIO (NOVO) --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Peso Unitário (Gramas) <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="number"
              step="0.01"
              {...register('peso_unitario', { valueAsNumber: true })}
              className={`block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm
        ${errors.peso_unitario ? 'border-red-300' : ''}`}
              placeholder="Ex: 20"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm font-bold">g</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Peso individual do produto final. Usado para calcular a massa total.
          </p>
          {errors.peso_unitario && (
            <p className="mt-1 text-sm text-red-600">{errors.peso_unitario.message}</p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <div className="flex items-center gap-2">
            <select
              {...register('categoria_id')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              defaultValue={
                produto
                  ? String((produto as unknown as Record<string, unknown>)['categoria_id'] ?? '')
                  : ''
              }
            >
              <option value="">-- Sem categoria --</option>
              {categorias.map((c, idx) => (
                <option key={String(c.id ?? `cat-${idx}`)} value={String(c.id ?? '')}>
                  {c.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={openCreateCategoria}
              className="mt-1 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              aria-label="Criar nova categoria"
              title="Criar nova categoria"
            >
              Novo
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Imagem do Produto</label>

          <div className="mt-2 flex items-center gap-4">
            {imagePreview ? (
              <div className="relative h-32 w-32">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={128}
                  height={128}
                  className="rounded-lg object-cover"
                  onError={() => {
                    // fallback: limpar preview para mostrar placeholder
                    setImagePreview(null);
                  }}
                />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100">
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
                id="imagem-upload"
                disabled={uploading}
              />
              <label
                htmlFor="imagem-upload"
                className={`inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
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
          disabled={Object.keys(errors).length > 0}
          className={Object.keys(errors).length > 0 ? 'cursor-not-allowed opacity-50' : ''}
        >
          {produto ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </Button>
      </div>

      <Modal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        title="Nova Categoria"
      >
        <div className="space-y-4 p-4">
          <div>
            <label
              htmlFor="nova-categoria"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nome da Categoria
            </label>
            <input
              id="nova-categoria"
              type="text"
              value={newCategoriaName}
              onChange={(e) => setNewCategoriaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateCategoria();
                }
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-base"
              placeholder="Ex: Panificação"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCategoriaModalOpen(false);
                setNewCategoriaName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateCategoria()}
              disabled={!newCategoriaName.trim()}
            >
              Criar
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
