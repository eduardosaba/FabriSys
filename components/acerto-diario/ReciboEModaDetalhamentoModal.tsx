'use client';

import React, { useRef } from 'react';
import {
  Printer,
  X,
  Store,
  Calendar,
  Clock,
  User,
  PackageCheck,
  CreditCard,
  DollarSign,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';

export interface ReciboItemGrade {
  produto_id?: string;
  nome?: string;
  nome_produto?: string;
  preco_unitario: number;
  qtd_sobra_anterior?: number;
  qtd_enviada?: number;
  qtd_retorno?: number;
}

export interface ReciboRegistroData {
  id: string;
  data: string;
  turno?: string;
  vendedor_nome?: string;
  pdvNome: string;
  status: string;
  tipo_fechamento?: string;
  qtd_total_enviada?: number;
  qtd_total_retorno?: number;
  faturamento_bruto_teorico?: number;
  faturamento_liquido_esperado?: number;
  valor_dinheiro_gaveta?: number;
  valor_pix_declarado?: number;
  valor_cartao_declarado?: number;
  taxa_cartao_reais?: number;
  taxa_cartao_percentual?: number;
  diferenca_auditoria?: number;
  observacoes?: string;
  itens_grade?: ReciboItemGrade[];
  created_at?: string;
}

interface ReciboEModaDetalhamentoModalProps {
  data: ReciboRegistroData;
  onClose: () => void;
}

export default function ReciboEModaDetalhamentoModal({
  data,
  onClose,
}: ReciboEModaDetalhamentoModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return d && m && y ? `${d}/${m}/${y}` : dateStr;
  };

  const formatTurno = (turno?: string) => {
    if (!turno) return 'Dia Completo';
    switch (turno.toLowerCase()) {
      case 'manhatarde':
      case 'manha_tarde':
        return 'Manhã + Tarde (Integral)';
      case 'manha':
        return 'Manhã';
      case 'tarde':
        return 'Tarde';
      case 'noite':
        return 'Noite';
      default:
        return turno;
    }
  };

  const itens = Array.isArray(data.itens_grade) ? data.itens_grade : [];

  const totalEnviado = itens.reduce(
    (acc, it) => acc + (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0),
    0
  );
  const totalRetorno = itens.reduce((acc, it) => acc + (Number(it.qtd_retorno) || 0), 0);
  const totalVendido = Math.max(0, totalEnviado - totalRetorno);

  const dinheiro = Number(data.valor_dinheiro_gaveta || 0);
  const pix = Number(data.valor_pix_declarado || 0);
  const cartaoBruto = Number(data.valor_cartao_declarado || 0);
  const taxaReais = Number(data.taxa_cartao_reais || 0);
  const taxaPercent =
    Number(data.taxa_cartao_percentual || 0) ||
    (cartaoBruto > 0 ? (taxaReais / cartaoBruto) * 100 : 0);
  const cartaoLiquido = Math.max(0, cartaoBruto - taxaReais);
  const totalLiquido = dinheiro + pix + cartaoLiquido;
  const totalBruto = dinheiro + pix + cartaoBruto;

  const faturamentoEsperado =
    Number(data.faturamento_liquido_esperado || 0) || Number(data.faturamento_bruto_teorico || 0);
  const diferenca = Number(data.diferenca_auditoria || 0) || totalBruto - faturamentoEsperado;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      {/* Modal Box */}
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Visual (Web Only) */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Raio-X do Dia / Turno & Recibo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.pdvNome} • {formatDate(data.data)} ({formatTurno(data.turno)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Imprimir Recibo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content (Corpo do Recibo) */}
        <div
          className="overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200"
          ref={printRef}
        >
          {/* Estilo CSS exclusivo para Impressão */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .no-print {
                display: none !important;
              }
              .printable-receipt,
              .printable-receipt * {
                visibility: visible;
              }
              .printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 15px;
                background: white !important;
                color: black !important;
                font-family: monospace, sans-serif;
              }
            }
          `}</style>

          <div className="printable-receipt space-y-6">
            {/* Cabeçalho do Recibo */}
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                COMPROVANTE DE FECHAMENTO DE CAIXA
              </h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                FabriSys Confeitaria & PDVs
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-primary" /> {data.pdvNome}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Data: {formatDate(data.data)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Turno: {formatTurno(data.turno)}
                </span>
                {data.vendedor_nome && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-primary" /> Operador: {data.vendedor_nome}
                  </span>
                )}
              </div>
            </div>

            {/* Raio-X de Estoque e Produtos Vendidos */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 text-primary" /> Detalhamento de Produtos (Vendidos
                Reais)
              </h4>

              {itens.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Produto</th>
                        <th className="p-2.5 text-center">Disp.</th>
                        <th className="p-2.5 text-center">Sobra</th>
                        <th className="p-2.5 text-center">Vend.</th>
                        <th className="p-2.5 text-right">Preço</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {itens.map((it, idx) => {
                        const env =
                          (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
                        const ret = Number(it.qtd_retorno) || 0;
                        const vend = Math.max(0, env - ret);
                        const preco = Number(it.preco_unitario) || 0;
                        const totalItem = vend * preco;
                        const nomeProd = it.nome || it.nome_produto || 'Produto';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {nomeProd}
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-500">{env}</td>
                            <td className="p-2.5 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                              {ret}
                            </td>
                            <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                              {vend}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500">
                              {formatCurrency(preco)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(totalItem)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td className="p-2.5">Totais Consolidados</td>
                        <td className="p-2.5 text-center font-mono">{totalEnviado}</td>
                        <td className="p-2.5 text-center font-mono text-amber-600">
                          {totalRetorno}
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-600 text-sm">
                          {totalVendido} un
                        </td>
                        <td className="p-2.5 text-right" colSpan={2}>
                          {formatCurrency(faturamentoEsperado)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  Nenhum item detalhado na grade deste fechamento.
                </div>
              )}
            </div>

            {/* Borderô Financeiro & Conciliação de Valores */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600" /> Borderô Financeiro do Caixa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <Banknote className="h-4 w-4 text-emerald-600" /> Dinheiro em Gaveta:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(dinheiro)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <Smartphone className="h-4 w-4 text-purple-600" /> Pix Declarado:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(pix)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <CreditCard className="h-4 w-4 text-cyan-600" /> Cartão Bruto:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(cartaoBruto)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                    <DollarSign className="h-4 w-4 text-amber-600" /> Taxa Cartão/Maquininha:
                  </span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-200">
                    -{formatCurrency(taxaReais)} ({taxaPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Resumo Final de Faturamento Líquido */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Faturamento Teórico (Balcão/Grade):</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(faturamentoEsperado)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-extrabold text-sm pt-1 border-t border-slate-300 dark:border-slate-700">
                  <span>Total Líquido Real a Receber:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalLiquido)}
                  </span>
                </div>

                {Math.abs(diferenca) > 0.05 && (
                  <div
                    className={`mt-2 flex items-center justify-between rounded-xl p-2.5 font-bold ${
                      diferenca < 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {diferenca < 0 ? (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                      {diferenca < 0 ? 'Quebra / Furo de Caixa:' : 'Sobra no Caixa:'}
                    </span>
                    <span className="font-mono text-sm">{formatCurrency(Math.abs(diferenca))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Observações & Assinatura */}
            {data.observacoes && (
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="block text-slate-800 dark:text-slate-200 mb-0.5">
                  Observações:
                </strong>
                {data.observacoes}
              </div>
            )}

            <div className="pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 text-center space-y-8">
              <div className="flex justify-around text-xs text-slate-500">
                <div className="w-5/12 border-t border-slate-400 pt-1">
                  Assinatura Operador (PDV)
                </div>
                <div className="w-5/12 border-t border-slate-400 pt-1">
                  Assinatura Gerente / Conferência
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Documento gerado em {new Date().toLocaleString('pt-BR')} por FabriSys
              </p>
            </div>
          </div>
        </div>

        {/* Footer (Web Only) */}
        <div className="no-print flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            Imprimir Cupom / Recibo
          </button>
        </div>
      </div>
    </div>
  );
}
