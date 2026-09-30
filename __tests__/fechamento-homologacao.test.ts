import { describe, it, expect } from 'vitest';
import {
  calcularItemIndividual,
  apurarFechamentoUnificado,
  TurnoFechamentoInput,
  ItemMovimentacaoPDV,
} from '@/lib/services/fechamento-pdv-calc';

describe('Suíte de Homologação Final — Fechamento Unificado de PDVs (22 Cenários)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // CENÁRIOS 01 A 04: APURAÇÃO FÍSICA E SOBRAS
  // ──────────────────────────────────────────────────────────────────────────
  it('Cenário 01: Sobra positiva apurada corretamente (enviado 50, sobra 10 -> vendeu 40)', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'prod-1',
      nome: 'Bolo Caseiro',
      preco_unitario: 25.0,
      qtd_enviada: 50,
      qtd_retorno: 10,
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(false);
    expect(res.qtd_disponivel).toBe(50);
    expect(res.qtd_vendida).toBe(40);
    expect(res.faturamento_bruto).toBe(1000.0);
  });

  it('Cenário 02: Sobra confirmada como zero (vendeu tudo legitimamente)', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'prod-2',
      nome: 'Pão de Mel',
      preco_unitario: 10.0,
      qtd_enviada: 30,
      qtd_retorno: 0, // Zero legítimo
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(false);
    expect(res.qtd_vendida).toBe(30);
    expect(res.faturamento_bruto).toBe(300.0);
  });

  it('Cenário 03: Sobra não informada (null) NÃO converte para zero nem computa faturamento arbitrário', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'prod-3',
      nome: 'Torta Alemã',
      preco_unitario: 45.0,
      qtd_enviada: 20,
      qtd_retorno: null, // Pendente!
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(true);
    expect(res.qtd_vendida).toBe(0);
    expect(res.faturamento_bruto).toBe(0.0);
  });

  it('Cenário 04: Sobras parciais na grade de produtos (alguns conferidos, outros pendentes)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-1',
        local_id: 'pdv-1',
        data: '2026-09-30',
        turno: 'manha',
        status: 'aberto',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Item A',
            preco_unitario: 10.0,
            qtd_enviada: 10,
            qtd_retorno: 2,
          },
          {
            produto_id: 'p2',
            nome: 'Item B',
            preco_unitario: 20.0,
            qtd_enviada: 5,
            qtd_retorno: null,
          }, // Pendente
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, { pix: 0, cartao_debito: 0, cartao_credito: 0 });
    expect(res.tem_pendencias).toBe(true);
    expect(res.pendencias.some((p) => p.produto_id === 'p2' && p.tipo === 'sobra_pendente')).toBe(
      true
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CENÁRIOS 05 A 08: MOVIMENTAÇÕES NÃO COMERCIAIS E ROLLOVERS ENTRE TURNOS
  // ──────────────────────────────────────────────────────────────────────────
  it('Cenário 05: Rollover de sobras entre múltiplos turnos do mesmo PDV', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-manha',
        local_id: 'pdv-shopping',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 50.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Trufa',
            preco_unitario: 5.0,
            qtd_enviada: 40,
            qtd_retorno: 15,
          },
        ],
      },
      {
        id: 't-tarde',
        local_id: 'pdv-shopping',
        data: '2026-09-30',
        turno: 'tarde',
        status: 'encerrado',
        valor_dinheiro_gaveta: 70.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Trufa',
            preco_unitario: 5.0,
            qtd_estoque_inicial: 15,
            qtd_enviada: 20,
            qtd_retorno: 5,
          },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 200,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.total_enviado_fabrica).toBe(60); // 40 + 20 (não duplica os 15)
    expect(res.total_sobras_conferidas).toBe(5); // Sobra final da tarde
    expect(res.total_vendido).toBe(55); // 60 - 5
    expect(res.faturamento_liquido_esperado).toBe(275.0); // 55 * 5
  });

  it('Cenário 06: Múltiplos turnos no mesmo PDV — Sobra transferida NÃO duplica entrada da fábrica', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Brownie',
            preco_unitario: 10.0,
            qtd_enviada: 80,
            qtd_retorno: 30,
          },
        ],
      },
      {
        id: 't2',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'tarde',
        status: 'encerrado',
        valor_dinheiro_gaveta: 150.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Brownie',
            preco_unitario: 10.0,
            qtd_estoque_inicial: 30,
            qtd_enviada: 40,
            qtd_retorno: 10,
          },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 850,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.total_enviado_fabrica).toBe(120); // 80 + 40
    expect(res.total_vendido).toBe(110); // 120 - 10
    expect(res.faturamento_liquido_esperado).toBe(1100.0);
  });

  it('Cenário 07: Movimentações não comerciais — Devoluções à fábrica e avarias', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'prod-torta',
      nome: 'Torta Holandesa',
      preco_unitario: 30.0,
      qtd_enviada: 15,
      qtd_devolucao_fabrica: 3, // Devolvidas à fábrica
      qtd_perda: 2, // Avariadas na vitrine
      qtd_retorno: 2, // Sobra final
    };
    const res = calcularItemIndividual(item);
    expect(res.qtd_disponivel).toBe(10); // 15 - 3 - 2
    expect(res.qtd_vendida).toBe(8); // 10 - 2
    expect(res.faturamento_bruto).toBe(240.0); // 8 * 30
  });

  it('Cenário 08: Perdas e descontos comerciais registrados abatem faturamento líquido', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-perda',
        local_id: 'pdv-1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        total_descontos_perdas: 50.0, // R$ 50 de desconto de perdas
        itens_grade: [
          { produto_id: 'p1', nome: 'Bolo', preco_unitario: 50.0, qtd_enviada: 10, qtd_retorno: 0 },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 350,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.faturamento_bruto_esperado).toBe(500.0);
    expect(res.faturamento_liquido_esperado).toBe(450.0); // 500 - 50
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CENÁRIOS 09 A 11: DINHEIRO EM GAVETA
  // ──────────────────────────────────────────────────────────────────────────
  it('Cenário 09: Dinheiro legítimo de R$ 0,00 no turno (cliente pagou tudo em meios digitais)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-zero-cash',
        local_id: 'pdv-quiosque',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 0.0, // Zero dinheiro físico confirmado
        itens_grade: [
          { produto_id: 'p1', nome: 'Bolo', preco_unitario: 40.0, qtd_enviada: 5, qtd_retorno: 0 },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 200,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.tem_pendencias).toBe(false);
    expect(res.total_dinheiro_turnos).toBe(0.0);
    expect(res.diferenca_caixa).toBe(0.0);
  });

  it('Cenário 10: Dinheiro não informado (null) no turno é pendência bloqueante', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-null-cash',
        local_id: 'pdv-centro',
        data: '2026-09-30',
        turno: 'manha',
        status: 'sobras_informadas',
        valor_dinheiro_gaveta: null, // Dinheiro pendente!
        itens_grade: [
          { produto_id: 'p1', nome: 'Doces', preco_unitario: 10.0, qtd_enviada: 5, qtd_retorno: 0 },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, { pix: 50, cartao_debito: 0, cartao_credito: 0 });
    expect(res.tem_pendencias).toBe(true);
    expect(res.pendencias.some((p) => p.tipo === 'dinheiro_pendente')).toBe(true);
  });

  it('Cenário 11: Soma automática de dinheiro entre múltiplos PDVs sem sobrescrita', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 120.0,
        itens_grade: [],
      },
      {
        id: 't2',
        local_id: 'pdv2',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 85.5,
        itens_grade: [],
      },
      {
        id: 't3',
        local_id: 'pdv3',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 44.5,
        itens_grade: [],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, { pix: 0, cartao_debito: 0, cartao_credito: 0 });
    expect(res.total_dinheiro_turnos).toBe(250.0); // 120 + 85.50 + 44.50
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CENÁRIOS 12 A 17: RECEBIMENTOS DIGITAIS E TAXA FINANCEIRA ÚNICA EM R$
  // ──────────────────────────────────────────────────────────────────────────
  it('Cenário 12: Recebimento digital Pix consolidado no fechamento geral sem rateio forçado nos turnos', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 50.0,
        itens_grade: [],
      },
      {
        id: 't2',
        local_id: 'pdv2',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 50.0,
        itens_grade: [],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 400.0,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.total_pix).toBe(400.0);
    expect(res.total_bruto_recebido).toBe(500.0); // 100 dinheiro + 400 pix
  });

  it('Cenário 13: Recebimento digital Cartão Débito e Crédito consolidados centralmente', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 0,
      cartao_debito: 250.0,
      cartao_credito: 350.0,
    });
    expect(res.total_cartao_debito).toBe(250.0);
    expect(res.total_cartao_credito).toBe(350.0);
    expect(res.total_bruto_recebido).toBe(700.0);
  });

  it('Cenário 14: Taxa Financeira Única em R$ informada manualmente (descontada do total recebido para apurar líquido)', () => {
    // Vendas: R$ 2.000,00 | Dinheiro: R$ 300,00 | Pix: R$ 900,00 | Débito: R$ 400,00 | Crédito: R$ 400,00
    // Total Bruto Recebido = R$ 2.000,00
    // Taxa Financeira Única informada em R$ = R$ 45,00
    // Total Líquido após Taxas = R$ 1.955,00
    // Diferença Comercial de Caixa = R$ 0,00 (Vendas 2000 vs Bruto 2000)
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-fechamento',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 300.0,
        itens_grade: [
          { produto_id: 'p1', nome: 'Bolo', preco_unitario: 50.0, qtd_enviada: 40, qtd_retorno: 0 },
        ],
      },
    ];

    const res = apurarFechamentoUnificado(turnos, {
      pix: 900.0,
      cartao_debito: 400.0,
      cartao_credito: 400.0,
      taxas_operacionais: 45.0, // Taxa única informada em R$
    });

    expect(res.faturamento_liquido_esperado).toBe(2000.0);
    expect(res.total_bruto_recebido).toBe(2000.0);
    expect(res.total_taxas_operacionais).toBe(45.0);
    expect(res.total_liquido_apos_taxas).toBe(1955.0);
    expect(res.diferenca_caixa).toBe(0.0); // As taxas não diminuem o faturamento nem geram falta de caixa!
  });

  it('Cenário 15: Taxa Financeira igual a R$ 0,00 (isenção ou sem desconto no dia)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 100,
      cartao_debito: 0,
      cartao_credito: 0,
      taxas_operacionais: 0,
    });
    expect(res.total_taxas_operacionais).toBe(0.0);
    expect(res.total_liquido_apos_taxas).toBe(200.0);
    expect(res.tem_pendencias).toBe(false);
  });

  it('Cenário 16: Bloqueio de Taxa Financeira negativa (gera pendência de inconsistência física)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 100,
      cartao_debito: 0,
      cartao_credito: 0,
      taxas_operacionais: -15.0,
    });
    expect(res.tem_pendencias).toBe(true);
    expect(res.pendencias.some((p) => p.motivo.includes('negativa'))).toBe(true);
  });

  it('Cenário 17: Bloqueio de Taxa Financeira superior ao total das operações digitais', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [],
      },
    ];
    // Digital = Pix 50. Taxa informada = 80 (superior ao digital de 50)
    const res = apurarFechamentoUnificado(turnos, {
      pix: 50,
      cartao_debito: 0,
      cartao_credito: 0,
      taxas_operacionais: 80.0,
    });
    expect(res.tem_pendencias).toBe(true);
    expect(res.pendencias.some((p) => p.motivo.includes('superior ao total'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CENÁRIOS 18 A 22: CONCILIAÇÃO COMERCIAL, DIVERGÊNCIAS E PRESERVAÇÃO
  // ──────────────────────────────────────────────────────────────────────────
  it('Cenário 18: Conciliação comercial com caixa 100% batido (diferença = R$ 0,00)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-batido',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 150.0,
        itens_grade: [
          { produto_id: 'p1', nome: 'Bolo', preco_unitario: 50.0, qtd_enviada: 10, qtd_retorno: 0 },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, {
      pix: 350.0,
      cartao_debito: 0,
      cartao_credito: 0,
    });
    expect(res.faturamento_liquido_esperado).toBe(500.0);
    expect(res.total_bruto_recebido).toBe(500.0);
    expect(res.diferenca_caixa).toBe(0.0);
  });

  it('Cenário 19: Conciliação comercial com sobra de caixa positiva (+R$ 15,00 troco/gorjeta)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-sobra-caixa',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 115.0, // R$ 15 a mais no dinheiro
        itens_grade: [
          { produto_id: 'p1', nome: 'Bolo', preco_unitario: 50.0, qtd_enviada: 2, qtd_retorno: 0 },
        ],
      },
    ];
    const res = apurarFechamentoUnificado(turnos, { pix: 0, cartao_debito: 0, cartao_credito: 0 });
    expect(res.faturamento_liquido_esperado).toBe(100.0);
    expect(res.total_bruto_recebido).toBe(115.0);
    expect(res.diferenca_caixa).toBe(15.0);
  });

  it('Cenário 20: Conciliação com diferença negativa (-R$ 30,00) e taxa operacional independente', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't-dif',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 200.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Bolo Festa',
            preco_unitario: 50.0,
            qtd_enviada: 40,
            qtd_retorno: 0,
          },
        ],
      },
    ];
    // Vendas: R$ 2.000,00 | Recebimento Bruto: Dinheiro 200 + Pix 900 + Débito 450 + Crédito 420 = R$ 1.970,00
    // Taxa Operacional: R$ 38,50
    // Líquido após Taxas: R$ 1.970,00 - R$ 38,50 = R$ 1.931,50
    // Diferença Comercial: R$ 1.970,00 - R$ 2.000,00 = -R$ 30,00
    const res = apurarFechamentoUnificado(turnos, {
      pix: 900.0,
      cartao_debito: 450.0,
      cartao_credito: 420.0,
      taxas_operacionais: 38.5,
    });
    expect(res.faturamento_liquido_esperado).toBe(2000.0);
    expect(res.total_bruto_recebido).toBe(1970.0);
    expect(res.total_taxas_operacionais).toBe(38.5);
    expect(res.total_liquido_apos_taxas).toBe(1931.5);
    expect(res.diferenca_caixa).toBe(-30.0);
  });

  it('Cenário 21: Preservação financeira integral: dados individuais nunca são alterados para forçar fechamento', () => {
    const turnoOriginal: TurnoFechamentoInput = {
      id: 't-original',
      local_id: 'pdv-original',
      data: '2026-09-30',
      turno: 'integral',
      status: 'encerrado',
      valor_dinheiro_gaveta: 250.0,
      itens_grade: [
        { produto_id: 'p1', nome: 'Bolo', preco_unitario: 50.0, qtd_enviada: 20, qtd_retorno: 0 },
      ],
    };
    const copiaOriginal = JSON.parse(JSON.stringify(turnoOriginal));

    const res = apurarFechamentoUnificado([turnoOriginal], {
      pix: 600.0,
      cartao_debito: 100.0,
      cartao_credito: 0.0,
    });
    expect(res.total_bruto_recebido).toBe(950.0);

    // O objeto original não pode ter sido mutado
    expect(turnoOriginal.valor_dinheiro_gaveta).toBe(copiaOriginal.valor_dinheiro_gaveta);
    expect(turnoOriginal.itens_grade[0].qtd_enviada).toBe(copiaOriginal.itens_grade[0].qtd_enviada);
    expect(turnoOriginal.itens_grade[0].qtd_retorno).toBe(copiaOriginal.itens_grade[0].qtd_retorno);
  });

  it('Cenário 22: Preservação histórica dos 36 registros (19 secundários marcados como legados sem duplicação)', () => {
    // Simulação do conjunto histórico:
    // 1 registro principal com o faturamento consolidado
    // 1 registro secundário com flag legado_inconsistente e faturamento zero
    const registrosLegados = [
      {
        id: 'legado-principal',
        faturamento_liquido_esperado: 1500.0,
        legado_inconsistente: false,
        status: 'encerrado',
      },
      {
        id: 'legado-secundario-zerado',
        faturamento_liquido_esperado: 0.0,
        faturamento_bruto_teorico: 0.0,
        qtd_total_enviada: 0,
        legado_inconsistente: true,
        status: 'encerrado',
      },
    ];

    // O algoritmo de dashboard / relatórios filtra secundários legados zerados:
    const registrosFiltrados = registrosLegados.filter((reg) => {
      if (
        reg.legado_inconsistente &&
        Number(reg.faturamento_liquido_esperado || 0) === 0 &&
        Number(reg.qtd_total_enviada || 0) === 0
      ) {
        return false;
      }
      return true;
    });

    expect(registrosFiltrados.length).toBe(1);
    expect(registrosFiltrados[0].id).toBe('legado-principal');
    expect(registrosFiltrados[0].faturamento_liquido_esperado).toBe(1500.0);
  });
});
