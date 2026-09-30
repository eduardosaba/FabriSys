/**
 * Módulo Centralizado de Regras de Apuração de Mercadorias e Fechamento de PDVs
 * FabriSys — Larissa Saba Confeitaria
 *
 * Este módulo é a fonte única de verdade (Single Source of Truth) para o cálculo
 * de vendas físicas, sobras, faturamento e conciliação de caixa, compartilhado
 * entre o Kanban, Fechamento Individual, Fechamento Unificado e Dashboard.
 */

export interface ItemMovimentacaoPDV {
  produto_id: string;
  nome: string;
  preco_unitario: number;
  qtd_estoque_inicial?: number; // Saldo recebido de turno anterior ou abertura
  qtd_enviada: number; // Entradas externas recebidas da produção/fábrica
  qtd_transferencia_recebida?: number; // Transferências recebidas de outros PDVs
  qtd_transferencia_enviada?: number; // Transferências enviadas para outros PDVs
  qtd_devolucao_fabrica?: number; // Devoluções físicas definitivas à fábrica
  qtd_perda?: number; // Avarias, consumo interno ou perdas registradas
  qtd_retorno: number | null; // null = Não informado (pendente) | >= 0 = Conferido
}

export interface ResultadoItemCalculado {
  produto_id: string;
  nome: string;
  preco_unitario: number;
  qtd_disponivel: number;
  qtd_vendida: number;
  faturamento_bruto: number;
  tem_pendencia_sobra: boolean;
}

export interface PendenciaFechamento {
  pdv_id?: string;
  pdv_nome?: string;
  turno?: string;
  produto_id?: string;
  produto_nome?: string;
  motivo: string;
  tipo: 'sobra_pendente' | 'dinheiro_pendente' | 'inconsistencia_fisica';
}

export interface TurnoFechamentoInput {
  id: string;
  local_id: string;
  pdv_nome?: string;
  data: string;
  turno: string;
  status: string;
  valor_dinheiro_gaveta: number | null;
  itens_grade: ItemMovimentacaoPDV[];
  ajustes_perdas?: { valor_ajuste: number; motivo?: string }[];
  total_descontos_perdas?: number;
}

export interface FechamentoConsolidadoResult {
  itens_consolidados: ResultadoItemCalculado[];
  total_enviado_fabrica: number;
  total_sobras_conferidas: number;
  total_vendido: number;
  faturamento_bruto_esperado: number;
  faturamento_liquido_esperado: number;
  total_dinheiro_turnos: number;
  total_pix: number;
  total_cartao_debito: number;
  total_cartao_credito: number;
  total_outros: number;
  total_bruto_recebido: number;
  total_taxas_operacionais: number;
  total_liquido_apos_taxas: number;
  total_recebido: number; // Mantido para compatibilidade retroativa (= total_bruto_recebido)
  diferenca_caixa: number; // Conciliação comercial: total_bruto_recebido - faturamento_liquido_esperado
  tem_pendencias: boolean;
  pendencias: PendenciaFechamento[];
}

/**
 * Calcula a venda e faturamento de um produto individual considerando todas as movimentações.
 * Regra: Venda = (Estoque Inicial + Entradas Externas + Transf. Recebidas)
 *                - (Transf. Enviadas + Devoluções Fábrica + Perdas + Sobra Final)
 */
export function calcularItemIndividual(item: ItemMovimentacaoPDV): ResultadoItemCalculado {
  const estoqueInicial = Number(item.qtd_estoque_inicial || 0);
  const entradasProducao = Number(item.qtd_enviada || 0);
  const transfRec = Number(item.qtd_transferencia_recebida || 0);
  const transfEnv = Number(item.qtd_transferencia_enviada || 0);
  const devolucoes = Number(item.qtd_devolucao_fabrica || 0);
  const perdas = Number(item.qtd_perda || 0);
  const preco = Number(item.preco_unitario || 0);

  // Total fisicamente disponível para venda comercial
  const qtdDisponivel =
    estoqueInicial + entradasProducao + transfRec - transfEnv - devolucoes - perdas;

  // Diferenciação estrita: null/undefined = pendente (NÃO CONVERTE PARA ZERO)
  if (item.qtd_retorno === null || item.qtd_retorno === undefined) {
    return {
      produto_id: item.produto_id,
      nome: item.nome,
      preco_unitario: preco,
      qtd_disponivel: qtdDisponivel,
      qtd_vendida: 0,
      faturamento_bruto: 0,
      tem_pendencia_sobra: true,
    };
  }

  const sobraFisica = Number(item.qtd_retorno);
  const qtdVendida = Math.max(0, qtdDisponivel - sobraFisica);
  const faturamento = Math.round(qtdVendida * preco * 100) / 100;

  return {
    produto_id: item.produto_id,
    nome: item.nome,
    preco_unitario: preco,
    qtd_disponivel: qtdDisponivel,
    qtd_vendida: qtdVendida,
    faturamento_bruto: faturamento,
    tem_pendencia_sobra: false,
  };
}

