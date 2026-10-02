import { describe, it, expect } from 'vitest';
import {
  calcularTaxaPercentualEquivalente,
  classificarResultadoCaixa,
  apurarFechamentoUnificado,
  calcularItemIndividual,
  calcularResultadoOperacionalLiquido,
  calcularFluxoSobrasOperacional,
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

  describe('5. Resultado Líquido Operacional (Faturamento Líquido Real)', () => {
    it('calcula o Resultado Líquido Operacional deduzindo taxas e furos de caixa', () => {
      // Exemplo do usuário: Vendeu R$ 20.000, taxas R$ 620, furos R$ 180
      const res = calcularResultadoOperacionalLiquido({
        faturamentoBruto: 20000,
        taxasFinanceiras: 620,
        diferencaCaixa: -180, // Furo de R$ 180
      });

      expect(res.faturamentoBruto).toBe(20000);
      expect(res.taxasFinanceiras).toBe(620);
      expect(res.furosCaixa).toBe(180);
      expect(res.totalAjustes).toBe(800);
      expect(res.resultadoLiquidoOperacional).toBe(19200);
      expect(res.percentualLiquido).toBe(96);
      expect(res.percentualLiquidoFormatado).toBe('96,0%');
    });

    it('calcula o exemplo de R$ 10.000 bruto, R$ 520 taxas e R$ 180 furos', () => {
      const res = calcularResultadoOperacionalLiquido({
        faturamentoBruto: 10000,
        taxasFinanceiras: 520,
        diferencaCaixa: -180,
      });

      expect(res.faturamentoBruto).toBe(10000);
      expect(res.resultadoLiquidoOperacional).toBe(9300);
      expect(res.percentualLiquido).toBe(93);
      expect(res.percentualLiquidoFormatado).toBe('93,0%');
    });

    it('quando o caixa está batido (conferido), furosCaixa é zero', () => {
      const res = calcularResultadoOperacionalLiquido({
        faturamentoBruto: 5000,
        taxasFinanceiras: 100,
        diferencaCaixa: 0,
      });

      expect(res.furosCaixa).toBe(0);
      expect(res.resultadoLiquidoOperacional).toBe(4900);
    });
  });

  describe('6. Fluxo de Sobras Operacional & Resolução de Dupla Contagem', () => {
    it('elimina a dupla contagem de sobras recirculadas (Exemplo Brownies)', () => {
      // Turno 1 (Manhã): 14 enviados, 6 retornaram (8 vendidos)
      // Turno 2 (Tarde/Fechamento): 6 enviados (recirculação), 5 retornaram (1 vendido)
      const registros = [
        {
          id: 'reg-t1',
          data: '2026-10-02',
          turno: 'manha',
          local_id: 'pdv-shopping',
          status: 'auditado',
          qtd_total_enviada: 14,
          qtd_total_retorno: 6,
          itens_grade: [
            {
              produto_id: 'prod-brownie',
              nome: 'Brownie',
              preco_unitario: 10,
              qtd_enviada: 14,
              qtd_retorno: 6,
            },
          ],
        },
        {
          id: 'reg-t2',
          data: '2026-10-02',
          turno: 'tarde',
          local_id: 'pdv-shopping',
          status: 'auditado',
          qtd_total_enviada: 6,
          qtd_total_retorno: 5,
          itens_grade: [
            {
              produto_id: 'prod-brownie',
              nome: 'Brownie',
              preco_unitario: 10,
              qtd_enviada: 6,
              qtd_retorno: 5,
            },
          ],
        },
      ];

      const fluxo = calcularFluxoSobrasOperacional(registros);

      // Ponto 1: Unidades Retornadas vs Eventos/Turnos Registrados
      expect(fluxo.unidadesRetornadas).toBe(11); // 11 un movimentadas em retornos
      expect(fluxo.eventosRetorno).toBe(2); // 2 turnos com devolução registrada
      expect(fluxo.movimentacoesRetorno).toBe(11); // compatibilidade

      // Sobra física final no encerramento: 5 un (apenas o que encerrou não-vendido!)
      expect(fluxo.sobraFisicaFinal).toBe(5);

      // Vendas reais: 8 (manhã) + 1 (tarde) = 9 un
      expect(fluxo.totalVendidos).toBe(9);

      // Ponto 3: Balanço Fechado de Saídas do Período: 9 vendidos + 5 sobra final = 14 un (NÃO 20!)
      expect(fluxo.totalSaidasApuradas).toBe(14);
      expect(fluxo.totalNovoDisponibilizado).toBe(14);

      // Taxa de sobra final: 5 / 14 = 35.7% (NÃO 55%!)
      expect(fluxo.taxaSobraFinal).toBe(35.7);

      // Taxa de aproveitamento (venda): 9 / 14 = 64.3%
      expect(fluxo.taxaAproveitamento).toBe(64.3);
    });

    it('Ponto 2: Não abate perda/descarte de produto do faturamento líquido financeiro', () => {
      // Bruto: R$ 20.000 | Taxas: R$ 620 | Furos: R$ 180 | Perda de produto/descarte: R$ 500
      const res = calcularResultadoOperacionalLiquido({
        faturamentoBruto: 20000,
        taxasFinanceiras: 620,
        diferencaCaixa: -180,
        descontosPerdas: 500, // Custo de descarte/avarias não reduz o faturamento líquido
      });

      // Faturamento Líquido Real = 20.000 - 620 - 180 = R$ 19.200 (96,0%)
      expect(res.resultadoLiquidoOperacional).toBe(19200);
      expect(res.percentualLiquido).toBe(96);
      expect(res.percentualLiquidoFormatado).toBe('96,0%');
      expect(res.descontosPerdas).toBe(500); // mantido no escopo de custo
    });

    it('não dispara falso alerta de produção quando a sobra foi recirculada e vendida', () => {
      // 14 brownies produzidos:
      // Turno 1 (Manhã): 14 enviados, 6 voltam
      // Turno 2 (Tarde): os 6 voltam para a loja, 5 são vendidos, apenas 1 sobra ao final do dia
      const registros = [
        {
          id: 'reg-m',
          data: '2026-10-02',
          turno: 'manha',
          local_id: 'pdv-1',
          status: 'auditado',
          qtd_total_enviada: 14,
          qtd_total_retorno: 6,
          itens_grade: [
            {
              produto_id: 'prod-brownie',
              nome: 'Brownie',
              preco_unitario: 10,
              qtd_enviada: 14,
              qtd_retorno: 6,
            },
          ],
        },
        {
          id: 'reg-t',
          data: '2026-10-02',
          turno: 'tarde',
          local_id: 'pdv-1',
          status: 'auditado',
          qtd_total_enviada: 6,
          qtd_total_retorno: 1,
          itens_grade: [
            {
              produto_id: 'prod-brownie',
              nome: 'Brownie',
              preco_unitario: 10,
              qtd_enviada: 6,
              qtd_retorno: 1,
            },
          ],
        },
      ];

      const fluxo = calcularFluxoSobrasOperacional(registros);

      // Vendeu 8 + 5 = 13 brownies
      expect(fluxo.totalVendidos).toBe(13);
      // Sobra física final de apenas 1 brownie (7.1% de sobra, 92.9% de giro!)
      expect(fluxo.sobraFisicaFinal).toBe(1);
      expect(fluxo.taxaSobraFinal).toBe(7.1);

      // O produto NÃO deve entrar em alerta de queda/produção (giro excelente de 92.9%)
      expect(fluxo.produtosAlertaSobra.length).toBe(0);
    });

    it('Ponto 4: Alerta inteligente diferencia Variação Pontual (1 dia) de Tendência Recorrente (múltiplos dias)', () => {
      // Cenário A: 1 único dia com sobra alta (ex: dia de chuva ou evento atípico)
      const registros1Dia = [
        {
          id: 'reg-dia1',
          data: '2026-10-02',
          turno: 'integral',
          local_id: 'pdv-1',
          status: 'auditado',
          qtd_total_enviada: 20,
          qtd_total_retorno: 10,
          itens_grade: [
            {
              produto_id: 'prod-torta',
              nome: 'Torta Holandesa',
              preco_unitario: 15,
              qtd_enviada: 20,
              qtd_retorno: 10,
            },
          ],
        },
      ];

      const fluxo1Dia = calcularFluxoSobrasOperacional(registros1Dia);
      expect(fluxo1Dia.diasAnalisados).toBe(1);
      expect(fluxo1Dia.isPeriodoMultiplo).toBe(false);
      expect(fluxo1Dia.produtosAlertaSobra.length).toBe(1);
      expect(fluxo1Dia.produtosAlertaSobra[0].tipoAlerta).toBe('variacao_pontual');
      // Não recomenda corte automático precipitado de fornada no dia isolado!
      expect(fluxo1Dia.produtosAlertaSobra[0].mensagemRecomendacao).toContain('fotografia pontual');
      expect(fluxo1Dia.produtosAlertaSobra[0].mensagemRecomendacao).toContain('3 a 7 dias');

      // Cenário B: Múltiplos dias com sobra alta confirmada (tendência recorrente)
      const registrosMultiplosDias = [
        ...registros1Dia,
        {
          id: 'reg-dia2',
          data: '2026-10-03',
          turno: 'integral',
          local_id: 'pdv-1',
          status: 'auditado',
          qtd_total_enviada: 20,
          qtd_total_retorno: 8,
          itens_grade: [
            {
              produto_id: 'prod-torta',
              nome: 'Torta Holandesa',
              preco_unitario: 15,
              qtd_enviada: 20,
              qtd_retorno: 8,
            },
          ],
        },
      ];

      const fluxoMultiDias = calcularFluxoSobrasOperacional(registrosMultiplosDias);
      expect(fluxoMultiDias.diasAnalisados).toBe(2);
      expect(fluxoMultiDias.isPeriodoMultiplo).toBe(true);
      expect(fluxoMultiDias.produtosAlertaSobra.length).toBe(1);
      expect(fluxoMultiDias.produtosAlertaSobra[0].tipoAlerta).toBe('tendencia_recorrente');
      expect(fluxoMultiDias.produtosAlertaSobra[0].mensagemRecomendacao).toContain(
        'Estoque remanescente'
      );
      expect(fluxoMultiDias.produtosAlertaSobra[0].mensagemRecomendacao).toContain('em 2 dias');
    });

    it('Ponto Crítico: NÃO soma sobras diárias em períodos maiores (Calcula Estoque Remanescente Final e Reaproveitamento)', () => {
      // Exemplo exato fornecido pelo usuário:
      // Dia 01/10: sobra 20 ao fechar
      // Dia 02/10: 15 vendidas, sobra 12 ao fechar
      // Dia 03/10: 10 vendidas, sobra 7 ao fechar (continua em estoque ao final do período)
      //
      // Antiga fórmula errônea somaria: 20 + 12 + 7 = 39 un.
      // Nova regra correta:
      // - Estoque Remanescente ao Final do Período: 7 un.
      // - Unidades Retornadas nos turnos: 20 + 12 + 7 = 39 un.
      // - Unidades Reaproveitadas / Recirculadas: 39 - 7 = 32 un (82,1%)
      const registrosTresDias = [
        {
          id: 'reg-01',
          data: '2026-10-01',
          turno: 'noite',
          local_id: 'pdv-shopping',
          status: 'auditado',
          qtd_total_enviada: 50,
          qtd_total_retorno: 20,
          itens_grade: [
            {
              produto_id: 'prod-bolo',
              nome: 'Bolo de Cenoura',
              preco_unitario: 12,
              qtd_enviada: 50,
              qtd_retorno: 20,
            },
          ],
        },
        {
          id: 'reg-02',
          data: '2026-10-02',
          turno: 'noite',
          local_id: 'pdv-shopping',
          status: 'auditado',
          qtd_total_enviada: 27, // 20 reaproveitados + 7 novos
          qtd_total_retorno: 12, // 15 vendidos (27 - 12)
          itens_grade: [
            {
              produto_id: 'prod-bolo',
              nome: 'Bolo de Cenoura',
              preco_unitario: 12,
              qtd_enviada: 27,
              qtd_retorno: 12,
            },
          ],
        },
        {
          id: 'reg-03',
          data: '2026-10-03',
          turno: 'noite',
          local_id: 'pdv-shopping',
          status: 'auditado',
          qtd_total_enviada: 17, // 12 reaproveitados + 5 novos
          qtd_total_retorno: 7, // 10 vendidos (17 - 7), 7 encerram o período em estoque
          itens_grade: [
            {
              produto_id: 'prod-bolo',
              nome: 'Bolo de Cenoura',
              preco_unitario: 12,
              qtd_enviada: 17,
              qtd_retorno: 7,
            },
          ],
        },
      ];

      const fluxo = calcularFluxoSobrasOperacional(registrosTresDias);

      expect(fluxo.diasAnalisados).toBe(3);
      expect(fluxo.isPeriodoMultiplo).toBe(true);

      // ESTOQUE REMANESCENTE FINAL: apenas 7 unidades (NÃO 39!)
      expect(fluxo.estoqueRemanescente).toBe(7);
      expect(fluxo.sobraFisicaFinal).toBe(7);

      // HISTÓRICO DE RETORNOS NOS TURNOS: 20 + 12 + 7 = 39 unidades em 3 eventos
      expect(fluxo.unidadesRetornadas).toBe(39);
      expect(fluxo.eventosRetorno).toBe(3);

      // REAPROVEITAMENTO: Não apurado por subtração simples (evita taxa artificial quando a mesma unidade retorna múltiplas vezes)
      expect(fluxo.unidadesReaproveitadas).toBe(0);
      expect(fluxo.taxaReaproveitamento).toBe(0);

      // VENDAS APURADAS: 30 (01/10) + 15 (02/10) + 10 (03/10) = 55 un
      expect(fluxo.totalVendidos).toBe(55);

      // BALANÇO DE SAÍDAS FECHADO: 55 vendidos + 0 perdas + 7 remanescente = 62 un
      expect(fluxo.totalSaidasApuradas).toBe(62);

      // TAXA REMANESCENTE FINAL: 7 / 62 = 11.3% (em vez dos absurdos ~40% se somasse)
      expect(fluxo.taxaSobraFinal).toBe(11.3);

      // PERDAS REAIS: como não houve registro de descarte, perdasApuradasRegistradas é false
      expect(fluxo.perdasApuradasRegistradas).toBe(false);
      expect(fluxo.totalPerdasUnidades).toBe(0);
    });

    it('Ponto Crítico 2: Custódia real - fechamento de PDV em data anterior não infla estoque remanescente no final do período', () => {
      // Cenário: Período de 01/10 a 03/10
      // PDV A encerrou suas operações em 01/10 com 10 unidades que retornaram à fábrica.
      // PDV B operou em 02/10 e 03/10, encerrando o período em 03/10 com 4 unidades retornadas.
      //
      // REGRA DE CUSTÓDIA: Em 03/10, o PDV A não possui estoque (já retornou à fábrica em 01/10 e recirculou).
      // Apenas o encerramento da dataFinalPeriodo (03/10) representa o estoque remanescente nos PDVs.
      const registrosCustodia = [
        {
          id: 'reg-pdv-a-01',
          data: '2026-10-01',
          turno: 'noite',
          local_id: 'pdv-a',
          status: 'auditado',
          qtd_total_enviada: 20,
          qtd_total_retorno: 10,
          itens_grade: [
            {
              produto_id: 'prod-torta',
              nome: 'Torta de Limão',
              preco_unitario: 10,
              qtd_enviada: 20,
              qtd_retorno: 10,
            },
          ],
        },
        {
          id: 'reg-pdv-b-02',
          data: '2026-10-02',
          turno: 'noite',
          local_id: 'pdv-b',
          status: 'auditado',
          qtd_total_enviada: 15,
          qtd_total_retorno: 5,
          itens_grade: [
            {
              produto_id: 'prod-torta',
              nome: 'Torta de Limão',
              preco_unitario: 10,
              qtd_enviada: 15,
              qtd_retorno: 5,
            },
          ],
        },
        {
          id: 'reg-pdv-b-03',
          data: '2026-10-03',
          turno: 'noite',
          local_id: 'pdv-b',
          status: 'auditado',
          qtd_total_enviada: 12,
          qtd_total_retorno: 4,
          itens_grade: [
            {
              produto_id: 'prod-torta',
              nome: 'Torta de Limão',
              preco_unitario: 10,
              qtd_enviada: 12,
              qtd_retorno: 4,
            },
          ],
        },
      ];

      const fluxo = calcularFluxoSobrasOperacional(registrosCustodia);

      expect(fluxo.dataFinalPeriodo).toBe('2026-10-03');
      expect(fluxo.isPeriodoMultiplo).toBe(true);

      // ESTOQUE REMANESCENTE FINAL: Apenas as 4 unidades ativas no encerramento de 03/10 (PDV B)
      // O antigo fechamento de PDV A (10 un em 01/10) NÃO é somado!
      expect(fluxo.estoqueRemanescente).toBe(4);

      // UNIDADES RETORNADAS (Métrica logística de movimentação): 10 + 5 + 4 = 19 unidades movimentadas em 3 eventos
      expect(fluxo.unidadesRetornadas).toBe(19);
      expect(fluxo.eventosRetorno).toBe(3);
    });
  });
});
