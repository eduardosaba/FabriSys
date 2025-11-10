import { supabase } from '@/lib/supabase';
import { OrdemProducao, InsumoTeorico } from '@/lib/types/producao';

/**
 * Realiza a baixa de estoque baseada nos insumos teóricos calculados
 * Esta função é chamada apenas quando uma OP é finalizada
 */
export async function baixarEstoqueOrdemProducao(
  ordemProducao: OrdemProducao,
  insumosTeoricos: InsumoTeorico[]
): Promise<void> {
  try {
    // Para cada insumo teórico, buscar lotes disponíveis (FIFO)
    for (const insumoTeorico of insumosTeoricos) {
      const quantidadeNecessaria = insumoTeorico.quantidade_ue;

      if (quantidadeNecessaria <= 0) continue;

      // Buscar lotes do insumo ordenados por data de recebimento (FIFO)
      const {
        data: lotes,
        error,
      }: {
        data: Array<{ id: string; quantidade_restante: number; data_recebimento?: string }> | null;
        error: { message?: string } | null;
      } = await supabase
        .from('lotes_insumos')
        .select('*')
        .eq('insumo_id', insumoTeorico.insumo_id)
        .gt('quantidade_restante', 0)
        .order('data_recebimento', { ascending: true });

      if (error && error.message) throw new Error(error.message);

      if (!lotes || lotes.length === 0) {
        throw new Error(`Estoque insuficiente para o insumo: ${insumoTeorico.nome_insumo}`);
      }

      let quantidadeRestante = quantidadeNecessaria;

      // Baixar dos lotes seguindo FIFO
      for (const lote of lotes) {
        if (quantidadeRestante <= 0) break;

        const quantidadeDoLote = Math.min(quantidadeRestante, lote.quantidade_restante);
        const novaQuantidadeRestante = lote.quantidade_restante - quantidadeDoLote;

        // Atualizar quantidade restante do lote
        const { error: updateError }: { error: { message?: string } | null } = await supabase
          .from('lotes_insumos')
          .update({ quantidade_restante: novaQuantidadeRestante })
          .eq('id', lote.id);

        if (updateError && updateError.message) throw new Error(updateError.message);

        quantidadeRestante -= quantidadeDoLote;

        // Registrar movimento de estoque
        registrarMovimentoEstoque({
          lote_id: lote.id,
          tipo: 'saida',
          quantidade: quantidadeDoLote,
          motivo: 'producao',
          ordem_producao_id: ordemProducao.id,
          observacao: `Baixa para OP ${ordemProducao.numero_op}`,
        });
      }

      if (quantidadeRestante > 0) {
        throw new Error(
          `Estoque insuficiente para ${insumoTeorico.nome_insumo}. Faltam ${quantidadeRestante} ${insumoTeorico.unidade_estoque}`
        );
      }
    }

    console.log(`Baixa de estoque concluída para OP ${ordemProducao.numero_op}`);
  } catch (error) {
    console.error('Erro na baixa de estoque:', error);
    throw error;
  }
}

/**
 * Registra um movimento de estoque
 */
function registrarMovimentoEstoque(movimento: {
  lote_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  ordem_producao_id?: string;
  observacao?: string;
}): void {
  // Por enquanto, apenas log. Futuramente pode criar tabela de movimentos
  console.log('Movimento de estoque registrado:', movimento);
}

/**
 * Calcula o custo real unitário baseado na produção real vs prevista
 */
export function calcularCustoRealUnitario(
  custoTotalInsumos: number,
  quantidadePrevista: number,
  quantidadeReal: number
): number {
  if (quantidadeReal <= 0) return 0;

  // O custo total dos insumos é distribuído pela quantidade real produzida
  // Isso ajusta automaticamente por perdas/ganhos na produção
  return custoTotalInsumos / quantidadeReal;
}

/**
 * Calcula o percentual de perda ou ganho na produção
 */
export function calcularPercentualPerdaGanho(
  quantidadePrevista: number,
  quantidadeReal: number
): number {
  if (quantidadePrevista <= 0) return 0;

  return ((quantidadeReal - quantidadePrevista) / quantidadePrevista) * 100;
}

/**
 * Verifica se há estoque suficiente para os insumos necessários
 */
export async function verificarEstoqueSuficiente(
  insumosTeoricos: InsumoTeorico[]
): Promise<{ suficiente: boolean; detalhes: string[] }> {
  const detalhes: string[] = [];

  for (const insumo of insumosTeoricos) {
    try {
      // Calcular estoque total disponível
      const {
        data: lotes,
        error,
      }: {
        data: Array<{ quantidade_restante: number }> | null;
        error: { message?: string } | null;
      } = await supabase
        .from('lotes_insumos')
        .select('quantidade_restante')
        .eq('insumo_id', insumo.insumo_id);

      if (error && error.message) throw new Error(error.message);

      const estoqueTotal = lotes?.reduce((acc, lote) => acc + lote.quantidade_restante, 0) || 0;

      if (estoqueTotal < insumo.quantidade_ue) {
        detalhes.push(
          `${insumo.nome_insumo}: necessário ${insumo.quantidade_ue.toFixed(3)} ${insumo.unidade_estoque}, disponível ${estoqueTotal.toFixed(3)} ${insumo.unidade_estoque}`
        );
      }
    } catch {
      detalhes.push(`${insumo.nome_insumo}: erro ao verificar estoque`);
    }
  }

  return {
    suficiente: detalhes.length === 0,
    detalhes,
  };
}