/**
 * Apuração unificada de múltiplos turnos e PDVs.
 * Trata rollovers de múltiplos turnos no mesmo PDV sem duplicar entradas da fábrica.
 */
export function apurarFechamentoUnificado(
  turnos: TurnoFechamentoInput[],
  valoresDigitais: {
    pix: number;
    cartao_debito: number;
    cartao_credito: number;
    outros?: number;
    taxas_operacionais?: number;
  }
): FechamentoConsolidadoResult {
  const pendencias: PendenciaFechamento[] = [];
  let totalDinheiro = 0;
  let totalDescontosPerdas = 0;

  // 1. Validação do Dinheiro Individual de cada turno
  turnos.forEach((t) => {
    if (t.valor_dinheiro_gaveta === null || t.valor_dinheiro_gaveta === undefined) {
      pendencias.push({
        pdv_id: t.local_id,
        pdv_nome: t.pdv_nome,
        turno: t.turno,
        motivo: `Turno ${t.turno} do PDV ${t.pdv_nome || t.local_id} sem conferência de dinheiro da gaveta.`,
        tipo: 'dinheiro_pendente',
      });
    } else {
      totalDinheiro += Number(t.valor_dinheiro_gaveta);
    }

    totalDescontosPerdas += Number(t.total_descontos_perdas || 0);
  });

  // 2. Consolidação de Itens por Produto
  // Agrupa turnos do mesmo PDV para evitar duplicar transferências de turno (rollover de sobras)
  const mapaProdutos = new Map<
    string,
    {
      produto_id: string;
      nome: string;
      preco_unitario: number;
      qtd_entradas_fabrica: number;
      qtd_transf_recebida: number;
      qtd_transf_enviada: number;
      qtd_devolucao_fabrica: number;
      qtd_perdas: number;
      sobra_final_acumulada: number;
      tem_pendencia: boolean;
    }
  >();

  // 3. Apuração por Produto e por Turno
  turnos.forEach((t) => {
    (t.itens_grade || []).forEach((item) => {
      let registroProd = mapaProdutos.get(item.produto_id);
      if (!registroProd) {
        registroProd = {
          produto_id: item.produto_id,
          nome: item.nome,
          preco_unitario: Number(item.preco_unitario || 0),
          qtd_entradas_fabrica: 0,
          qtd_transf_recebida: 0,
          qtd_transf_enviada: 0,
          qtd_devolucao_fabrica: 0,
          qtd_perdas: 0,
          sobra_final_acumulada: 0,
          tem_pendencia: false,
        };
        mapaProdutos.set(item.produto_id, registroProd);
      }

      // Soma apenas as entradas reais da fábrica (não duplica estoque inicial/transferência interna de turno)
      registroProd.qtd_entradas_fabrica += Number(item.qtd_enviada || 0);
      registroProd.qtd_transf_recebida += Number(item.qtd_transferencia_recebida || 0);
      registroProd.qtd_transf_enviada += Number(item.qtd_transferencia_enviada || 0);
      registroProd.qtd_devolucao_fabrica += Number(item.qtd_devolucao_fabrica || 0);
      registroProd.qtd_perdas += Number(item.qtd_perda || 0);

      if (item.qtd_retorno === null || item.qtd_retorno === undefined) {
        registroProd.tem_pendencia = true;
        pendencias.push({
          pdv_id: t.local_id,
          pdv_nome: t.pdv_nome,
          turno: t.turno,
          produto_id: item.produto_id,
          produto_nome: item.nome,
          motivo: `Sobra não informada para ${item.nome} no turno ${t.turno}.`,
          tipo: 'sobra_pendente',
        });
      }
    });
  });

  // Para calcular a sobra final física real por PDV:
  // Se houver múltiplos turnos no mesmo PDV no dia, a sobra que permaneceu é a do ÚLTIMO turno cronológico.
  // Se forem PDVs diferentes, as sobras dos PDVs se somam.
  const turnosPorPDV = new Map<string, TurnoFechamentoInput[]>();
  turnos.forEach((t) => {
    const list = turnosPorPDV.get(t.local_id) || [];
    list.push(t);
    turnosPorPDV.set(t.local_id, list);
  });

  turnosPorPDV.forEach((turnosDoPdv) => {
    const ordemTurnos: Record<string, number> = { manha: 1, tarde: 2, noite: 3, integral: 4 };
    turnosDoPdv.sort((a, b) => (ordemTurnos[a.turno] || 99) - (ordemTurnos[b.turno] || 99));
    const ultimoTurno = turnosDoPdv[turnosDoPdv.length - 1];

    (ultimoTurno.itens_grade || []).forEach((item) => {
      const registroProd = mapaProdutos.get(item.produto_id);
      if (registroProd && item.qtd_retorno !== null && item.qtd_retorno !== undefined) {
        registroProd.sobra_final_acumulada += Number(item.qtd_retorno);
      }
    });
  });

  // 3. Apuração Final dos Itens Consolidados
  const itensCalculados: ResultadoItemCalculado[] = [];
  let totalEnviadoFabrica = 0;
  let totalSobrasFisicas = 0;
  let totalVendidoGeral = 0;
  let faturamentoBrutoGeral = 0;

  mapaProdutos.forEach((p) => {
    totalEnviadoFabrica += p.qtd_entradas_fabrica;
    totalSobrasFisicas += p.sobra_final_acumulada;

    const disponivel =
      p.qtd_entradas_fabrica +
      p.qtd_transf_recebida -
      p.qtd_transf_enviada -
      p.qtd_devolucao_fabrica -
      p.qtd_perdas;

    let vendida = 0;
    let fatBruto = 0;

    if (!p.tem_pendencia) {
      vendida = Math.max(0, disponivel - p.sobra_final_acumulada);
      fatBruto = Math.round(vendida * p.preco_unitario * 100) / 100;
    }

    totalVendidoGeral += vendida;
    faturamentoBrutoGeral += fatBruto;

    itensCalculados.push({
      produto_id: p.produto_id,
      nome: p.nome,
      preco_unitario: p.preco_unitario,
      qtd_disponivel: disponivel,
      qtd_vendida: vendida,
      faturamento_bruto: fatBruto,
      tem_pendencia_sobra: p.tem_pendencia,
    });
  });

  faturamentoBrutoGeral = Math.round(faturamentoBrutoGeral * 100) / 100;
  const faturamentoLiquido = Math.max(
    0,
    Math.round((faturamentoBrutoGeral - totalDescontosPerdas) * 100) / 100
  );

  // 4. Conciliação Financeira com Preservação da Taxa Única em Reais (R$)
  const pix = Math.max(0, Number(valoresDigitais.pix || 0));
  const debito = Math.max(0, Number(valoresDigitais.cartao_debito || 0));
  const credito = Math.max(0, Number(valoresDigitais.cartao_credito || 0));
  const outros = Math.max(0, Number(valoresDigitais.outros || 0));
  const taxasInformadas = Number(valoresDigitais.taxas_operacionais || 0);

  // Validação: taxas não podem ser negativas
  if (taxasInformadas < 0) {
    pendencias.push({
      motivo: `Taxa operacional não pode ser negativa (R$ ${taxasInformadas.toFixed(2)}).`,
      tipo: 'inconsistencia_fisica',
    });
  }

  // Validação: taxas não podem ser superiores ao total das operações digitais
  const totalOperacoesDigitais = Math.round((pix + debito + credito + outros) * 100) / 100;
  if (taxasInformadas > totalOperacoesDigitais) {
    pendencias.push({
      motivo: `Taxa operacional (R$ ${taxasInformadas.toFixed(2)}) superior ao total das operações digitais (R$ ${totalOperacoesDigitais.toFixed(2)}).`,
      tipo: 'inconsistencia_fisica',
    });
  }

  const taxasValidas = Math.max(0, taxasInformadas);

  // Total bruto recebido = Dinheiro + Pix + Débito + Crédito + Outros
  const totalBrutoRecebido =
    Math.round((totalDinheiro + pix + debito + credito + outros) * 100) / 100;

  // Total líquido após taxas = Total bruto recebido − Taxa única informada
  const totalLiquidoAposTaxas = Math.round((totalBrutoRecebido - taxasValidas) * 100) / 100;

  // A diferença de conciliação comercial compara o faturamento líquido de vendas com o total bruto recebido
  // (A taxa é despesa operacional/bancária e não falta de dinheiro no caixa)
  const diferencaCaixa = Math.round((totalBrutoRecebido - faturamentoLiquido) * 100) / 100;

  return {
    itens_consolidados: itensCalculados,
    total_enviado_fabrica: totalEnviadoFabrica,
    total_sobras_conferidas: totalSobrasFisicas,
    total_vendido: totalVendidoGeral,
    faturamento_bruto_esperado: faturamentoBrutoGeral,
    faturamento_liquido_esperado: faturamentoLiquido,
    total_dinheiro_turnos: Math.round(totalDinheiro * 100) / 100,
    total_pix: pix,
    total_cartao_debito: debito,
    total_cartao_credito: credito,
    total_outros: outros,
    total_bruto_recebido: totalBrutoRecebido,
    total_taxas_operacionais: Math.round(taxasValidas * 100) / 100,
    total_liquido_apos_taxas: totalLiquidoAposTaxas,
    total_recebido: totalBrutoRecebido, // Mantido para compatibilidade retroativa
    diferenca_caixa: diferencaCaixa,
    tem_pendencias: pendencias.length > 0,
    pendencias,
  };
}
