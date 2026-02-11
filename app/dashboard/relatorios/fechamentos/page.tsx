'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import { useTheme } from '@/lib/theme';
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  X,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Componente simples de Modal para ver detalhes
function DetalhesCaixaModal({ caixa, onClose }: { caixa: any; onClose: () => void }) {
  if (!caixa) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Detalhes do Fechamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Abertura</p>
              <p className="text-sm text-slate-700">
                {new Date(caixa.data_abertura).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Saldo Inicial: R$ {Number(caixa.saldo_inicial || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Fechamento</p>
              <p className="text-sm text-slate-700">
                {caixa.data_fechamento
                  ? new Date(caixa.data_fechamento).toLocaleString('pt-BR')
                  : 'Ainda aberto'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Conferência</p>
            <div className="flex justify-between text-sm mb-1">
              <span>Vendas (Sistema):</span>
              <span className="font-bold text-blue-600">
                R$ {Number(caixa.total_vendas_sistema || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Informado pelo Operador:</span>
              <span className="font-bold text-slate-700">
                R$ {Number(caixa.saldo_final_informado || 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-dashed my-2 pt-2 flex justify-between font-bold text-lg">
              <span>Diferença:</span>
              <span
                className={Number(caixa.diferenca || 0) < 0 ? 'text-red-600' : 'text-green-600'}
              >
                R$ {Number(caixa.diferenca || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">
              Observações do Operador
            </p>
            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-slate-700 italic">
              {caixa.observacoes || 'Nenhuma observação registrada.'}
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 text-right">
          <Button onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioFechamentosPage() {
  const { theme } = useTheme();
  const { profile, loading: authLoading } = useAuth();
  const [caixas, setCaixas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [caixaSelecionado, setCaixaSelecionado] = useState<any | null>(null);
  const [buscaLoja, setBuscaLoja] = useState('');

  useEffect(() => {
    async function carregarRelatorio() {
      setLoading(true);
      const [y, m] = mes.split('-');
      const inicio = `${mes}-01T00:00:00`;
      const ultimoDia = new Date(Number(y), Number(m), 0).getDate();
      const fim = `${mes}-${String(ultimoDia).padStart(2, '0')}T23:59:59`;

      // Determinar escopo para usuário PDV: mostrar apenas caixas do usuário e do PDV acessado
      let meuLocalId: string | null = (profile as any)?.local_id ?? null;
      if (!meuLocalId && profile && profile.role !== 'admin' && profile.role !== 'master') {
        // fallback: buscar primeiro local do tipo PDV
        try {
          const { data: locais } = await supabase
            .from('locais')
            .select('id')
            .eq('tipo', 'pdv')
            .limit(1);
          meuLocalId = locais?.[0]?.id ?? null;
        } catch (e) {
          console.warn('Não foi possível determinar local do usuário PDV:', e);
        }
      }

      let query = supabase
        .from('caixa_sessao')
        .select(`*, local:locais(nome)`)
        .gte('data_abertura', inicio)
        .lte('data_abertura', fim)
        .order('data_abertura', { ascending: false });

      if (profile && profile.role !== 'admin' && profile.role !== 'master') {
        // aplicar filtros por usuário e local para perfis PDV
        query = query.eq('usuario_abertura', profile.id);
        if (meuLocalId) query = query.eq('local_id', meuLocalId);
      }

      const { data, error } = await query;

      if (!error) setCaixas(data || []);
      setLoading(false);
    }

    if (authLoading) return;
    void carregarRelatorio();
  }, [mes, authLoading, profile]);

  // Cálculos de KPI (Resumo do Mês)
  const resumo = useMemo(() => {
    return caixas.reduce(
      (acc, caixa) => {
        if (caixa.status === 'fechado') {
          acc.totalVendido += caixa.total_vendas_sistema || 0;
          const dif = caixa.diferenca || 0;
          if (dif < 0) acc.totalQuebra += dif;
          if (dif > 0) acc.totalSobra += dif;
        }
        return acc;
      },
      { totalVendido: 0, totalQuebra: 0, totalSobra: 0 }
    );
  }, [caixas]);

  // Filtragem local
  const caixasFiltrados = caixas.filter((c) =>
    c.local?.nome?.toLowerCase().includes(buscaLoja.toLowerCase())
  );

  const exportarCSV = () => {
    const headers = [
      'Data',
      'Loja',
      'Status',
      'Saldo Inicial',
      'Vendas Sistema',
      'Informado',
      'Diferenca',
      'Obs',
    ];
    const csvContent = [
      headers.join(';'),
      ...caixasFiltrados.map((c) =>
        [
          new Date(c.data_abertura).toLocaleDateString(),
          c.local?.nome || 'Loja',
          c.status,
          Number(c.saldo_inicial || 0).toFixed(2),
          Number(c.total_vendas_sistema || 0).toFixed(2),
          Number(c.saldo_final_informado || 0).toFixed(2),
          Number(c.diferenca || 0).toFixed(2),
          `"${(c.observacoes || '').replace(/"/g, '""')}"`,
        ].join(';')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fechamentos_${mes}.csv`;
    link.click();
    toast.success('Relatório baixado!');
  };

  const exportarPDF = () => {
    const logo = theme?.company_logo_url ?? theme?.logo_url ?? '/logo.png';
    const issuedDate = new Date();

    const resumoHtml = `
      <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;background:#f8fafc;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;">Fechamentos - ${mes}</div>
          <div style="text-align:right;font-size:12px;color:#374151;">
            <div>Data de Emissão: ${issuedDate.toLocaleDateString('pt-BR')}</div>
            <div>${issuedDate.toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#111827;display:flex;gap:16px;">
          <div><strong>Total Vendido:</strong> ${Number(resumo.totalVendido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div><strong>Total Quebras:</strong> ${Number(resumo.totalQuebra || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div><strong>Total Sobras:</strong> ${Number(resumo.totalSobra || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div><strong>Registros:</strong> ${caixasFiltrados.length}</div>
        </div>
      </div>
    `;

    const rows = caixasFiltrados
      .map((c) => {
        const data = new Date(c.data_abertura).toLocaleString('pt-BR');
        const loja = c.local?.nome || 'Loja';
        const status = c.status || '';
        const saldoInicial = Number(c.saldo_inicial || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const vendas = Number(c.total_vendas_sistema || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const informado = Number(c.saldo_final_informado || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const diferenca = Number(c.diferenca || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6">${data}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6">${loja}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6">${status}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">${saldoInicial}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">${vendas}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">${informado}</td>
          <td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">${diferenca}</td>
        </tr>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Fechamentos ${mes}</title>
          <style>
            body{font-family:Inter,Arial,Helvetica,sans-serif;padding:20px;color:#111827}
            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #000;padding-bottom:12px}
            .logo{height:64px;object-fit:contain;filter:grayscale(100%)}
            table{border-collapse:collapse;width:100%;font-size:12px}
            th{background:#f3f4f6;text-align:left;padding:8px;border-bottom:1px solid #ddd}
            td{padding:8px;border-bottom:1px solid #eee}
            .summary{background:#f9fafb;padding:12px;border:1px solid #e5e7eb;margin-bottom:12px}
            @media print{ .no-print{display:none} }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex;gap:12px;align-items:center">
              <img src="${logo}" class="logo" onerror="this.style.display='none'" />
              <div>
                <h1 style="margin:0;font-size:20px">Histórico de Caixas</h1>
                <div style="font-size:13px;color:#6b7280">${theme?.name ?? 'Confectio System'}</div>
              </div>
            </div>
            <div style="text-align:right;font-size:12px;color:#374151">
              <div>Emitido em: ${issuedDate.toLocaleDateString('pt-BR')}</div>
              <div>${issuedDate.toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>

          ${resumoHtml}

          <table>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Loja</th>
                <th>Status</th>
                <th style="text-align:right">Saldo Inicial</th>
                <th style="text-align:right">Vendas (Sist.)</th>
                <th style="text-align:right">Informado</th>
                <th style="text-align:right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center">Relatório gerado pelo sistema. Conferência física recomendada.</div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      toast.error(
        'Não foi possível abrir a janela de impressão. Verifique bloqueadores de pop-up.'
      );
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Histórico de Caixas"
        description="Auditoria financeira e controle de quebras de caixa."
        icon={FileText}
      />

      {/* Cards de Resumo (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <CheckCircle size={14} className="text-blue-500" /> Total Vendido (Sistema)
          </span>
          <span className="text-2xl font-bold text-blue-700 mt-1">
            R$ {Number(resumo.totalVendido || 0).toFixed(2)}
          </span>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-red-600 uppercase flex items-center gap-1">
            <TrendingDown size={14} /> Total de Quebras (Prejuízo)
          </span>
          <span className="text-2xl font-bold text-red-700 mt-1">
            R$ {Number(resumo.totalQuebra || 0).toFixed(2)}
          </span>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-green-600 uppercase flex items-center gap-1">
            <TrendingUp size={14} /> Total de Sobras
          </span>
          <span className="text-2xl font-bold text-green-700 mt-1">
            R$ {Number(resumo.totalSobra || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-slate-400" />
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="border p-2 rounded-lg bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por loja..."
              value={buscaLoja}
              onChange={(e) => setBuscaLoja(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg bg-slate-50 text-sm w-48 focus:w-64 transition-all outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportarCSV} variant="primary" icon={Download} className="text-xs h-9">
            Exportar CSV
          </Button>
          <Button onClick={exportarPDF} variant="secondary" icon={FileText} className="text-xs h-9">
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Tabela de Relatório */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3 text-right">Saldo Inicial</th>
                <th className="px-4 py-3 text-right">Vendas (Sist.)</th>
                <th className="px-4 py-3 text-center">Diferença</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {caixasFiltrados.map((caixa) => {
                const dataAbertura = new Date(caixa.data_abertura);
                const isFechado = caixa.status === 'fechado';
                const diff = Number(caixa.diferenca || 0);

                return (
                  <tr key={caixa.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {dataAbertura.toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {dataAbertura.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {!isFechado && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold border border-green-200">
                          ABERTO AGORA
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {caixa.local?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {Number(caixa.saldo_inicial || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold">
                      {Number(caixa.total_vendas_sistema || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isFechado ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <span
                          className={`font-mono font-bold px-2 py-1 rounded ${diff < -0.5 ? 'bg-red-100 text-red-700' : diff > 0.5 ? 'bg-green-100 text-green-700' : 'text-slate-400'}`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setCaixaSelecionado(caixa)}
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                        title="Ver Detalhes e Observações"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {caixasFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-slate-400 flex flex-col items-center justify-center"
                  >
                    <AlertTriangle size={32} className="mb-2 opacity-50" />
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetalhesCaixaModal caixa={caixaSelecionado} onClose={() => setCaixaSelecionado(null)} />
    </div>
  );
}
