'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FichaTecnicaEditor } from '@/components/producao/FichaTecnicaEditor';
import type { InsumoFicha, FichaTecnicaDB } from '@/lib/types/ficha-tecnica';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function FichaTecnicaPage() {
  const params = useParams();
  const router = useRouter();
  const produtoId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [produto, setProduto] = useState<{
    id: string;
    nome: string;
    preco_venda: number;
  } | null>(null);
  const [fichaTecnicaExistente, setFichaTecnicaExistente] = useState<FichaTecnicaDB[]>([]);

  // Carregar dados do produto e ficha técnica existente
  useEffect(() => {
    async function carregarDados() {
      if (!produtoId) return;

      setLoading(true);
      try {
        // Carregar dados do produto
        const { data: produtoData, error: produtoError } = await supabase
          .from('produtos_finais')
          .select('id, nome, preco_venda')
          .eq('id', produtoId)
          .single();

        if (produtoError) throw produtoError;
        setProduto(produtoData);

        // Carregar ficha técnica existente
        const { data: fichaData, error: fichaError } = await supabase
          .from('fichas_tecnicas')
          .select('*')
          .eq('produto_final_id', produtoId)
          .eq('ativo', true);

        if (!fichaError && fichaData) {
          setFichaTecnicaExistente(fichaData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do produto');
      } finally {
        setLoading(false);
      }
    }

    void carregarDados();
  }, [produtoId]);

  const handleSave = async (insumos: InsumoFicha[], precoVenda: number) => {
    if (!produto) return;

    try {
      // 1. Desativar ficha técnica antiga
      if (fichaTecnicaExistente.length > 0) {
        const { error: deleteError } = await supabase
          .from('fichas_tecnicas')
          .update({ ativo: false })
          .eq('produto_final_id', produto.id);

        if (deleteError) throw deleteError;
      }

      // 2. Inserir nova ficha técnica
      const novaFichaTecnica = insumos
        .filter((insumo) => insumo.insumoId) // Apenas insumos com ID válido
        .map((insumo, index) => ({
          produto_final_id: produto.id,
          insumo_id: insumo.insumoId,
          quantidade: insumo.quantidade,
          unidade_medida: insumo.unidadeMedida,
          perda_padrao: insumo.perdaPadrao,
          rendimento_unidades: 1, // Por padrão
          ordem_producao: index + 1,
          versao:
            fichaTecnicaExistente.length > 0
              ? Math.max(...fichaTecnicaExistente.map((f) => f.versao)) + 1
              : 1,
          ativo: true,
        }));

      const { error: insertError } = await supabase
        .from('fichas_tecnicas')
        .insert(novaFichaTecnica);

      if (insertError) throw insertError;

      // 3. Atualizar preço de venda do produto (se mudou)
      if (precoVenda !== produto.preco_venda) {
        const { error: updateError } = await supabase
          .from('produtos_finais')
          .update({ preco_venda: precoVenda })
          .eq('id', produto.id);

        if (updateError) throw updateError;
      }

      alert('Ficha técnica salva com sucesso!');
      router.push('/dashboard/producao');
    } catch (error) {
      console.error('Erro ao salvar ficha técnica:', error);
      alert('Erro ao salvar ficha técnica. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-red-600">Produto não encontrado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Botão Voltar */}
      <button
        onClick={() => router.push('/dashboard/producao')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft size={20} />
        Voltar para Produção
      </button>

      {/* Editor de Ficha Técnica */}
      <FichaTecnicaEditor
        produtoFinalId={produto.id}
        nomeProduto={produto.nome}
        precoVenda={produto.preco_venda}
        onSave={handleSave}
      />
    </div>
  );
}
