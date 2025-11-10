'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FichaTecnicaEditor } from '@/components/producao/FichaTecnicaEditor';
import type { InsumoFicha } from '@/lib/types/ficha-tecnica';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Package, FileText, Info } from 'lucide-react';

export default function NovaFichaTecnicaPage() {
  const router = useRouter();
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
        const idsComFicha = new Set(fichasExistentes?.map((f) => f.produto_final_id) || []);
        const produtosSemFicha = todosProdutos?.filter((p) => !idsComFicha.has(p.id)) || [];

        setProdutos(produtosSemFicha);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos disponíveis');
      } finally {
        setLoading(false);
      }
    }

    void carregarProdutos();
  }, []);

  const handleSave = async (insumos: InsumoFicha[], precoVenda: number, rendimento: number) => {
    if (!produtoSelecionado) {
      alert('Selecione um produto para criar a ficha técnica');
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
        }));

      console.log('🔍 Dados a serem inseridos:', novaFichaTecnica);
      console.log('📦 Total de insumos:', novaFichaTecnica.length);
      console.log('📋 Detalhes dos insumos:', JSON.stringify(novaFichaTecnica, null, 2));

      console.log('🚀 Iniciando INSERT na tabela fichas_tecnicas...');

      const { data: insertData, error: insertError } = await supabase
        .from('fichas_tecnicas')
        .insert(novaFichaTecnica)
        .select();

      console.log('📡 Resposta do INSERT:', { data: insertData, error: insertError });

      if (insertError) {
        console.error('❌ Erro detalhado:', insertError);
        console.error('❌ Código:', insertError.code);
        console.error('❌ Mensagem:', insertError.message);
        console.error('❌ Detalhes:', insertError.details);
        console.error('❌ Hint:', insertError.hint);
        throw insertError;
      }

      console.log('✅ Fichas criadas:', insertData);

      // Atualizar preço de venda do produto
      const { error: updateError } = await supabase
        .from('produtos_finais')
        .update({ preco_venda: precoVenda })
        .eq('id', produtoSelecionado);

      if (updateError) {
        console.error('❌ Erro ao atualizar preço:', updateError);
        throw updateError;
      }

      alert('Ficha técnica criada com sucesso!');
      router.push('/dashboard/producao/fichas-tecnicas');
    } catch (error) {
      console.error('❌ Erro ao criar ficha técnica:', error);
      alert(
        `Erro ao criar ficha técnica: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  };

  const produtoAtual = produtos.find((p) => p.id === produtoSelecionado);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <button
            onClick={() => router.push('/dashboard/producao/fichas-tecnicas')}
            className="inline-flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar para Fichas Técnicas</span>
          </button>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-12 rounded-2xl shadow-lg text-center border border-blue-100 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 mb-6">
              <Package size={40} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Nenhum Produto Disponível
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Todos os produtos já possuem fichas técnicas ou não há produtos cadastrados.
            </p>
            <button
              onClick={() => router.push('/dashboard/producao/produtos/novo')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/producao/fichas-tecnicas')}
            className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Voltar para Fichas Técnicas</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Nova Ficha Técnica
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure a receita e custos de produção do produto
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de Produto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Selecione o Produto
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Escolha o produto final para o qual deseja criar a ficha técnica de produção
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Produto Final *
            </label>
            <select
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
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
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info
                    size={20}
                    className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
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
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-8 rounded-2xl text-center border-2 border-dashed border-amber-300 dark:border-amber-700">
            <Package size={48} className="mx-auto text-amber-500 dark:text-amber-400 mb-4" />
            <p className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">
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
