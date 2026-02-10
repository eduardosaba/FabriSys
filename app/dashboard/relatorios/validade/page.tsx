'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Calendar, Printer, AlertOctagon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/theme';

interface LoteValidade {
  id: number;
  insumo_nome: string;
  lote: string;
  validade: string;
  quantidade_entrada: number;
  unidade: string;
  dias_para_vencer: number;
  custo_estimado: number;
  valor_em_risco: number;
  status: 'vencido' | 'critico' | 'atencao' | 'ok';
}

export default function RelatorioValidadePage() {
  const { theme } = useTheme();
  const [lotes, setLotes] = useState<LoteValidade[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('movimentacao_estoque')
        .select(
          `
          id, lote, validade, quantidade,
          insumo:insumos(nome, unidade_estoque, custo_por_ue)
        `
        )
        .eq('tipo_movimento', 'entrada')
        .not('validade', 'is', null)
        .order('validade', { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const rows = (data ?? []) as unknown[];
      const processados: LoteValidade[] = rows.map((item) => {
        const it = item as Record<string, unknown>;
        const validadeStr = String(it['validade'] ?? '');
        const validade = new Date(validadeStr);
        validade.setHours(0, 0, 0, 0);

        const diffTime = validade.getTime() - hoje.getTime();
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: LoteValidade['status'] = 'ok';
        if (dias < 0) status = 'vencido';
        else if (dias <= 30) status = 'critico';
        else if (dias <= 60) status = 'atencao';

        const custo =
          Number((it['insumo'] as Record<string, unknown> | undefined)?.['custo_por_ue'] ?? 0) || 0;
        const qtd = Number(it['quantidade'] ?? 0) || 0;

        return {
          id: Number(it['id'] ?? 0),
          insumo_nome: String(
            (it['insumo'] as Record<string, unknown> | undefined)?.['nome'] ?? 'Desconhecido'
          ),
          lote: String(it['lote'] ?? '-'),
          validade: validadeStr,
          quantidade_entrada: qtd,
          unidade: String(
            (it['insumo'] as Record<string, unknown> | undefined)?.['unidade_estoque'] ?? 'UN'
          ),
          dias_para_vencer: dias,
          custo_estimado: custo,
          valor_em_risco: qtd * custo,
          status,
        };
      });

      const relevantes = processados.filter((l) => l.dias_para_vencer <= 180);
      setLotes(relevantes);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao buscar validades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  const vencidos = lotes.filter((l) => l.status === 'vencido');
  const criticos = lotes.filter((l) => l.status === 'critico');
  const valorTotalRisco = [...vencidos, ...criticos].reduce(
    (acc, curr) => acc + curr.valor_em_risco,
    0
  );

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      {/* CONTROLES DE TELA (Estes somem ao imprimir) */}
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Relatório de Validade (Lotes)"
          description="Acompanhamento de vencimentos e riscos de perda."
          icon={Calendar}
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer size={18} /> Imprimir Relatório
          </button>
        </PageHeader>

        {/* KPI de Risco Visual */}
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <AlertOctagon size={24} />
            </div>
            <div>
              <h3 className="text-red-900 font-bold text-lg">Valor em Risco Imediato</h3>
              <p className="text-red-700 text-sm">Soma de lotes vencidos ou vencendo em 30 dias.</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-700">
            {valorTotalRisco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      </div>

      {/* ÁREA IMPRESSA (Overlay que cobre tudo) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-8 print:w-screen print:h-auto print:overflow-visible print:border-0 print:shadow-none">
        {/* Cabeçalho Exclusivo para Impressão */}
        <div className="hidden print:flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <img
              src={theme?.company_logo_url ?? theme?.logo_url ?? '/logo.png'}
              alt="Logo"
              className="h-16 w-auto object-contain grayscale"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div>
              <h1 className="text-3xl font-bold text-black uppercase tracking-tight">
                Relatório de Validade
              </h1>
              <p className="text-sm text-gray-600 font-medium">
                {theme?.name || 'Confectio System'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Emissão</p>
            <p className="text-lg font-bold text-black">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Resumo de Risco na Impressão */}
        <div className="hidden print:flex justify-between items-center bg-gray-100 p-4 border border-gray-300 rounded mb-6">
          <span className="font-bold uppercase text-sm">Valor em Risco (Vencidos + Críticos):</span>
          <span className="font-bold text-xl">
            {valorTotalRisco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {/* Tabela */}
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 uppercase text-xs print:bg-gray-100 print:text-black print:border-black">
            <tr>
              <th className="px-6 py-3 print:px-2 print:py-1">Status</th>
              <th className="px-6 py-3 print:px-2 print:py-1">Produto</th>
              <th className="px-6 py-3 print:px-2 print:py-1">Lote</th>
              <th className="px-6 py-3 print:px-2 print:py-1">Vencimento</th>
              <th className="px-6 py-3 text-right print:px-2 print:py-1">Qtd Orig.</th>
              <th className="px-6 py-3 text-right print:px-2 print:py-1">Valor em Risco</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-gray-300">
            {lotes.map((item) => {
              // Estilização condicional
              let rowClass = '';
              let badgeClass = 'bg-slate-100 text-slate-600';
              let label = 'Em dia';
              let printStatus = '';

              if (item.status === 'vencido') {
                rowClass = 'bg-red-50/50 hover:bg-red-50';
                badgeClass = 'bg-red-100 text-red-700 font-bold';
                label = `VENCIDO (${Math.abs(item.dias_para_vencer)} dias)`;
                printStatus = 'font-bold text-black underline'; // Destaque na impressão P&B
              } else if (item.status === 'critico') {
                rowClass = 'bg-orange-50/30 hover:bg-orange-50';
                badgeClass = 'bg-orange-100 text-orange-700 font-bold';
                label = `Vence em ${item.dias_para_vencer} dias`;
              } else if (item.status === 'atencao') {
                badgeClass = 'bg-yellow-100 text-yellow-700';
                label = `Vence em ${item.dias_para_vencer} dias`;
              }

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${rowClass} print:break-inside-avoid`}
                >
                  <td className="px-6 py-3 print:px-2 print:py-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-transparent ${badgeClass} print:border-gray-400 print:bg-white print:text-black ${printStatus}`}
                    >
                      {label}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800 print:text-black print:px-2 print:py-1">
                    {item.insumo_nome}
                  </td>
                  <td className="px-6 py-3 font-mono text-slate-500 print:text-black print:px-2 print:py-1">
                    {item.lote}
                  </td>
                  <td className="px-6 py-3 print:text-black print:px-2 print:py-1">
                    {new Date(item.validade).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 text-right print:text-black print:px-2 print:py-1">
                    {item.quantidade_entrada} {item.unidade}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600 font-mono print:text-black print:px-2 print:py-1">
                    {item.valor_em_risco.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                </tr>
              );
            })}
            {lotes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhum lote com validade próxima encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Atenção: Itens vencidos devem ser descartados conforme normas sanitárias.</p>
        </div>
      </div>
    </div>
  );
}
