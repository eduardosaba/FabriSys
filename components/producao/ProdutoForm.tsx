'use client'; // <--- OBRIGATÓRIO: 1ª LINHA DO ARQUIVO

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Upload, AlertCircle, Save, Plus } from 'lucide-react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { produtoFinalSchema } from '@/lib/validations/producao';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/format';

type ProdutoFormData = z.infer<typeof produtoFinalSchema>;

interface ProdutoFormProps {
  produto?: ProdutoFinal;
  onSuccess?: () => void;
}

export default function ProdutoForm({ produto, onSuccess }: ProdutoFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(produto?.imagem_url || null);
  const [precoDisplay, setPrecoDisplay] = useState<string>('');

  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string }>>([]);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [newCategoriaName, setNewCategoriaName] = useState('');

  // Configuração do Formulário
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoFinalSchema) as unknown as any,
    mode: 'onSubmit',
    defaultValues: {
      ativo: true,
      tipo: 'final',
      peso_unitario: 0,
      preco_venda: 0,
      nome: '',
      codigo_interno: '',
      descricao: '',
    },
  });

  const tipoValue = watch('tipo');
  const showPrice = tipoValue !== 'semi_acabado';

  // --- CARREGAR DADOS NA EDIÇÃO ---
  useEffect(() => {
    if (produto) {
      // Converte o objeto do banco para o formato do formulário
      const dadosFormulario: ProdutoFormData = {
        nome: produto.nome || '',
        preco_venda: Number(produto.preco_venda || 0),
        peso_unitario: Number((produto as any)?.peso_unitario || 0),
        tipo: produto.tipo === 'semi_acabado' ? 'semi_acabado' : 'final',
        ativo: produto.ativo !== false, // Padrão true se undefined
        categoria_id: (produto as any)?.categoria_id
          ? Number((produto as any).categoria_id)
          : undefined,
        codigo_interno: produto.codigo_interno || '',
        descricao: produto.descricao || null,
        imagem_url: (produto as any)?.imagem_url ? String((produto as any).imagem_url) : null,
      };

      // Reseta o formulário com os dados do banco
      reset(dadosFormulario);

      // Atualiza estados visuais
      setImagePreview(produto.imagem_url || null);
      if (produto.preco_venda) {
        setPrecoDisplay(formatCurrency(produto.preco_venda));
      }
    }
  }, [produto, reset]);

  // --- BUSCAR CATEGORIAS ---
  const fetchCategorias = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('organization_id', profile.organization_id)
      .order('nome');

    if (data) {
      setCategorias(data.map((c: any) => ({ ...c, id: Number(c.id) })));
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  // --- HANDLERS ---
  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `produtos/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('produtos').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
      setValue('imagem_url', data.publicUrl);
      setImagePreview(data.publicUrl);
      toast({ title: 'Imagem carregada', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao enviar imagem', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategoria = async () => {
    if (!newCategoriaName.trim() || !profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([
          {
            nome: newCategoriaName,
            organization_id: profile.organization_id,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      await fetchCategorias();
      setValue('categoria_id', Number(data.id));
      setIsCategoriaModalOpen(false);
      setNewCategoriaName('');
      toast({ title: 'Categoria criada!', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao criar categoria', variant: 'error' });
    }
  };

  // --- SUBMIT ---
  const onSubmit = async (data: ProdutoFormData) => {
    try {
      // Preparar payload para o banco
      const payload = {
        nome: data.nome,
        tipo: data.tipo,
        ativo: data.ativo,
        preco_venda: data.tipo === 'semi_acabado' ? 0 : Number(data.preco_venda || 0),
        peso_unitario: Number(data.peso_unitario || 0),
        // Converter strings vazias para null
        codigo_interno: data.codigo_interno || null,
        descricao: data.descricao || null,
        imagem_url: data.imagem_url || null,
        categoria_id: data.categoria_id ? Number(data.categoria_id) : null,
        // Auditoria
        organization_id: profile?.organization_id,
      };

      // Verifica auditoria
      if (!payload.organization_id)
        throw new Error('Organização não identificada. Recarregue a página.');

      let error;
      if (produto?.id) {
        // UPDATE
        const res = await supabase.from('produtos_finais').update(payload).eq('id', produto.id);
        error = res.error;
      } else {
        // INSERT (Adiciona created_by apenas no insert)
        const res = await supabase
          .from('produtos_finais')
          .insert({ ...payload, created_by: user?.id });
        error = res.error;
      }

      if (error) throw error;

      toast({ title: produto ? 'Produto atualizado!' : 'Produto criado!', variant: 'success' });

      if (onSuccess) onSuccess();
      else router.push('/dashboard/producao/produtos');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Erro desconhecido';
      // Erro comum de RLS
      if (msg.includes('row-level security')) {
        toast({
          title: 'Sem permissão',
          description: 'Você não tem permissão para editar este produto.',
          variant: 'error',
        });
      } else {
        toast({ title: 'Erro ao salvar', description: msg, variant: 'error' });
      }
    }
  };

  // Callback de erro do formulário (Para debug visual)
  const onError = (errors: any) => {
    const camposComErro = Object.keys(errors).map((key) => {
      // Tradução simples dos campos para o usuário
      const map: Record<string, string> = {
        nome: 'Nome',
        peso_unitario: 'Peso Unitário',
        preco_venda: 'Preço de Venda',
        tipo: 'Tipo',
        categoria_id: 'Categoria',
      };
      return map[key] || key;
    });

    toast({
      title: 'Verifique os dados',
      description: `Corrija os campos: ${camposComErro.join(', ')}`,
      variant: 'error',
    });
    console.log('Erros de validação:', errors);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit as any, onError)}
      className="space-y-6 animate-in fade-in"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NOME */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Nome do Produto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('nome')}
            className={`w-full rounded-lg border p-2.5 outline-none focus:ring-2 ${errors.nome ? 'border-red-500 ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'}`}
            placeholder="Ex: Coxinha de Frango"
          />
        </div>

        {/* TIPO */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            {...register('tipo')}
            className="w-full rounded-lg border border-gray-300 p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="final">Produto Final (Venda)</option>
            <option value="semi_acabado">Semi-Acabado (Insumo)</option>
          </select>
        </div>

        {/* CÓDIGO */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código Interno</label>
          <input
            type="text"
            {...register('codigo_interno')}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* PREÇO (Só mostra se for Final) */}
        {showPrice && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Preço de Venda <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={precoDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const val = raw ? Number(raw) / 100 : 0;
                setPrecoDisplay(raw ? formatCurrency(val) : '');
                setValue('preco_venda', val);
              }}
              className={`w-full rounded-lg border p-2.5 outline-none focus:ring-2 ${errors.preco_venda ? 'border-red-500' : 'border-gray-300 focus:ring-blue-100'}`}
              placeholder="R$ 0,00"
            />
            {errors.preco_venda && (
              <span className="text-xs text-red-500">Informe um valor válido</span>
            )}
          </div>
        )}

        {/* PESO UNITÁRIO */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Peso Unitário (gramas) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              {...register('peso_unitario', { valueAsNumber: true })}
              className={`w-full rounded-lg border p-2.5 pr-8 outline-none focus:ring-2 ${errors.peso_unitario ? 'border-red-500' : 'border-gray-300 focus:ring-blue-100'}`}
              placeholder="Ex: 120"
            />
            <span className="absolute right-3 top-2.5 text-gray-400 text-sm font-bold">g</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Essencial para calcular a produção.</p>
        </div>

        {/* CATEGORIA */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <div className="flex gap-2">
            <select
              {...register('categoria_id')}
              className="flex-1 rounded-lg border border-gray-300 p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setNewCategoriaName('');
                setIsCategoriaModalOpen(true);
              }}
              className="px-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
              title="Nova Categoria"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* DESCRIÇÃO */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            {...register('descricao')}
            rows={3}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* STATUS */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilidade</label>
          <select
            {...register('ativo')}
            // Converte string "true"/"false" para boolean
            onChange={(e) => setValue('ativo', e.target.value === 'true')}
            className="w-full rounded-lg border border-gray-300 p-2.5 bg-white outline-none"
          >
            <option value="true">Ativo (Em linha)</option>
            <option value="false">Inativo (Arquivado)</option>
          </select>
        </div>

        {/* IMAGEM */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Produto</label>
          <div className="flex items-center gap-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                <Upload size={24} />
              </div>
            )}
            <div>
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}
              >
                {uploading ? (
                  'Enviando...'
                ) : (
                  <>
                    <Upload size={16} /> Selecionar Foto
                  </>
                )}
              </label>
              <p className="text-xs text-gray-500 mt-1">JPG ou PNG até 2MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} className="px-6" icon={Save}>
          {produto ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </Button>
      </div>

      {/* MODAL CATEGORIA */}
      <Modal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        title="Nova Categoria"
      >
        <div className="p-4 space-y-4">
          <input
            autoFocus
            className="w-full border p-2 rounded"
            placeholder="Nome da categoria"
            value={newCategoriaName}
            onChange={(e) => setNewCategoriaName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCategoriaModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategoria}>Criar</Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
