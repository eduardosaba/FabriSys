'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import { FilePieChart, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/Button';

export default function DREPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [dados, setDados] = useState<any>({
    faturamentoBruto: 0,
    custoInsumos: 0,
    despesasFixas: 0,
    lucroLiquido: 0,
    margemLiquida: 0,
    despesasPorCategoria: [] as any[],
  });

  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    void fetchDRE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, dataReferencia]);

  async function fetchDRE() {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const inicio = startOfMonth(dataReferencia).toISOString();
      const fim = endOfMonth(dataReferencia).toISOString();

      const { data: vendas } = await supabase
        .from('vendas')
        .select('total_venda')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'concluida')
        .eq('caixa_validado', true)
        .gte('created_at', inicio)
        .lte('created_at', fim);

      const { data: despesas } = await supabase
        .from('fin_contas_pagar')
        .select(`valor_total, categoria:fin_categorias_despesa(nome)`)
        .eq('organization_id', profile.organization_id)
        .eq('status', 'pago')
        .gte('data_pagamento', inicio)
        .lte('data_pagamento', fim);

      const faturamento = vendas?.reduce((acc: number, v: any) => acc + Number(v.total_venda || 0), 0) || 0;

      const catsMap: Record<string, number> = {};
      let totalDespesas = 0;

      (despesas || []).forEach((d: any) => {
        const catNome = d.categoria?.nome || 'Outros';
        catsMap[catNome] = (catsMap[catNome] || 0) + Number(d.valor_total || 0);
        totalDespesas += Number(d.valor_total || 0);
      });

      const lucro = faturamento - totalDespesas;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      setDados({
        faturamentoBruto: faturamento,
        custoInsumos: catsMap['Insumos / Matéria Prima'] || 0,
        despesasFixas: totalDespesas,
        lucroLiquido: lucro,
        margemLiquida: margem,
        despesasPorCategoria: Object.entries(catsMap).map(([nome, valor]) => ({ nome, valor })),
      });
    } catch (err) {
      console.error('Erro ao gerar DRE', err);
      toast.error('Erro ao gerar DRE');
    } finally {
      setLoading(false);
    }
  }

  const colors = ['#3b82f6', '#ef4444', '#eab308', '#10b981', '#a855f7', '#64748b', '#f97316'];

  const exportarPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    toast.loading('Gerando PDF...', { id: 'pdf' });
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const nomeArquivo = `DRE_${format(dataReferencia, 'MM_yyyy')}.pdf`;
      pdf.save(nomeArquivo);
      toast.success('PDF gerado com sucesso!', { id: 'pdf' });
    } catch (error) {
      console.error('Erro PDF:', error);
      toast.error('Erro ao gerar documento.', { id: 'pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <PageHeader
        title="DRE - Demonstrativo de Resultado"
        description="Visão contábil de lucro e prejuízo baseada em fluxo de caixa conferido."
        icon={FilePieChart}
      >
        <div className="flex gap-2">
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-blue-100"
            onChange={(e) => setDataReferencia(new Date(e.target.value))}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const d = subMonths(new Date(), i);
              return (
                <option key={i} value={d.toISOString()}>
                  {format(d, 'MMMM yyyy', { locale: ptBR })}
                </option>
              );
            })}
          </select>

          <Button variant="secondary" onClick={exportarPDF} loading={isExporting} icon={Download}>
            Exportar PDF
          </Button>
        </div>
      </PageHeader>

      <div ref={reportRef} className="space-y-6 p-4 bg-white rounded-xl">
        <div className="hidden print:block mb-4 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800 uppercase">Relatório de Performance Financeira</h1>
          <p className="text-sm text-slate-500">Mês de Referência: {format(dataReferencia, 'MMMM / yyyy', { locale: ptBR })}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
            <h3 className="font-bold text-slate-800 mb-4">Composição das Despesas</h3>
            <div className="flex-1" style={{ minWidth: 0, minHeight: 200 }}>
                {dados.despesasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={dados.despesasPorCategoria} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {dados.despesasPorCategoria.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Nenhuma despesa para exibir.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Estrutura de Resultados (Analítico)</h3>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">MÊS DE REFERÊNCIA</span>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="group">
                  <DRELine label="(+) RECEITA OPERACIONAL BRUTA" value={dados.faturamentoBruto} isMain />
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Vendas Totais Confirmadas</p>
                </div>

                <div className="pl-6 space-y-3 border-l-2 border-dashed border-slate-200">
                  {dados.despesasPorCategoria.map((cat: any, idx: number) => (
                    <DRELine key={idx} label={`(-) ${cat.nome}`} value={cat.valor} isNegative />
                  ))}

                  <div className="pt-2 border-t border-slate-100">
                    <DRELine label="TOTAL DE CUSTOS E DESPESAS" value={dados.despesasFixas} isNegative className="font-bold italic" />
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t-4 border-double border-slate-200">
                  <DRELine label="(=) RESULTADO LÍQUIDO DO PERÍODO" value={dados.lucroLiquido} isMain color={dados.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-400 uppercase font-bold">Ponto de Equilíbrio Atendido?</span>
                    <span className={`text-xs font-black uppercase ${dados.lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{dados.lucroLiquido >= 0 ? 'SIM ✅' : 'NÃO ❌'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 text-[10px] text-slate-400 text-center uppercase tracking-widest">Gerado automaticamente pelo Sistema SysLari em {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
    </div>
  );
}

function DRELine({ label, value, isMain = false, isNegative = false, color = '', className = '' }: any) {
  return (
    <div className={`flex justify-between items-center ${isMain ? 'text-lg font-black' : 'text-sm font-medium text-slate-600'} ${className}`}>
      <span className={isMain ? 'text-slate-800' : ''}>{label}</span>
      <span className={color || (isNegative ? 'text-red-500' : 'text-slate-800')}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </span>
    </div>
  );
}
