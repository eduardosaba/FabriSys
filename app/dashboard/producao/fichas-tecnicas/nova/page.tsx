'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { FichaTecnicaEditor } from '@/components/producao/FichaTecnicaEditor';
import type { InsumoFicha } from '@/lib/types/ficha-tecnica';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Package, FileText, Info } from 'lucide-react';

function getErrorMessage(err: unknown) {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default function NovaFichaTecnicaPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<
    Array<{ id: string; nome: string; preco_venda: number }>
  >([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');

  // Carregar produtos sem ficha técnica
  useEffect(() => {
    async function carregarProdutos() {
      setLoading(true);
      try {
        // Buscar todos os produtos finais
        const { data: todosProdutos, error: produtosError } = await supabase
          .from('produtos_finais')
          .select('id, nome, preco_venda')
          .eq('ativo', true)
          .order('nome');

        if (produtosError) throw produtosError;

        // Buscar produtos que já têm ficha técnica ativa
        const { data: fichasExistentes, error: fichasError } = await supabase
          .from('fichas_tecnicas')
          .select('produto_final_id')
          .eq('ativo', true);

        if (fichasError) throw fichasError;

        // Filtrar produtos que ainda não têm ficha técnica
        const idsComFicha = new Set(
          (fichasExistentes ?? []).map((f) =>
            String((f as { produto_final_id?: string }).produto_final_id || '')
          )
        );
        const produtosSemFicha = (todosProdutos ?? []).filter(
          (p: { id: string }) => !idsComFicha.has(String(p.id))
        );

        setProdutos(produtosSemFicha);
      } catch (error: unknown) {
        console.error('Erro ao carregar produtos:', getErrorMessage(error));
        toast({
          title: 'Erro ao carregar produtos disponíveis',
          description: getErrorMessage(error),
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    }

    void carregarProdutos();
  }, [toast]);

  const handleSave = async (insumos: InsumoFicha[], precoVenda: number, rendimento: number) => {
    if (!produtoSelecionado) {
      toast({ title: 'Selecione um produto para criar a ficha técnica', variant: 'warning' });
      return;
    }

    try {
      // Verificar usuário e role
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('👤 Usuário:', user?.id);
      console.log('🎭 Role do JWT:', session?.user?.user_metadata?.role);
      console.log('📧 Email:', user?.email);
      console.log('🍰 Rendimento:', rendimento, 'unidades');

      // Gerar nome da ficha técnica: FT + nome do produto
      const nomeFichaTecnica = produtoAtual ? `FT ${produtoAtual.nome}` : '';
      // Gerar slug do nome
      function slugify(str: string) {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove acentos
          .replace(/[^a-z0-9]+/g, '-') // troca por hífen
          .replace(/^-+|-+$/g, '') // remove hífens do início/fim
          .replace(/-+/g, '-'); // hífens únicos
      }
      const slugFichaTecnicaBase = nomeFichaTecnica ? slugify(nomeFichaTecnica) : '';

      // Garantir slug único (para evitar 23505 duplicate key)
      async function ensureUniqueSlug(base: string) {
        if (!base) return base;
        let candidate = base;
        let i = 1;
        while (true) {
          const { data: existing, error: existErr } = await supabase
            .from('fichas_tecnicas')
            .select('id')
            .eq('slug', candidate)
            .limit(1);
          if (existErr) {
            console.error('Erro ao verificar slug existente:', existErr);
            return candidate;
          }
          if (!existing || existing.length === 0) return candidate;
          candidate = `${base}-${i}`;
          i += 1;
        }
      }

      const slugFichaTecnica = await ensureUniqueSlug(slugFichaTecnicaBase);

      // Inserir nova ficha técnica
      const novaFichaTecnica = insumos
        .filter((insumo) => insumo.insumoId) // Apenas insumos com ID válido
        .map((insumo, index) => ({
          produto_final_id: produtoSelecionado,
          insumo_id: insumo.insumoId,
          quantidade: insumo.quantidade,
          unidade_medida: insumo.unidadeMedida,
          perda_padrao: insumo.perdaPadrao,
          rendimento_unidades: rendimento,
          ordem_producao: index + 1,
          versao: 1,
          ativo: true,
          created_by: user?.id,
          nome: nomeFichaTecnica,
          slug: slugFichaTecnica,
        }));

      console.log('🔍 Dados a serem inseridos:', novaFichaTecnica);
      console.log('📦 Total de insumos:', novaFichaTecnica.length);
      console.log('📋 Detalhes dos insumos:', JSON.stringify(novaFichaTecnica, null, 2));

      console.log('Enviando dados para API server-side de criação de ficha');
      try {
        const res = await fetch('/api/fichas-tecnicas/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produto_final_id: produtoSelecionado,
            insumos: insumos, // enviar os insumos do editor (form)
            nome: nomeFichaTecnica,
            preco_venda: precoVenda,
            rendimento,
            slug_base: slugFichaTecnica,
            // garantir que o server grave auditoria/tenant para RLS
            created_by: profile?.id || null,
            organization_id: profile?.organization_id || null,
          }),
        });

        const payload = (await res.json()) as { data?: unknown; error?: string | null };
        if (!res.ok) {
          console.error('Erro do servidor ao criar ficha:', payload);
          throw new Error(payload?.error || 'Erro ao criar ficha (server)');
        }

        console.log('✅ Fichas criadas (server):', payload.data);
      } catch (err: unknown) {
        console.error('❌ Erro ao criar ficha via API server-side:', getErrorMessage(err));
        throw err;
      }

      // Atualizar preço de venda do produto
      console.log('Antes do update do preço');
      const { error: updateError } = await supabase
        .from('produtos_finais')
        .update({ preco_venda: precoVenda })
        .eq('id', produtoSelecionado);
      console.log('Depois do update do preço', { updateError });

      if (updateError) {
        console.error('❌ Erro ao atualizar preço:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      toast({ title: 'Ficha técnica criada com sucesso!', variant: 'success' });
      console.log('Antes do router.push');
      router.push('/dashboard/producao/fichas-tecnicas');
      console.log('Depois do router.push');
    } catch (error: unknown) {
      console.error('❌ Erro ao criar ficha técnica:', getErrorMessage(error));
      toast({
        title: 'Erro ao criar ficha técnica',
        description: getErrorMessage(error),
        variant: 'error',
      });
    }
  };

  const produtoAtual = produtos.find((p) => p.id === produtoSelecionado);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => router.push('/dashboard/producao/fichas-tecnicas')}
            className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft size={20} />
            <span>Voltar para Fichas Técnicas</span>
          </button>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center shadow-lg dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Package size={40} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Nenhum Produto Disponível
            </h2>
            <p className="mx-auto mb-8 max-w-md text-lg text-gray-600 dark:text-gray-400">
              Todos os produtos já possuem fichas técnicas ou não há produtos cadastrados.
            </p>
            <button
              onClick={() => router.push('/dashboard/producao/produtos/novo')}
              className="inline-flex transform items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700"
            >
              <Package size={20} />
              Cadastrar Novo Produto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/producao/fichas-tecnicas')}
            className="mb-4 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Voltar para Fichas Técnicas</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Nova Ficha Técnica
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Configure a receita e custos de produção do produto
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de Produto */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <Package size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                Selecione o Produto
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Escolha o produto final para o qual deseja criar a ficha técnica de produção
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Produto Final *
            </label>
            <select
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">-- Selecione um produto --</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - R$ {produto.preco_venda.toFixed(2)}
                </option>
              ))}
            </select>

            {produtoSelecionado && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <Info
                    size={20}
                    className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                  />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Agora adicione os insumos necessários para produzir este produto. O sistema
                    calculará automaticamente o custo de produção e a margem de lucro.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editor de Ficha Técnica */}
        {produtoAtual && (
          <FichaTecnicaEditor
            produtoFinalId={produtoAtual.id}
            nomeProduto={produtoAtual.nome}
            precoVenda={produtoAtual.preco_venda}
            onSave={handleSave}
          />
        )}

        {!produtoAtual && !produtoSelecionado && (
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-8 text-center dark:border-amber-700 dark:from-amber-900/20 dark:to-orange-900/20">
            <Package size={48} className="mx-auto mb-4 text-amber-500 dark:text-amber-400" />
            <p className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-200">
              Selecione um produto acima para começar
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              Configure a receita, insumos e custos de produção
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
