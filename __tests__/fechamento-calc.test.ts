import { describe, it, expect } from 'vitest';
import {
  calcularItemIndividual,
  apurarFechamentoUnificado,
  TurnoFechamentoInput,
  ItemMovimentacaoPDV,
} from '@/lib/services/fechamento-pdv-calc';

describe('Motor de Cálculo de Fechamento de PDVs (fechamento-pdv-calc)', () => {
  it('Cenário 01: Sobra positiva apurada corretamente', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'p1',
      nome: 'Brownie Tradicional',
      preco_unitario: 10.0,
      qtd_enviada: 50,
      qtd_retorno: 10,
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(false);
    expect(res.qtd_disponivel).toBe(50);
    expect(res.qtd_vendida).toBe(40);
    expect(res.faturamento_bruto).toBe(400.0);
  });

  it('Cenário 02: Sobra confirmada como zero (vendeu tudo legitimamente)', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'p1',
      nome: 'Bolo de Cenoura',
      preco_unitario: 8.0,
      qtd_enviada: 30,
      qtd_retorno: 0,
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(false);
    expect(res.qtd_vendida).toBe(30);
    expect(res.faturamento_bruto).toBe(240.0);
  });

  it('Cenário 03: Sobra não informada (null) NÃO pode ser considerada zero nem computar faturamento', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'p1',
      nome: 'Bombom de Morango',
      preco_unitario: 6.0,
      qtd_enviada: 40,
      qtd_retorno: null,
    };
    const res = calcularItemIndividual(item);
    expect(res.tem_pendencia_sobra).toBe(true);
    expect(res.qtd_vendida).toBe(0);
    expect(res.faturamento_bruto).toBe(0);
  });

  it('Cenário 06: Múltiplos turnos no mesmo PDV — Sobra transferida NÃO duplica entrada da fábrica', () => {
    // Manhã: enviadas 100, sobra 40 transferida para tarde
    // Tarde: novas da fábrica 30, sobra final do dia 20
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        pdv_nome: 'PDV Centro',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 80.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Brownie',
            preco_unitario: 10.0,
            qtd_enviada: 100, // Fábrica
            qtd_retorno: 40, // Sobra manhã
          },
        ],
      },
      {
        id: 't2',
        local_id: 'pdv1',
        pdv_nome: 'PDV Centro',
        data: '2026-09-30',
        turno: 'tarde',
        status: 'encerrado',
        valor_dinheiro_gaveta: 120.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Brownie',
            preco_unitario: 10.0,
            qtd_estoque_inicial: 40, // Recebido da manhã (rollover interno)
            qtd_enviada: 30, // Nova reposição da fábrica
            qtd_retorno: 20, // Sobra final física
          },
        ],
      },
    ];

    const res = apurarFechamentoUnificado(turnos, {
      pix: 500,
      cartao_debito: 300,
      cartao_credito: 100,
    });

    // Total enviado pela fábrica: 100 + 30 = 130 (NÃO 170!)
    expect(res.total_enviado_fabrica).toBe(130);
    // Total vendido: 130 - 20 (sobra final) = 110 un
    expect(res.total_vendido).toBe(110);
    // Faturamento esperado: 110 * 10 = R$ 1100,00
    expect(res.faturamento_bruto_esperado).toBe(1100.0);
    // Dinheiro somado automaticamente dos 2 turnos: 80 + 120 = 200,00
    expect(res.total_dinheiro_turnos).toBe(200.0);
    // Total recebido: 200 (dinheiro) + 500 (pix) + 300 (deb) + 100 (cred) = 1100,00
    expect(res.total_recebido).toBe(1100.0);
    expect(res.diferenca_caixa).toBe(0.0);
  });

  it('Cenário 09 & 10: Dinheiro legítimo de R$ 0,00 vs soma de dinheiro entre múltiplos PDVs', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        pdv_nome: 'PDV 01',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 80.0,
        itens_grade: [
          { produto_id: 'p1', nome: 'Doces', preco_unitario: 5, qtd_enviada: 20, qtd_retorno: 0 },
        ],
      },
      {
        id: 't2',
        local_id: 'pdv1',
        pdv_nome: 'PDV 01',
        data: '2026-09-30',
        turno: 'tarde',
        status: 'encerrado',
        valor_dinheiro_gaveta: 120.0,
        itens_grade: [
          { produto_id: 'p1', nome: 'Doces', preco_unitario: 5, qtd_enviada: 30, qtd_retorno: 0 },
        ],
      },
      {
        id: 't3',
        local_id: 'pdv2',
        pdv_nome: 'PDV 02',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 0.0, // Legitimamente ZERO dinheiro físico (ex: cliente pagou tudo em pix)
        itens_grade: [
          { produto_id: 'p1', nome: 'Doces', preco_unitario: 5, qtd_enviada: 10, qtd_retorno: 0 },
        ],
      },
    ];

    const res = apurarFechamentoUnificado(turnos, { pix: 50, cartao_debito: 0, cartao_credito: 0 });
    // Soma do dinheiro: 80 + 120 + 0 = 200,00
    expect(res.total_dinheiro_turnos).toBe(200.0);
    expect(res.tem_pendencias).toBe(false);
  });

  it('Cenário 14: Diferença de caixa negativa com conferência (vendas R$ 2.000 vs recebido R$ 1.970)', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 500.0,
        itens_grade: [
          {
            produto_id: 'p1',
            nome: 'Bolo Festa',
            preco_unitario: 50.0,
            qtd_enviada: 40,
            qtd_retorno: 0,
          },
        ], // 40 * 50 = R$ 2000 faturamento
      },
    ];

    // Recebimentos: Dinheiro 500 + Pix 900 + Débito 320 + Crédito 250 = R$ 1970
    const res = apurarFechamentoUnificado(turnos, {
      pix: 900.0,
      cartao_debito: 320.0,
      cartao_credito: 250.0,
    });

    expect(res.faturamento_liquido_esperado).toBe(2000.0);
    expect(res.total_recebido).toBe(1970.0);
    expect(res.diferenca_caixa).toBe(-30.0); // Furo / quebra de caixa de R$ 30
  });

  it('Cenário: Movimentações não comerciais (Devoluções à fábrica e perdas)', () => {
    const item: ItemMovimentacaoPDV = {
      produto_id: 'p1',
      nome: 'Torta de Limão',
      preco_unitario: 20.0,
      qtd_enviada: 10,
      qtd_devolucao_fabrica: 2, // Devolveu 2 para fábrica
      qtd_perda: 1, // 1 estragou
      qtd_retorno: 2, // Sobraram 2 no balcão
    };
    // Disponível comercial = 10 - 2 (dev) - 1 (perda) = 7
    // Vendeu = 7 - 2 (sobra) = 5
    // Faturamento = 5 * 20 = 100
    const res = calcularItemIndividual(item);
    expect(res.qtd_disponivel).toBe(7);
    expect(res.qtd_vendida).toBe(5);
    expect(res.faturamento_bruto).toBe(100.0);
  });

  it('Cenário: Produtos sem carga (enviada = 0) não poluem itens_consolidados nem geram pendências', () => {
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 't1',
        local_id: 'pdv1',
        pdv_nome: 'PDV 1',
        data: '2026-09-30',
        turno: 'manha',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [
          {
            produto_id: 'p_com_carga',
            nome: 'Empada com Carga',
            preco_unitario: 10.0,
            qtd_enviada: 10,
            qtd_retorno: 2,
          },
          {
            produto_id: 'p_sem_carga',
            nome: 'Empada que Não Foi Enviada',
            preco_unitario: 15.0,
            qtd_enviada: 0,
            qtd_estoque_inicial: 0,
            qtd_retorno: null, // Sem sobra informada porque nunca foi para o PDV
          },
        ],
      },
    ];

    const res = apurarFechamentoUnificado(turnos, {
      pix: 0,
      cartao_debito: 0,
      cartao_credito: 0,
    });

    // Produto sem carga NÃO deve gerar pendência de conferência
    expect(res.tem_pendencias).toBe(false);
    expect(res.pendencias).toHaveLength(0);

    // Produto sem carga NÃO deve estar na lista de itens consolidados para conferência
    expect(res.itens_consolidados).toHaveLength(1);
    expect(res.itens_consolidados[0].produto_id).toBe('p_com_carga');
    expect(res.itens_consolidados[0].qtd_vendida).toBe(8);
  });

  it('Cenário: Sobras NUNCA são distribuídas entre PDVs — cada PDV/turno retorna fisicamente à fábrica de forma independente', () => {
    // Simulação Larissa Saba:
    // PDV Centro: Enviou 10, retornou 2 à fábrica -> vendeu 8
    // PDV Shopping: Enviou 10, retornou 0 à fábrica -> vendeu 10
    // Total enviado fábrica = 20
    // Total sobras físicas = 2 (NÃO 4!)
    // Total vendido = 18 (NÃO 16!)
    const turnos: TurnoFechamentoInput[] = [
      {
        id: 'remessa_centro',
        local_id: 'pdv_centro',
        pdv_nome: 'PDV Centro',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [
          {
            produto_id: 'bolo_pote',
            nome: 'Bolo de Pote',
            preco_unitario: 10.0,
            qtd_enviada: 10,
            qtd_retorno: 2, // Sobraram 2 e retornaram à fábrica
          },
        ],
      },
      {
        id: 'remessa_shopping',
        local_id: 'pdv_shopping',
        pdv_nome: 'PDV Shopping',
        data: '2026-09-30',
        turno: 'integral',
        status: 'encerrado',
        valor_dinheiro_gaveta: 100.0,
        itens_grade: [
          {
            produto_id: 'bolo_pote',
            nome: 'Bolo de Pote',
            preco_unitario: 10.0,
            qtd_enviada: 10,
            qtd_retorno: 0, // Vendeu tudo, nada retornou à fábrica
          },
        ],
      },
    ];

    const res = apurarFechamentoUnificado(turnos, {
      pix: 0,
      cartao_debito: 0,
      cartao_credito: 0,
    });

    // 1. Total enviado à fábrica deve ser 20
    expect(res.total_enviado_fabrica).toBe(20);

    // 2. Sobras físicas devem ser estritamente 2 un (não 4!)
    expect(res.total_sobras_conferidas).toBe(2);

    // 3. Total vendido deve ser 18 un (não 16!)
    expect(res.total_vendido).toBe(18);

    // 4. Faturamento bruto: 18 * 10 = R$ 180,00
    expect(res.faturamento_bruto_esperado).toBe(180.0);
    expect(res.faturamento_liquido_esperado).toBe(180.0);

    // 5. Item consolidado
    expect(res.itens_consolidados).toHaveLength(1);
    expect(res.itens_consolidados[0].qtd_disponivel).toBe(20);
    expect(res.itens_consolidados[0].qtd_vendida).toBe(18);
    expect(res.itens_consolidados[0].faturamento_bruto).toBe(180.0);
    expect(res.itens_consolidados[0].tem_pendencia_sobra).toBe(false);
  });
});
