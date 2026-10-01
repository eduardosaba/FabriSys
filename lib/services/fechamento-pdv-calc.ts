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
  taxa_percentual_equivalente: number; // Percentual informativo calculado: (taxa / totalDigital) * 100
  taxa_percentual_formatada: string; // Ex: '2,50%' ou '0,00%'
  resultado_caixa: ResultadoCaixaConciliacao; // Classificação formal de Furo, Sobra ou Conferido
  total_recebido: number; // Mantido para compatibilidade retroativa (= total_bruto_recebido)
  diferenca_caixa: number; // Conciliação comercial: total_bruto_recebido - faturamento_liquido_esperado
  tem_pendencias: boolean;
  pendencias: PendenciaFechamento[];
}

export type StatusResultadoCaixa = 'conferido' | 'furo' | 'sobra';

export interface ResultadoCaixaConciliacao {
  diferenca: number;
  diferenca_absoluta: number;
  status: StatusResultadoCaixa;
  rotulo: string;
  furo_valor: number;
  sobra_valor: number;
  is_perfeito: boolean;
}

/**
 * Calcula o percentual equivalente da taxa única sobre o total de operações digitais.
 * Exibido exclusivamente como indicador visual para o usuário.
 * Não altera a taxa financeira persistida (total_taxas_operacionais em R$).
 */
export function calcularTaxaPercentualEquivalente(
  taxaReais: number,
  totalDigital: number
): { percentual: number; valor_numerico: number; formatado: string } {
  const taxa = Number(taxaReais) || 0;
  const digital = Number(totalDigital) || 0;
  if (digital <= 0 || taxa <= 0) {
    return { percentual: 0, valor_numerico: 0, formatado: '0,00%' };
  }
  const pct = Math.round((taxa / digital) * 10000) / 100;
  return {
    percentual: pct,
    valor_numerico: pct,
    formatado: `${pct.toFixed(2).replace('.', ',')}%`,
  };
}

/**
 * Formaliza a classificação do resultado financeiro de caixa:
 * Diferença = Total Bruto Recebido - Faturamento Líquido Comercial
 * - Diferença < -0.05: Furo de Caixa (|diferença|)
 * - Diferença > 0.05: Sobra de Caixa (diferença)
 * - Diferença entre -0.05 e 0.05: Caixa Conferido
 * A taxa financeira não entra no furo comercial e furo/sobra não alteram faturamento.
 */
export function classificarResultadoCaixa(
  totalBrutoRecebido: number,
  faturamentoLiquido: number
): ResultadoCaixaConciliacao {
  const bruto = Math.round((Number(totalBrutoRecebido) || 0) * 100) / 100;
  const fat = Math.round((Number(faturamentoLiquido) || 0) * 100) / 100;
  const dif = Math.round((bruto - fat) * 100) / 100;

  if (dif < -0.05) {
    const furo = Math.abs(dif);
    return {
      diferenca: dif,
      diferenca_absoluta: furo,
      status: 'furo',
      rotulo: `Furo de Caixa: R$ ${furo.toFixed(2).replace('.', ',')}`,
      furo_valor: furo,
      sobra_valor: 0,
      is_perfeito: false,
    };
  } else if (dif > 0.05) {
    return {
      diferenca: dif,
      diferenca_absoluta: dif,
      status: 'sobra',
      rotulo: `Sobra de Caixa: R$ ${dif.toFixed(2).replace('.', ',')}`,
      furo_valor: 0,
      sobra_valor: dif,
      is_perfeito: false,
    };
  } else {
    return {
      diferenca: 0,
      diferenca_absoluta: 0,
      status: 'conferido',
      rotulo: 'Caixa Conferido',
      furo_valor: 0,
      sobra_valor: 0,
      is_perfeito: true,
    };
  }
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

      // Só considera pendência de sobra se o produto teve carga enviada ou movimentação no turno
      const teveMovimentoNoTurno =
        Number(item.qtd_enviada || 0) > 0 ||
        Number(item.qtd_estoque_inicial || 0) > 0 ||
        Number(item.qtd_transferencia_recebida || 0) > 0;

      if (teveMovimentoNoTurno && (item.qtd_retorno === null || item.qtd_retorno === undefined)) {
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

  // Para calcular a sobra física real retornada à fábrica:
  // Regra Larissa Saba: a sobra não é distribuída e sempre retorna à fábrica.
  // Cada turno representa um envio e um retorno independente à fábrica.
  // Caso haja um rollover interno explícito no mesmo PDV (qtd_estoque_inicial > 0),
  // a sobra do turno anterior foi reutilizada no balcão e apenas a do último turno retorna à fábrica.
  const turnosPorPDV = new Map<string, TurnoFechamentoInput[]>();
  turnos.forEach((t) => {
    const list = turnosPorPDV.get(t.local_id) || [];
    list.push(t);
    turnosPorPDV.set(t.local_id, list);
  });

  turnosPorPDV.forEach((turnosDoPdv) => {
    const temRolloverInterno = turnosDoPdv.some((t) =>
      (t.itens_grade || []).some((it) => Number(it.qtd_estoque_inicial || 0) > 0)
    );

    if (temRolloverInterno) {
      const ordemTurnos: Record<string, number> = { manha: 1, tarde: 2, noite: 3, integral: 4 };
      turnosDoPdv.sort((a, b) => (ordemTurnos[a.turno] || 99) - (ordemTurnos[b.turno] || 99));
      const ultimoTurno = turnosDoPdv[turnosDoPdv.length - 1];

      (ultimoTurno.itens_grade || []).forEach((item) => {
        const registroProd = mapaProdutos.get(item.produto_id);
        if (registroProd && item.qtd_retorno !== null && item.qtd_retorno !== undefined) {
          registroProd.sobra_final_acumulada += Number(item.qtd_retorno);
        }
      });
    } else {
      turnosDoPdv.forEach((t) => {
        (t.itens_grade || []).forEach((item) => {
          const registroProd = mapaProdutos.get(item.produto_id);
          if (registroProd && item.qtd_retorno !== null && item.qtd_retorno !== undefined) {
            registroProd.sobra_final_acumulada += Number(item.qtd_retorno);
          }
        });
      });
    }
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

    // Inclui apenas itens que tiveram carga, movimentação ou sobra registrada
    if (disponivel > 0 || p.sobra_final_acumulada > 0 || p.qtd_entradas_fabrica > 0) {
      itensCalculados.push({
        produto_id: p.produto_id,
        nome: p.nome,
        preco_unitario: p.preco_unitario,
        qtd_disponivel: disponivel,
        qtd_vendida: vendida,
        faturamento_bruto: fatBruto,
        tem_pendencia_sobra: p.tem_pendencia,
      });
    }
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
  const taxaCalculada = calcularTaxaPercentualEquivalente(taxasValidas, pix + debito + credito);
  const resultadoCaixa = classificarResultadoCaixa(totalBrutoRecebido, faturamentoLiquido);

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
    taxa_percentual_equivalente: taxaCalculada.percentual,
    taxa_percentual_formatada: taxaCalculada.formatado,
    resultado_caixa: resultadoCaixa,
    total_recebido: totalBrutoRecebido, // Mantido para compatibilidade retroativa
    diferenca_caixa: diferencaCaixa,
    tem_pendencias: pendencias.length > 0,
    pendencias,
  };
}
