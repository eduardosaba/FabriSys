import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { Insumo as InsumoType } from '@/lib/types/insumos';

/**
 * Cria um insumo virtual a partir de um produto semi-acabado
 * Isso permite que produtos semi-acabados sejam usados como insumos em outras receitas
 */
export async function criarInsumoVirtual(
  produtoSemiAcabado: ProdutoFinal
): Promise<InsumoType | null> {
  try {
    // Verificar se já existe um insumo virtual para este produto
    const resExist = await supabase
      .from('insumos')
      .select('*')
      .eq('produto_final_id', produtoSemiAcabado.id)
      .eq('tipo_insumo', 'virtual')
      .single();

    if (resExist?.data) {
      return resExist.data as InsumoType;
    }

    // Criar novo insumo virtual
    const resInsert = await supabase
      .from('insumos')
      .insert({
        nome: `${produtoSemiAcabado.nome} (Semi-Acabado)`,
        unidade_medida: 'kg', // Semi-acabados geralmente são pesados
        unidade_estoque: 'KG',
        unidade_consumo: 'kg',
        fator_conversao: 1, // 1 KG = 1 KG
        estoque_minimo_alerta: 0,
        categoria_id: 'categoria_default', // TODO: criar categoria específica
        produto_final_id: produtoSemiAcabado.id,
        tipo_insumo: 'virtual',
      })
      .select()
      .single();

    if (resInsert?.error && (resInsert.error as { message?: string }).message)
      throw new Error((resInsert.error as { message?: string }).message as string);

    return resInsert?.data as InsumoType;
  } catch (error) {
    console.error('Erro ao criar insumo virtual:', error);
    return null;
  }
}

/**
 * Atualiza o custo de um insumo virtual baseado no custo do produto semi-acabado
 */
export async function atualizarCustoInsumoVirtual(
  produtoSemiAcabado: ProdutoFinal,
  custoUnitarioReal: number
): Promise<void> {
  try {
    const res = await supabase
      .from('insumos')
      .update({
        custo_por_ue: custoUnitarioReal,
        ultimo_valor: custoUnitarioReal,
      })
      .eq('produto_final_id', produtoSemiAcabado.id)
      .eq('tipo_insumo', 'virtual');
    if (res?.error && (res.error as { message?: string }).message)
      throw new Error((res.error as { message?: string }).message as string);
  } catch (error) {
    console.error('Erro ao atualizar custo do insumo virtual:', error);
  }
}

/**
 * Busca produtos semi-acabados disponíveis para uso como insumos
 */
export async function buscarProdutosSemiAcabados(): Promise<ProdutoFinal[]> {
  try {
    const res = await supabase
      .from('produtos_finais')
      .select('*')
      .eq('tipo', 'semi_acabado')
      .eq('ativo', true)
      .order('nome');

    if (res?.error && (res.error as { message?: string }).message)
      throw new Error((res.error as { message?: string }).message as string);

    return (res?.data as ProdutoFinal[]) || [];
  } catch (error) {
    console.error('Erro ao buscar produtos semi-acabados:', error);
    return [];
  }
}

/**
 * Verifica se um produto semi-acabado tem estoque disponível
 */
export async function verificarEstoqueSemiAcabado(produtoId: string): Promise<number> {
  try {
    // Buscar o insumo virtual correspondente
    const resInsumo = await supabase
      .from('insumos')
      .select('id')
      .eq('produto_final_id', produtoId)
      .eq('tipo_insumo', 'virtual')
      .single();

    const insumo = resInsumo?.data as { id?: string } | null;
    if (!insumo || !insumo.id) return 0;

    // Calcular estoque disponível baseado em lotes
    const resLotes = await supabase
      .from('lotes_insumos')
      .select('quantidade_restante')
      .eq('insumo_id', insumo.id);

    const lotes = (resLotes?.data as Array<{ quantidade_restante: number }>) || [];

    if (lotes.length === 0) return 0;

    return lotes.reduce((total, lote) => total + (lote.quantidade_restante ?? 0), 0);
  } catch (error) {
    console.error('Erro ao verificar estoque do semi-acabado:', error);
    return 0;
  }
}
