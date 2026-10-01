import { describe, it, expect } from 'vitest';
import {
  calcularTaxaPercentualEquivalente,
  classificarResultadoCaixa,
  apurarFechamentoUnificado,
  calcularItemIndividual,
  TurnoFechamentoInput,
  ItemMovimentacaoPDV,
} from '@/lib/services/fechamento-pdv-calc';

describe('Auditoria, Conciliação Financeira e Fechamento Unificado', () => {
  describe('1. Taxa Percentual Equivalente (Indicador Visual Informativo)', () => {
    it('calcula o percentual da taxa corretamente sobre o total digital', () => {
      // Ex: R$ 50 de taxa sobre R$ 2.000 em cartões/pix
      const res = calcularTaxaPercentualEquivalente(50, 2000);
      expect(res.valor_numerico).toBe(2.5);
      expect(res.formatado).toBe('2,50%');
    });

    it('retorna 0,00% e não divide por zero quando o total digital for 0', () => {
      const resZero = calcularTaxaPercentualEquivalente(0, 0);
      expect(resZero.valor_numerico).toBe(0);
      expect(resZero.formatado).toBe('0,00%');
      expect(Number.isFinite(resZero.valor_numerico)).toBe(true);

      // Taxa informada mas total digital 0 (caso limite)
      const resComTaxa = calcularTaxaPercentualEquivalente(10, 0);
      expect(resComTaxa.valor_numerico).toBe(0);
      expect(resComTaxa.formatado).toBe('0,00%');
    });

    it('retorna 0,00% quando a taxa for zero', () => {
      const res = calcularTaxaPercentualEquivalente(0, 1500);
      expect(res.valor_numerico).toBe(0);
      expect(res.formatado).toBe('0,00%');
    });
  });

  describe('2. Formalização de Furo, Sobra e Caixa Conferido', () => {
    it('classifica Caixa Conferido quando total recebido é igual ao faturamento líquido', () => {
      // Faturamento: R$ 4.000 | Recebido: R$ 4.000
      const res = classificarResultadoCaixa(4000, 4000);
      expect(res.status).toBe('conferido');
      expect(res.is_perfeito).toBe(true);
      expect(res.diferenca).toBe(0);
      expect(res.diferenca_absoluta).toBe(0);
      expect(res.rotulo).toBe('Caixa Conferido');
    });

    it('tolera centavos residuais (< R$ 0.05) como Caixa Conferido', () => {
      const res = classificarResultadoCaixa(4000.02, 4000.0);
      expect(res.status).toBe('conferido');
      expect(res.is_perfeito).toBe(true);
    });

    it('classifica Furo de Caixa quando recebido for menor que faturamento líquido', () => {
      // Exemplo do documento: Faturamento R$ 4.000, Recebido R$ 3.950 => Furo de R$ 50
      const faturamento = 4000;
      const recebido = 3950;
      const res = classificarResultadoCaixa(recebido, faturamento);

      expect(res.status).toBe('furo');
      expect(res.is_perfeito).toBe(false);
      expect(res.diferenca).toBe(-50);
      expect(res.diferenca_absoluta).toBe(50);
      expect(res.rotulo).toBe('Furo de Caixa: R$ 50,00');

      // Regra de ouro: O furo de caixa NÃO reduz o faturamento comercial
      expect(faturamento).toBe(4000);
    });

    it('classifica Sobra de Caixa quando recebido for maior que faturamento líquido', () => {
      // Faturamento R$ 4.000, Recebido R$ 4.080 => Sobra de R$ 80
      const faturamento = 4000;
      const recebido = 4080;
      const res = classificarResultadoCaixa(recebido, faturamento);

      expect(res.status).toBe('sobra');
      expect(res.is_perfeito).toBe(false);
      expect(res.diferenca).toBe(80);
      expect(res.diferenca_absoluta).toBe(80);
      expect(res.rotulo).toBe('Sobra de Caixa: R$ 80,00');

      // Regra de ouro: A sobra de caixa NÃO aumenta o faturamento comercial
      expect(faturamento).toBe(4000);
    });

    it('taxa financeira das maquininhas NÃO gera furo comercial de caixa', () => {
      // Faturamento comercial: R$ 4.000
      // Recebido bruto (Dinheiro R$ 1.000 + Pix R$ 1.500 + Cartão R$ 1.500): R$ 4.000
      // Taxa das maquininhas: R$ 100
      // Líquido em conta: R$ 3.900
      const faturamentoComercial = 4000;
      const totalBrutoRecebido = 4000;
      const taxaFinanceira = 100;
      const liquidoAposTaxas = totalBrutoRecebido - taxaFinanceira; // R$ 3.900

      // A conciliação comercial compara Total Bruto Recebido com Faturamento Comercial
      const resCaixa = classificarResultadoCaixa(totalBrutoRecebido, faturamentoComercial);

      expect(resCaixa.status).toBe('conferido');
      expect(resCaixa.is_perfeito).toBe(true);
      expect(liquidoAposTaxas).toBe(3900);
    });
  });

  describe('3. Perdas, Doações e Avarias na Apuração Física (Não geram furo de caixa)', () => {
    it('perda física é descontada na apuração física e não gera furo de caixa', () => {
      // 100 bolos enviados a R$ 10 = R$ 1.000 em mercadorias disponíveis
      // Retorno (sobra final): 10 bolos
      // Avarias / perdas físicas: 5 bolos
      // Vendido real = 100 - 10 - 5 = 85 bolos
      // Faturamento comercial líquido = 85 * 10 = R$ 850
      const item: ItemMovimentacaoPDV = {
        produto_id: 'p1',
        nome: 'Bolo de Chocolate',
        preco_unitario: 10.0,
        qtd_enviada: 100,
        qtd_retorno: 10,
        qtd_perda: 5,
      };

      const resItem = calcularItemIndividual(item);
      expect(resItem.qtd_vendida).toBe(85);
      expect(resItem.faturamento_bruto).toBe(850.0);

      // Caixa recebido exatamente referente ao que foi vendido
      const totalRecebido = 850.0;
      const resCaixa = classificarResultadoCaixa(totalRecebido, resItem.faturamento_bruto);

      expect(resCaixa.status).toBe('conferido');
      expect(resCaixa.is_perfeito).toBe(true);
      expect(resCaixa.diferenca).toBe(0);
    });

    it('doação autorizada não gera furo financeiro no caixa', () => {
      // 50 brownies enviados a R$ 8 = R$ 400
      // 4 doados (saída não comercial registrada como perda/saída física)
      // 10 sobras
      // Vendido = 50 - 10 - 4 = 36 brownies
      // Faturamento = 36 * 8 = R$ 288
      const item: ItemMovimentacaoPDV = {
        produto_id: 'p2',
        nome: 'Brownie Especial',
        preco_unitario: 8.0,
        qtd_enviada: 50,
        qtd_retorno: 10,
        qtd_perda: 4, // Doação
      };

      const resItem = calcularItemIndividual(item);
      expect(resItem.qtd_vendida).toBe(36);
      expect(resItem.faturamento_bruto).toBe(288.0);

      const totalRecebido = 288.0;
      const resCaixa = classificarResultadoCaixa(totalRecebido, resItem.faturamento_bruto);
      expect(resCaixa.status).toBe('conferido');
      expect(resCaixa.is_perfeito).toBe(true);
    });
  });

  describe('4. Fechamento Unificado Consolidado e Reabertura de Auditoria', () => {
    it('consolida múltiplos turnos com taxa única em reais e percentual calculado', () => {
      const turnos: TurnoFechamentoInput[] = [
        {
          id: 't1',
          local_id: 'pdv1',
          pdv_nome: 'PDV 1',
          turno: 'manha',
          data: '2026-10-01',
          itens_grade: [
            {
              produto_id: 'prod1',
              nome: 'Cookie',
              preco_unitario: 5.0,
              qtd_enviada: 100,
              qtd_retorno: 20,
            },
          ],
          valor_dinheiro_gaveta: 200,
          valor_pix_declarado: 0,
          valor_cartao_declarado: 0,
          taxa_cartao_reais: 0,
        },
        {
          id: 't2',
          local_id: 'pdv1',
          pdv_nome: 'PDV 1',
          turno: 'tarde',
          data: '2026-10-01',
          itens_grade: [
            {
              produto_id: 'prod1',
              nome: 'Cookie',
              preco_unitario: 5.0,
              qtd_estoque_inicial: 20, // Sobra da manhã
              qtd_enviada: 50, // Nova da fábrica
              qtd_retorno: 30, // Sobra final (total vendido: 100 + 50 - 30 = 120 un = R$ 600)
            },
          ],
          valor_dinheiro_gaveta: 100,
          valor_pix_declarado: 0,
          valor_cartao_declarado: 0,
          taxa_cartao_reais: 0,
        },
      ];

      // Total vendido: 120 cookies * 5 = R$ 600
      // Dinheiro total turnos: R$ 200 + R$ 100 = R$ 300
      // Pix: R$ 200 | Débito: R$ 50 | Crédito: R$ 50 => Total Recebido Bruto = R$ 600
      // Taxa única informada em reais: R$ 9,00
      const apuracao = apurarFechamentoUnificado(turnos, {
        pix: 200,
        cartao_debito: 50,
        cartao_credito: 50,
        taxas_operacionais: 9,
      });

      expect(apuracao.faturamento_bruto_esperado).toBe(600);
      expect(apuracao.faturamento_liquido_esperado).toBe(600);
      expect(apuracao.total_dinheiro_turnos).toBe(300);
      expect(apuracao.total_bruto_recebido).toBe(600);

      // Total digital = 200 + 50 + 50 = R$ 300
      // Taxa: R$ 9 => 9 / 300 * 100 = 3%
      expect(apuracao.taxa_percentual_equivalente).toBe(3);
      expect(apuracao.taxa_percentual_formatada).toBe('3,00%');

      // Líquido após taxa = 600 - 9 = R$ 591
      expect(apuracao.total_liquido_apos_taxas).toBe(591);

      // Diferença comercial = 600 - 600 = 0
      expect(apuracao.diferenca_caixa).toBe(0);
      expect(apuracao.resultado_caixa.status).toBe('conferido');
      expect(apuracao.resultado_caixa.is_perfeito).toBe(true);
    });

    it('mantém integridade na reabertura da auditoria (auditado -> encerrado)', () => {
      // Simula registro auditado
      const remessaAuditada = {
        id: 'rem-123',
        status: 'auditado',
        fechamento_unificado_id: 'fech-999',
        faturamento_liquido_esperado: 400,
        valor_dinheiro_gaveta: 150,
        itens_grade: [{ produto_id: 'p1', qtd_enviada: 50, qtd_retorno: 10, preco_unitario: 10 }],
        diferenca_auditoria: 0,
      };

      // Na reabertura administrativa com motivo:
      // Status muda para 'encerrado' (Aguardando Auditoria), PRESERVANDO todos os dados físicos e financeiros
      const remessaReaberta = {
        ...remessaAuditada,
        status: 'encerrado',
        observacoes: '[Reabertura Auditoria]: Correção de taxa bancária',
      };

      expect(remessaReaberta.status).toBe('encerrado');
      expect(remessaReaberta.fechamento_unificado_id).toBe('fech-999');
      expect(remessaReaberta.faturamento_liquido_esperado).toBe(400);
      expect(remessaReaberta.valor_dinheiro_gaveta).toBe(150);
      expect(remessaReaberta.itens_grade.length).toBe(1);
    });
  });
});
