'use client';

import { useState, useEffect, useCallback } from 'react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { PDVSelectorChips } from '@/components/ui/shared/PDVSelectorCards';

import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit3,
  Filter,
  Flame,
  Layers,
  Lock,
  Package,
  Percent,
  PieChart as PieChartIcon,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Unlock,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RomaneioRegistro {
  id: string;
  data: string;
  turno: string;
  vendedor_nome: string | null;
  modo_lancamento: string;
  tipo_fechamento?: string;
  qtd_total_enviada: number;
  qtd_total_retorno: number;
  itens_grade: Array<{
    produto_id: string;
    nome: string;
    preco_unitario: number;
    qtd_sobra_anterior?: number;
    qtd_enviada: number;
    qtd_retorno: number;
  }>;
  total_descontos_perdas: number;
  valor_dinheiro_gaveta: number;
  faturamento_bruto_teorico: number;
  faturamento_liquido_esperado: number;
  pix_cartao_esperado: number;
  valor_pix_declarado: number;
  valor_cartao_declarado: number;
  diferenca_auditoria: number;
  status: string;
  observacoes?: string | null;
  locais: { id: string; nome: string } | null;
}

interface RankingItem {
  nome: string;
  qtdVendida: number;
  faturamentoTotal: number;
}

interface ResumoPDV {
  localId: string;
  nome: string;
  qtdEnviada: number;
  qtdRetorno: number;
  qtdVendida: number;
  faturamentoLiquido: number;
  dinheiroGaveta: number;
  pixCartaoEsperado: number;
  diferencaTotal: number;
}

export default function AuditoriaPDVPage() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [registros, setRegistros] = useState<RomaneioRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [encerrandoDia, setEncerrandoDia] = useState(false);

  // Filtros Avançados de Período e PDV
  interface LocalPDV {
    id: string;
    nome: string;
  }
  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [tipoPeriodo, setTipoPeriodo] = useState<
    'dia' | 'mes' | 'trimestre' | 'semestre' | 'personalizado'
  >('dia');
  const [filtroPDV, setFiltroPDV] = useState<string>('todos');
  const [graficoModo, setGraficoModo] = useState<'evolucao' | 'pdv'>('evolucao');
  const [tipoGraficoVisual, setTipoGraficoVisual] = useState<'barras' | 'linhas' | 'area'>(
    'barras'
  );

  const PDV_COLORS = [
    '#2563eb',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#6366f1',
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [filtroData, setFiltroData] = useState<string>(now.toISOString().split('T')[0]);
  const [filtroMes, setFiltroMes] = useState<string>(currentMonthStr);
  const [filtroAno, setFiltroAno] = useState<number>(currentYear);
  const [filtroTrimestre, setFiltroTrimestre] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q3');
  const [filtroSemestre, setFiltroSemestre] = useState<'s1' | 's2'>('s2');
  const [dataInicio, setDataInicio] = useState<string>(now.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState<string>(now.toISOString().split('T')[0]);

  // Estados de Fechamento Noturno da Larissa (Extratos Reais)
  const [pixExtratoBanco, setPixExtratoBanco] = useState<number>(0);
  const [cartaoMaquininha, setCartaoMaquininha] = useState<number>(0);
  const [justificativaAuditoria, setJustificativaAuditoria] = useState<string>('');

  // Estado para Edição de Romaneio
  const [editingRecord, setEditingRecord] = useState<RomaneioRegistro | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Dias com Relatórios Financeiros pendentes de fechamento
  const [diasPendentes, setDiasPendentes] = useState<string[]>([]);

  // Carregar locais de PDV para o filtro
  useEffect(() => {
    async function carregarLocais() {
      if (!profile?.organization_id) return;
      try {
        const { data } = await supabase
          .from('locais')
          .select('id, nome, tipo')
          .eq('organization_id', profile.organization_id);

        if (data) {
          const pdvs = data.filter((loc) => {
            const t = String(loc.tipo || '').toLowerCase();
            const n = String(loc.nome || '').toLowerCase();
            return (
              t !== 'fabrica' &&
              t !== 'fábrica' &&
              t !== 'producao' &&
              t !== 'produção' &&
              !n.includes('fábrica') &&
              !n.includes('fabrica')
            );
          });
          setLocais(pdvs);
        }
      } catch (e) {
        console.error('Erro ao carregar locais:', e);
      }
    }
    carregarLocais();
  }, [profile?.organization_id]);

  const computeDateRange = useCallback(() => {
    if (tipoPeriodo === 'dia') {
      return { startDate: filtroData, endDate: filtroData };
    } else if (tipoPeriodo === 'mes') {
      const [yearStr, monthStr] = (filtroMes || currentMonthStr).split('-');
      const y = Number(yearStr) || currentYear;
      const m = Number(monthStr) || now.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      return {
        startDate: `${y}-${String(m).padStart(2, '0')}-01`,
        endDate: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    } else if (tipoPeriodo === 'trimestre') {
      const y = filtroAno;
      if (filtroTrimestre === 'q1') return { startDate: `${y}-01-01`, endDate: `${y}-03-31` };
      if (filtroTrimestre === 'q2') return { startDate: `${y}-04-01`, endDate: `${y}-06-30` };
      if (filtroTrimestre === 'q3') return { startDate: `${y}-07-01`, endDate: `${y}-09-30` };
      return { startDate: `${y}-10-01`, endDate: `${y}-12-31` };
    } else if (tipoPeriodo === 'semestre') {
      const y = filtroAno;
      if (filtroSemestre === 's1') return { startDate: `${y}-01-01`, endDate: `${y}-06-30` };
      return { startDate: `${y}-07-01`, endDate: `${y}-12-31` };
    } else {
      return { startDate: dataInicio || filtroData, endDate: dataFim || filtroData };
    }
  }, [
    tipoPeriodo,
    filtroData,
    filtroMes,
    filtroAno,
    filtroTrimestre,
    filtroSemestre,
    dataInicio,
    dataFim,
    currentMonthStr,
    currentYear,
  ]);

  const carregarDiasPendentes = useCallback(async () => {
    if (!profile?.organization_id) return;
    try {
      const { data } = await supabase
        .from('remessas_cargas_pdv')
        .select('data')
        .eq('organization_id', profile.organization_id)
        .not('status', 'in', '("auditado","conferido")')
        .order('data', { ascending: true });

      if (data) {
        const datasUnicas: string[] = Array.from(new Set(data.map((r: any) => String(r.data))));
        setDiasPendentes(datasUnicas);
      }
    } catch (err) {
      console.error('Erro ao buscar datas pendentes:', err);
    }
  }, [profile?.organization_id]);

  // Estado para Exclusão por Modal do Sistema
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  const handleSolicitarExclusao = (id: string, statusReg?: string) => {
    if (statusReg === 'auditado' || statusReg === 'conferido') {
      toast({
        title: 'Relatório Auditado & Bloqueado',
        description:
          'Não é permitido excluir relatórios de um dia já auditado. Acesse a tela de Fechamento Diário para reabrir o dia.',
        variant: 'warning',
      });
      return;
    }
    setDeleteRecordId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!deleteRecordId) return;
    try {
      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .delete()
        .eq('id', deleteRecordId);
      if (error) throw error;
      toast({
        title: 'Romaneio Excluído',
        description: 'O registro foi removido com sucesso.',
        variant: 'success',
      });
      await carregarDados();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'error' });
    } finally {
      setDeleteRecordId(null);
      setDeleteModalOpen(false);
    }
  };

  const handleAbrirEdicao = (reg: RomaneioRegistro) => {
    if (reg.status === 'auditado' || reg.status === 'conferido') {
      toast({
        title: 'Relatório Auditado & Bloqueado',
        description:
          'Não é permitido editar relatórios de um dia já auditado. Acesse a tela de Fechamento Diário para reabrir o dia.',
        variant: 'warning',
      });
      return;
    }
    setEditingRecord({ ...reg });
  };

  const handleSalvarEdicao = async () => {
    if (!editingRecord) return;
    if (editingRecord.status === 'auditado' || editingRecord.status === 'conferido') {
      toast({
        title: 'Edição Bloqueada',
        description: 'Não é permitido alterar relatórios auditados. Reabra o fechamento primeiro.',
        variant: 'warning',
      });
      return;
    }
    setSalvandoEdicao(true);
    try {
      const totalVendidos = Math.max(
        0,
        (editingRecord.qtd_total_enviada || 0) - (editingRecord.qtd_total_retorno || 0)
      );
      const precoMedio =
        editingRecord.qtd_total_enviada > 0 && editingRecord.faturamento_bruto_teorico > 0
          ? editingRecord.faturamento_bruto_teorico / editingRecord.qtd_total_enviada
          : 8.0;
      const faturamentoBruto = totalVendidos * precoMedio;
      const faturamentoLiquido = Math.max(
        0,
        faturamentoBruto - (editingRecord.total_descontos_perdas || 0)
      );
      const pixCartaoEsperado = Math.max(
        0,
        faturamentoLiquido - (editingRecord.valor_dinheiro_gaveta || 0)
      );
      const totalDeclarado =
        (editingRecord.valor_dinheiro_gaveta || 0) +
        (editingRecord.valor_pix_declarado || 0) +
        (editingRecord.valor_cartao_declarado || 0);
      const diferenca = totalDeclarado > 0 ? totalDeclarado - faturamentoLiquido : 0;

      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update({
          vendedor_nome: editingRecord.vendedor_nome,
          qtd_total_enviada: editingRecord.qtd_total_enviada,
          qtd_total_retorno: editingRecord.qtd_total_retorno,
          valor_dinheiro_gaveta: editingRecord.valor_dinheiro_gaveta,
          valor_pix_declarado: editingRecord.valor_pix_declarado,
          valor_cartao_declarado: editingRecord.valor_cartao_declarado,
          faturamento_bruto_teorico: faturamentoBruto,
          faturamento_liquido_esperado: faturamentoLiquido,
          pix_cartao_esperado: pixCartaoEsperado,
          diferenca_auditoria: diferenca,
          observacoes: editingRecord.observacoes,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: 'Romaneio Atualizado',
        description: 'Alterações salvas com sucesso.',
        variant: 'success',
      });
      setEditingRecord(null);
      await carregarDados();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExportarCSV = () => {
    if (registros.length === 0) {
      toast({ title: 'Aviso', description: 'Nenhum registro para exportar.', variant: 'warning' });
      return;
    }

    const headers = [
      'Data',
      'PDV',
      'Turno',
      'Atendente',
      'Tipo Fechamento',
      'Enviados',
      'Sobras',
      'Vendidos',
      'Faturamento Liquido (R$)',
      'Dinheiro Gaveta (R$)',
      'Pix/Cartao Esperado (R$)',
      'Pix Declarado (R$)',
      'Cartao Declarado (R$)',
      'Diferenca Auditoria (R$)',
      'Status',
      'Observacoes',
    ];

    const rows = registros.map((r) => {
      const vend = Math.max(0, (r.qtd_total_enviada || 0) - (r.qtd_total_retorno || 0));
      const tipoLabel =
        r.tipo_fechamento === 'parcial'
          ? 'Sobra em Loja'
          : r.tipo_fechamento === 'semanal'
            ? 'Semanal'
            : 'Diario Padrao';
      return [
        r.data,
        `"${(r.locais?.nome || 'PDV Geral').replace(/"/g, '""')}"`,
        r.turno || 'Integral',
        `"${(r.vendedor_nome || '—').replace(/"/g, '""')}"`,
        tipoLabel,
        r.qtd_total_enviada || 0,
        r.qtd_total_retorno || 0,
        vend,
        Number(r.faturamento_liquido_esperado || 0).toFixed(2),
        Number(r.valor_dinheiro_gaveta || 0).toFixed(2),
        Number(r.pix_cartao_esperado || 0).toFixed(2),
        Number(r.valor_pix_declarado || 0).toFixed(2),
        Number(r.valor_cartao_declarado || 0).toFixed(2),
        Number(r.diferenca_auditoria || 0).toFixed(2),
        r.status,
        `"${(r.observacoes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_fechamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Planilha Exportada!',
      description: 'Arquivo CSV baixado com sucesso.',
      variant: 'success',
    });
  };

  const handleExportarPDF = () => {
    if (registros.length === 0) {
      toast({ title: 'Aviso', description: 'Nenhum registro para exportar.', variant: 'warning' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const nomeEmpresa =
      profile?.organizations?.nome || profile?.organization_name || theme?.name || 'Larissa Saba';
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Executivo de Fechamentos PDV — ${nomeEmpresa}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #1e293b; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { font-size: 20px; margin: 0; color: #0f172a; }
            .header p { font-size: 12px; color: #64748b; margin: 4px 0 0 0; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 11px; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 16px; font-weight: bold; margin-top: 4px; color: #0284c7; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #475569; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${nomeEmpresa} — Relatório de Fechamentos & Auditoria PDV</h1>
              <p>Relatório Gerencial de Prestação de Contas</p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <p>Data Emissão: <strong>${dataAtual}</strong></p>
              <p>Total Lançamentos: <strong>${registros.length}</strong></p>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-title">Faturamento Total</div>
              <div class="kpi-value">R$ ${faturamentoTotalLiquido.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Dinheiro Físico</div>
              <div class="kpi-value" style="color: #059669;">R$ ${totalDinheiroGaveta.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Pix / Cartão Esperado</div>
              <div class="kpi-value" style="color: #0284c7;">R$ ${totalPixCartaoEsperado.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Diferença de Caixa</div>
              <div class="kpi-value" style="color: ${totalFurosDeCaixa > 0 ? '#dc2626' : '#059669'}">
                R$ ${totalFurosDeCaixa.toFixed(2)}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>PDV</th>
                <th>Turno</th>
                <th>Atendente</th>
                <th class="text-center">Tipo Fechamento</th>
                <th class="text-center">Env / Sobra / Vend</th>
                <th class="text-right">Faturamento (R$)</th>
                <th class="text-right">Dinheiro (R$)</th>
                <th class="text-right">Pix/Cartão (R$)</th>
                <th class="text-right">Diferença (R$)</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${registros
                .map((r) => {
                  const vend = Math.max(0, (r.qtd_total_enviada || 0) - (r.qtd_total_retorno || 0));
                  const tipoLabel =
                    r.tipo_fechamento === 'parcial'
                      ? '🔵 Sobra em Loja'
                      : r.tipo_fechamento === 'semanal'
                        ? '🟣 Semanal'
                        : '🟢 Padrão';
                  return `
                  <tr>
                    <td>${r.data}</td>
                    <td><strong>${r.locais?.nome || 'PDV Geral'}</strong></td>
                    <td style="text-transform: capitalize;">${r.turno || 'Integral'}</td>
                    <td>${r.vendedor_nome || '—'}</td>
                    <td class="text-center">${tipoLabel}</td>
                    <td class="text-center">${r.qtd_total_enviada || 0} / ${r.qtd_total_retorno || 0} / <strong>${vend}</strong></td>
                    <td class="text-right">R$ ${Number(r.faturamento_liquido_esperado || 0).toFixed(2)}</td>
                    <td class="text-right">R$ ${Number(r.valor_dinheiro_gaveta || 0).toFixed(2)}</td>
                    <td class="text-right">R$ ${Number(r.pix_cartao_esperado || 0).toFixed(2)}</td>
                    <td class="text-right" style="color: ${Number(r.diferenca_auditoria || 0) < 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
                      R$ ${Number(r.diferenca_auditoria || 0).toFixed(2)}
                    </td>
                    <td class="text-center">${r.status.toUpperCase()}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>${nomeEmpresa} — Documento gerado automaticamente para fins de controle interno.</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const carregarDados = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      await carregarDiasPendentes();
      const { startDate, endDate } = computeDateRange();

      let query = supabase
        .from('remessas_cargas_pdv')
        .select(
          `
          *,
          locais(id, nome)
        `
        )
        .eq('organization_id', profile.organization_id)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false });

      if (filtroPDV !== 'todos') {
        query = query.eq('local_id', filtroPDV);
      }

      const { data, error } = await query;

      if (!error && data) {
        setRegistros(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, computeDateRange, filtroPDV, carregarDiasPendentes]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // --- CONSOLIDAÇÃO FINANCEIRA E DE INDICADORES ---

  const totalEnviadoGeral = registros.reduce((acc, r) => acc + (r.qtd_total_enviada || 0), 0);
  const totalRetornoGeral = registros.reduce((acc, r) => acc + (r.qtd_total_retorno || 0), 0);
  const totalVendidosGeral = Math.max(0, totalEnviadoGeral - totalRetornoGeral);

  const faturamentoTotalLiquido = registros.reduce(
    (acc, r) => acc + Number(r.faturamento_liquido_esperado || 0),
    0
  );
  const totalDinheiroGaveta = registros.reduce(
    (acc, r) => acc + Number(r.valor_dinheiro_gaveta || 0),
    0
  );
  const totalPixCartaoEsperado = registros.reduce(
    (acc, r) => acc + Number(r.pix_cartao_esperado || 0),
    0
  );

  // Estimativa de CMV e Lucro Bruto (Supondo CMV médio de 35% nos doces da confeitaria)
  const cmvEstimadoPercentual = 0.35;
  const cmvEstimadoValor = faturamentoTotalLiquido * cmvEstimadoPercentual;
  const lucroBrutoEstimado = faturamentoTotalLiquido - cmvEstimadoValor;
  const taxaSobraPercentual =
    totalEnviadoGeral > 0 ? (totalRetornoGeral / totalEnviadoGeral) * 100 : 0;

  // --- NOVAS MÉTRICAS ANALÍTICAS DE AUDITORIA ---
  // 1. Eficiência de Produção & Giro de Remessa
  const taxaGiroPercentual =
    totalEnviadoGeral > 0 ? (totalVendidosGeral / totalEnviadoGeral) * 100 : 0;
  const ticketMedioUnitario =
    totalVendidosGeral > 0 ? faturamentoTotalLiquido / totalVendidosGeral : 0;

  // 2. Confiabilidade dos Operadores / Turnos
  const totalTurnos = registros.length;
  const turnosComFuro = registros.filter(
    (r) => Math.abs(Number(r.diferenca_auditoria || 0)) >= 0.5
  ).length;
  const turnosSemFuro = Math.max(0, totalTurnos - turnosComFuro);
  const indiceConfiabilidade = totalTurnos > 0 ? (turnosSemFuro / totalTurnos) * 100 : 100;

  // 3. Top Sobras (Alerta de Encalhe por Produto)
  interface SobraItem {
    nome: string;
    qtdRetorno: number;
  }
  const sobrasMap: Record<string, SobraItem> = {};
  registros.forEach((reg) => {
    if (reg.itens_grade && Array.isArray(reg.itens_grade)) {
      reg.itens_grade.forEach((item) => {
        const ret = Number(item.qtd_retorno || 0);
        if (ret > 0) {
          if (!sobrasMap[item.nome]) {
            sobrasMap[item.nome] = { nome: item.nome, qtdRetorno: 0 };
          }
          sobrasMap[item.nome].qtdRetorno += ret;
        }
      });
    }
  });
  const rankingSobras = Object.values(sobrasMap).sort((a, b) => b.qtdRetorno - a.qtdRetorno);
  const produtoMaiorSobra = rankingSobras.length > 0 ? rankingSobras[0] : null;

  const totalFurosDeCaixa = registros
    .filter((r) => r.diferenca_auditoria < -0.5)
    .reduce((acc, r) => acc + Math.abs(Number(r.diferenca_auditoria)), 0);

  const statusGeralDia =
    registros.length > 0 &&
    registros.every((r) => r.status === 'auditado' || r.status === 'conferido')
      ? 'auditado'
      : 'pendente';

  // --- CONCILIAÇÃO BANCÁRIA NOTURNA ---
  const pixReal = Number(pixExtratoBanco) || 0;
  const cartaoReal = Number(cartaoMaquininha) || 0;
  const totalDigitalRealDeclarado = pixReal + cartaoReal;
  const diferencaConciliacaoDigital =
    totalDigitalRealDeclarado > 0 ? totalDigitalRealDeclarado - totalPixCartaoEsperado : 0;

  // --- PREPARAÇÃO DE DADOS PARA GRÁFICOS (RECHARTS) ---

  // 1. Ranking dos Produtos Mais Vendidos
  const rankingMap: Record<string, RankingItem> = {};
  registros.forEach((reg) => {
    if (reg.itens_grade && Array.isArray(reg.itens_grade)) {
      reg.itens_grade.forEach((item) => {
        const vend = Math.max(0, (item.qtd_enviada || 0) - (item.qtd_retorno || 0));
        if (vend > 0) {
          if (!rankingMap[item.nome]) {
            rankingMap[item.nome] = { nome: item.nome, qtdVendida: 0, faturamentoTotal: 0 };
          }
          rankingMap[item.nome].qtdVendida += vend;
          rankingMap[item.nome].faturamentoTotal += vend * (item.preco_unitario || 0);
        }
      });
    }
  });
  const rankingProdutos = Object.values(rankingMap).sort((a, b) => b.qtdVendida - a.qtdVendida);

  // 2. Resumo e Gráfico por PDV
  const resumoPDVMap: Record<string, ResumoPDV> = {};
  registros.forEach((reg) => {
    const localId = reg.locais?.id || 'geral';
    const localNome = reg.locais?.nome || 'PDV Geral';
    const vend = Math.max(0, (reg.qtd_total_enviada || 0) - (reg.qtd_total_retorno || 0));

    if (!resumoPDVMap[localId]) {
      resumoPDVMap[localId] = {
        localId,
        nome: localNome,
        qtdEnviada: 0,
        qtdRetorno: 0,
        qtdVendida: 0,
        faturamentoLiquido: 0,
        dinheiroGaveta: 0,
        pixCartaoEsperado: 0,
        diferencaTotal: 0,
      };
    }

    resumoPDVMap[localId].qtdEnviada += reg.qtd_total_enviada || 0;
    resumoPDVMap[localId].qtdRetorno += reg.qtd_total_retorno || 0;
    resumoPDVMap[localId].qtdVendida += vend;
    resumoPDVMap[localId].faturamentoLiquido += Number(reg.faturamento_liquido_esperado || 0);
    resumoPDVMap[localId].dinheiroGaveta += Number(reg.valor_dinheiro_gaveta || 0);
    resumoPDVMap[localId].pixCartaoEsperado += Number(reg.pix_cartao_esperado || 0);
    resumoPDVMap[localId].diferencaTotal += Number(reg.diferenca_auditoria || 0);
  });

  const resumoPDVs = Object.values(resumoPDVMap).sort(
    (a, b) => b.faturamentoLiquido - a.faturamentoLiquido
  );

  const chartDataPDV = resumoPDVs.map((p) => ({
    name: p.nome.replace('Stand', 'St.').replace('Faculdade', 'Fac.'),
    Faturamento: p.faturamentoLiquido,
    Vendidos: p.qtdVendida,
  }));

  // 3. Gráfico de Rosca de Formas de Pagamento
  const chartDataPagamentos = [
    { name: 'Vendas em Dinheiro R$', value: totalDinheiroGaveta, color: '#10b981' },
    { name: 'Vendas em (Pix/Cartão)', value: totalPixCartaoEsperado, color: '#06b6d4' },
  ].filter((item) => item.value > 0);

  // 4. Gráfico de Evolução Temporal no Período (por data)
  const evolucaoMap: Record<string, number> = {};
  const sortedRegistros = [...registros].sort((a, b) => a.data.localeCompare(b.data));
  sortedRegistros.forEach((reg) => {
    const dataPartes = reg.data ? reg.data.split('-') : [];
    const labelData = dataPartes.length === 3 ? `${dataPartes[2]}/${dataPartes[1]}` : reg.data;
    evolucaoMap[labelData] =
      (evolucaoMap[labelData] || 0) + Number(reg.faturamento_liquido_esperado || 0);
  });

  const chartDataEvolucao = Object.entries(evolucaoMap).map(([dateLabel, total]) => ({
    name: dateLabel,
    Faturamento: total,
  }));

  // --- AÇÃO DE FECHAMENTO DEFINITIVO DO DIA ---
  const handleFinalizarDia = async () => {
    if (registros.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Não há relatórios financeiros registrados nesta data para fechar.',
        variant: 'warning',
      });
      return;
    }

    setEncerrandoDia(true);
    try {
      const ids = registros.map((r) => r.id);

      const updateData: any = {
        status: 'auditado',
        valor_pix_declarado: pixReal,
        valor_cartao_declarado: cartaoReal,
        diferenca_auditoria: diferencaConciliacaoDigital,
      };

      if (justificativaAuditoria.trim()) {
        updateData.observacoes = `[AUDITORIA]: ${justificativaAuditoria.trim()}`;
      }

      const { error } = await supabase.from('remessas_cargas_pdv').update(updateData).in('id', ids);

      if (error) throw error;

      toast({
        title: 'Dia Auditado & Finalizado com Sucesso!',
        description: `Todas as vendas do dia ${filtroData} foram validadas e registradas no sistema.`,
        variant: 'success',
      });

      carregarDados();
    } catch (err: any) {
      toast({ title: 'Erro ao encerrar dia', description: err.message, variant: 'error' });
    } finally {
      setEncerrandoDia(false);
    }
  };

  const handleReabrirFechamento = async (dataReabrir?: string) => {
    const targetData = dataReabrir || filtroData;
    if (!profile?.organization_id) return;
    try {
      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update({ status: 'aberto' })
        .eq('organization_id', profile.organization_id)
        .eq('data', targetData);

      if (error) throw error;

      toast({
        title: 'Fechamento Reaberto com Sucesso!',
        description: `O status do dia ${targetData.split('-').reverse().join('/')} voltou para 'Em Aberto'. Os relatórios dos PDVs foram liberados para edição.`,
        variant: 'success',
      });

      await carregarDados();
      await carregarDiasPendentes();
    } catch (err: any) {
      toast({ title: 'Erro ao reabrir fechamento', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 overflow-x-hidden space-y-6 p-2 sm:p-4 md:p-8">
      {/* Topo do Painel Gerencial & Auditoria */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text/80">
              Painel Gerencial, Analítico & Fechamento PDV
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                statusGeralDia === 'auditado'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {statusGeralDia === 'auditado' ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {tipoPeriodo === 'dia'
                ? statusGeralDia === 'auditado'
                  ? 'Dia Encerrado & Validado'
                  : 'Fechamento Em Aberto'
                : 'Visão Consolidada'}
            </span>
          </div>
          <p className="text-sm text-text/50">
            Análise de desempenho por PDV, faturamento consolidado por período (Dia, Mês, Trimestre,
            Semestre) e conciliação noturna.
          </p>
        </div>

        {statusGeralDia === 'auditado' && tipoPeriodo === 'dia' && (
          <button
            type="button"
            onClick={() => handleReabrirFechamento()}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 transition-all shrink-0 self-start md:self-auto"
          >
            <Unlock className="h-3.5 w-3.5" /> Reabrir Fechamento
          </button>
        )}
      </div>

      {/* Barra de Filtros Avançados: Granularidade Temporal & Seleção de PDV */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-1">
              <Filter className="h-4 w-4 text-primary ml-1.5" />
              <select
                value={tipoPeriodo}
                onChange={(e) => setTipoPeriodo(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-text/80 outline-none cursor-pointer px-1 py-1"
              >
                <option value="dia">Dia Específico</option>
                <option value="mes">Visão Mensal</option>
                <option value="trimestre">Visão Trimestral</option>
                <option value="semestre">Visão Semestral</option>
                <option value="personalizado">Período Personalizado</option>
              </select>
            </div>

            {/* Seletor de PDV por Chips Deslizáveis */}
            <PDVSelectorChips
              locais={locais}
              selectedId={filtroPDV}
              onSelect={(id) => setFiltroPDV(id)}
              todosLabel="Todos os PDVs (Visão Geral)"
            />

            {/* Campos Dinâmicos conforme Período Selecionado */}
            {tipoPeriodo === 'dia' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
                />
              </div>
            )}

            {tipoPeriodo === 'mes' && (
              <div className="flex items-center gap-1">
                <input
                  type="month"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
                />
              </div>
            )}

            {tipoPeriodo === 'trimestre' && (
              <div className="flex items-center gap-2">
                <select
                  value={filtroTrimestre}
                  onChange={(e) => setFiltroTrimestre(e.target.value as any)}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none"
                >
                  <option value="q1">1º Trimestre (Jan - Mar)</option>
                  <option value="q2">2º Trimestre (Abr - Jun)</option>
                  <option value="q3">3º Trimestre (Jul - Set)</option>
                  <option value="q4">4º Trimestre (Out - Dez)</option>
                </select>

                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(Number(e.target.value))}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none"
                >
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                </select>
              </div>
            )}

            {tipoPeriodo === 'semestre' && (
              <div className="flex items-center gap-2">
                <select
                  value={filtroSemestre}
                  onChange={(e) => setFiltroSemestre(e.target.value as any)}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none"
                >
                  <option value="s1">1º Semestre (Jan - Jun)</option>
                  <option value="s2">2º Semestre (Jul - Dez)</option>
                </select>

                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(Number(e.target.value))}
                  className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold outline-none"
                >
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                </select>
              </div>
            )}

            {tipoPeriodo === 'personalizado' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                />
                <span className="text-xs font-semibold text-text/50">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={carregarDados}
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all shrink-0 ml-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>

        {/* Linha Dedicada para Botões de Exportação */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 pt-3">
          <span className="text-xs font-semibold text-text/50">Exportação & Relatórios</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportarCSV}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" /> Excel (CSV)
            </button>

            <button
              type="button"
              onClick={handleExportarPDF}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-3.5 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 transition-all shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 text-cyan-600" /> PDF Executivo
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Alerta de Dias Pendentes de Fechamento */}
      {diasPendentes.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/40 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Atenção: {diasPendentes.length}{' '}
                  {diasPendentes.length === 1
                    ? 'dia possui Relatórios Financeiros pendentes de fechamento'
                    : 'dias possuem Relatórios Financeiros pendentes de fechamento'}
                </h4>
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Clique na data abaixo para auditar e realizar a conciliação bancária:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {diasPendentes.map((dt) => {
                    const formatada = dt.split('-').reverse().join('/');
                    const isSelected = dt === filtroData && tipoPeriodo === 'dia';
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => {
                          setTipoPeriodo('dia');
                          setFiltroData(dt);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                            : 'bg-amber-200/70 text-amber-950 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-100'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {formatada}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-amber-800/60 dark:text-amber-400/60 italic shrink-0">
              * Dias sem vendas (feriados/domingos) não geram pendências.
            </span>
          </div>
        </div>
      )}

      {/* Grid de KPIs do Período - Eficiência de Produção, Giro, Confiabilidade & Vendas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* KPI 1: Volume de Peças Faturadas */}
        <div className="flex flex-col justify-between rounded-2xl border border-primary/10 bg-background p-4 shadow-sm h-full min-h-[135px]">
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/60">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Peças Faturadas
            </span>
            <ShoppingBag className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          </div>
          <div className="my-auto py-1">
            <p className="font-mono text-2xl font-black text-purple-600 leading-none">
              {totalVendidosGeral.toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-text/50">un</span>
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/50 truncate">
            Total comercializado
          </div>
        </div>

        {/* KPI 2: Taxa de Giro da Remessa % (Conversão de Carga) */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm h-full min-h-[135px] ${
            taxaGiroPercentual >= 85
              ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20'
              : taxaGiroPercentual >= 70
                ? 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/20'
          }`}
        >
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/70">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Giro da Carga %
            </span>
            <Target
              className={`h-4 w-4 shrink-0 mt-0.5 ${taxaGiroPercentual >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}
            />
          </div>
          <div className="my-auto py-1">
            <p
              className={`font-mono text-2xl font-black leading-none ${taxaGiroPercentual >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}
            >
              {taxaGiroPercentual.toFixed(1)}%
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/60 truncate">
            {totalVendidosGeral} de {totalEnviadoGeral} enviadas
          </div>
        </div>

        {/* KPI 3: Taxa de Sobra / Retorno % */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm h-full min-h-[135px] ${
            taxaSobraPercentual > 15
              ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/20'
              : 'border-primary/10 bg-background'
          }`}
        >
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/60">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Índice de Sobra %
            </span>
            <Package className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          </div>
          <div className="my-auto py-1">
            <p className="font-mono text-2xl font-black text-amber-600 leading-none">
              {taxaSobraPercentual.toFixed(1)}%
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/50 truncate">
            {totalRetornoGeral} un retornadas
          </div>
        </div>

        {/* KPI 4: Ticket Médio Unitário (R$/Peça) */}
        <div className="flex flex-col justify-between rounded-2xl border border-primary/10 bg-background p-4 shadow-sm h-full min-h-[135px]">
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/60">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Ticket Médio / Peça
            </span>
            <DollarSign className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
          </div>
          <div className="my-auto py-1">
            <p className="font-mono text-2xl font-black text-cyan-700 dark:text-cyan-400 leading-none">
              R${' '}
              {ticketMedioUnitario.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/50 truncate">
            Preço médio praticado
          </div>
        </div>

        {/* KPI 5: Índice de Confiabilidade do Operador */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm h-full min-h-[135px] ${
            indiceConfiabilidade >= 90
              ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20'
          }`}
        >
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/70">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Confiabilidade
            </span>
            <ShieldCheck
              className={`h-4 w-4 shrink-0 mt-0.5 ${indiceConfiabilidade >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}
            />
          </div>
          <div className="my-auto py-1">
            <p
              className={`font-mono text-2xl font-black leading-none ${indiceConfiabilidade >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}
            >
              {indiceConfiabilidade.toFixed(0)}%
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/60 truncate">
            {turnosSemFuro} de {totalTurnos} turnos 100% OK
          </div>
        </div>

        {/* KPI 6: Diferenças nos Caixas R$ */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm h-full min-h-[135px] ${
            totalFurosDeCaixa > 0
              ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/20'
              : 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20'
          }`}
        >
          <div className="flex items-start justify-between min-h-[34px] gap-2 text-text/70">
            <span className="text-xs font-bold uppercase tracking-wide leading-tight">
              Diferenças R$
            </span>
            <AlertCircle
              className={`h-4 w-4 shrink-0 mt-0.5 ${totalFurosDeCaixa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            />
          </div>
          <div className="my-auto py-1">
            <p
              className={`font-mono text-2xl font-black leading-none ${totalFurosDeCaixa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              R${' '}
              {totalFurosDeCaixa.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="mt-auto border-t border-primary/5 pt-1.5 text-[11px] font-semibold text-text/60 truncate">
            {totalFurosDeCaixa > 0 ? `${turnosComFuro} turno(s) c/ furo` : 'Zero furos de caixa'}
          </div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS RECHARTS (VISUALIZAÇÃO DE DECISÃO) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico 1: Evolução Temporal ou Faturamento por PDV com Seletor de Cores e Tipo */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
              <BarChart2 className="h-4 w-4 text-primary" />
              {tipoPeriodo === 'dia'
                ? 'Faturamento por Ponto de Venda (PDV)'
                : 'Desempenho & Evolução do Período'}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Tipo de Gráfico (Barras / Linhas / Área) */}
              <div className="flex rounded-lg bg-primary/5 p-1 text-[11px] font-bold">
                <button
                  onClick={() => setTipoGraficoVisual('barras')}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    tipoGraficoVisual === 'barras'
                      ? 'bg-primary text-white shadow'
                      : 'text-text/60 hover:text-text'
                  }`}
                  title="Exibir como Gráfico de Barras"
                >
                  Barras
                </button>
                <button
                  onClick={() => setTipoGraficoVisual('linhas')}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    tipoGraficoVisual === 'linhas'
                      ? 'bg-primary text-white shadow'
                      : 'text-text/60 hover:text-text'
                  }`}
                  title="Exibir como Gráfico de Linhas"
                >
                  Linhas
                </button>
                <button
                  onClick={() => setTipoGraficoVisual('area')}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    tipoGraficoVisual === 'area'
                      ? 'bg-primary text-white shadow'
                      : 'text-text/60 hover:text-text'
                  }`}
                  title="Exibir como Gráfico de Área"
                >
                  Área
                </button>
              </div>

              {/* Seletor de Período vs PDV */}
              {tipoPeriodo !== 'dia' && (
                <div className="flex rounded-lg bg-primary/5 p-1 text-[11px] font-bold">
                  <button
                    onClick={() => setGraficoModo('evolucao')}
                    className={`rounded-md px-2 py-0.5 transition-all ${
                      graficoModo === 'evolucao'
                        ? 'bg-primary text-white shadow'
                        : 'text-text/60 hover:text-text'
                    }`}
                  >
                    Evolução
                  </button>
                  <button
                    onClick={() => setGraficoModo('pdv')}
                    className={`rounded-md px-2 py-0.5 transition-all ${
                      graficoModo === 'pdv'
                        ? 'bg-primary text-white shadow'
                        : 'text-text/60 hover:text-text'
                    }`}
                  >
                    Por PDV
                  </button>
                </div>
              )}
            </div>
          </div>

          {(() => {
            const chartData =
              graficoModo === 'evolucao' && tipoPeriodo !== 'dia'
                ? chartDataEvolucao
                : chartDataPDV;

            if (chartData.length === 0) {
              return (
                <div className="flex h-56 items-center justify-center text-xs text-text/40">
                  Nenhum dado de vendas registrado para o gráfico.
                </div>
              );
            }

            return (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGraficoVisual === 'barras' ? (
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any) => [
                          `R$ ${Number(value).toFixed(2)}`,
                          'Faturamento',
                        ]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Bar dataKey="Faturamento" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-pdv-${index}`}
                            fill={PDV_COLORS[index % PDV_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : tipoGraficoVisual === 'linhas' ? (
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any) => [
                          `R$ ${Number(value).toFixed(2)}`,
                          'Faturamento',
                        ]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Faturamento"
                        stroke="var(--primary-color, #2563eb)"
                        strokeWidth={3}
                        dot={{ r: 5, fill: 'var(--primary-color, #2563eb)' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorFaturamentoArea" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--primary-color, #2563eb)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--primary-color, #2563eb)"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any) => [
                          `R$ ${Number(value).toFixed(2)}`,
                          'Faturamento',
                        ]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Faturamento"
                        stroke="var(--primary-color, #2563eb)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorFaturamentoArea)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* Gráfico 2: Composição da Receita (Dinheiro Gaveta vs Digital) */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
            <PieChartIcon className="h-4 w-4 text-cyan-600" /> Distribuição da Receita
          </h2>

          {chartDataPagamentos.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-text/40">
              Aguardando recebimentos...
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataPagamentos}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataPagamentos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 1. INTELIGÊNCIA DE MIX DE PRODUTOS: TOP CAMPEÕES & ALERTA DE ENCALHE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Curva ABC / Top 3 Campeões de Venda */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/70">
              <Trophy className="h-4 w-4 text-amber-500" /> Curva ABC — Campeões de Venda no Período
            </h2>
            <span className="text-[11px] font-semibold text-text/50">
              {rankingProdutos.length} produto(s) movimentado(s)
            </span>
          </div>

          {rankingProdutos.length === 0 ? (
            <p className="p-4 text-center text-xs text-text/50">
              Nenhum produto registrado no romaneio detalhado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {rankingProdutos.slice(0, 3).map((prod, idx) => {
                const medalColors = [
                  'border-amber-400 bg-amber-50/80 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
                  'border-slate-300 bg-slate-50/80 text-slate-900 dark:bg-slate-900/30 dark:text-slate-200',
                  'border-amber-600/40 bg-orange-50/60 text-orange-950 dark:bg-orange-950/20 dark:text-orange-200',
                ];
                const medalBadges = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar'];

                return (
                  <div
                    key={prod.nome}
                    className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all hover:scale-[1.02] ${
                      medalColors[idx] || 'border-primary/10 bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">
                        {medalBadges[idx]}
                      </span>
                      <Flame className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-black truncate">{prod.nome}</h4>
                      <p className="mt-1 font-mono text-lg font-bold text-primary">
                        {prod.qtdVendida}{' '}
                        <span className="text-xs font-normal text-text/60">un vendidas</span>
                      </p>
                    </div>
                    <div className="mt-3 border-t border-primary/10 pt-2 text-right">
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                        R$ {prod.faturamentoTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerta de Encalhe / Top Sobras */}
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
              <TrendingDown className="h-4 w-4 text-rose-600" /> Alerta de Encalhe (Top Sobras)
            </h2>
            <AlertOctagon className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>

          {produtoMaiorSobra && produtoMaiorSobra.qtdRetorno > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-rose-300 bg-background p-3 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Maior volume retornado
                </span>
                <h4 className="text-base font-black text-text/90 mt-0.5">
                  {produtoMaiorSobra.nome}
                </h4>
                <p className="mt-1 font-mono text-xl font-black text-rose-600">
                  {produtoMaiorSobra.qtdRetorno}{' '}
                  <span className="text-xs font-semibold text-text/50">unidades sobraram</span>
                </p>
              </div>

              <div className="rounded-xl bg-amber-100/80 dark:bg-amber-950/40 p-3 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 font-medium">
                💡 <strong>Recomendação de Produção:</strong> Reduzir a fornada/remessa de{' '}
                <strong>{produtoMaiorSobra.nome}</strong> no próximo lote para evitar desperdícios.
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              ✅ Nenhuma sobra excessiva registrada no período! Giro de estoque 100% eficiente.
            </div>
          )}
        </div>
      </div>

      {/* 2. PERFORMANCE COMPARATIVA POR PDV & PARTICIPAÇÃO NO MIX (% SHARE) */}
      <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-primary/10 pb-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/70">
            <Store className="h-4 w-4 text-primary" /> Performance Comparativa por PDV &
            Participação no Mix (% Share)
          </h2>
          <span className="text-xs font-bold text-primary">
            {resumoPDVs.length} ponto(s) comparado(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resumoPDVs.map((pdv, index) => {
            const sharePercentual =
              faturamentoTotalLiquido > 0
                ? (pdv.faturamentoLiquido / faturamentoTotalLiquido) * 100
                : 0;
            const giroStand = pdv.qtdEnviada > 0 ? (pdv.qtdVendida / pdv.qtdEnviada) * 100 : 0;
            const cardColor = PDV_COLORS[index % PDV_COLORS.length];

            return (
              <div
                key={pdv.localId}
                className="flex flex-col justify-between rounded-2xl border border-primary/15 bg-background p-4 shadow-sm space-y-3 transition-all hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text/80 truncate">{pdv.nome}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                      style={{ backgroundColor: cardColor }}
                    >
                      {sharePercentual.toFixed(1)}% Share
                    </span>
                  </div>

                  <p className="mt-2 font-mono text-xl font-black text-primary">
                    R${' '}
                    {pdv.faturamentoLiquido.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>

                  {/* Barra de Progresso de Participação no Faturamento Total */}
                  <div className="mt-2 w-full rounded-full bg-primary/10 h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, sharePercentual)}%`,
                        backgroundColor: cardColor,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-primary/10 pt-2.5 text-xs text-text/70">
                  <div className="flex justify-between">
                    <span>Giro da Remessa:</span>
                    <span className="font-mono font-bold text-text/90">
                      {giroStand.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendidos / Enviados:</span>
                    <span className="font-mono font-semibold">
                      {pdv.qtdVendida} / {pdv.qtdEnviada} un
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diferença Acumulada:</span>
                    <span
                      className={`font-mono font-bold ${pdv.diferencaTotal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      R$ {pdv.diferencaTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD DE ALERTA E REDIRECIONAMENTO PARA O SUBMENU DEDICADO DE FECHAMENTO DIÁRIO */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-background to-primary/5 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text/80">
                Fechamento Diário & Conciliação Bancária
              </h3>
              {diasPendentes.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" /> {diasPendentes.length} dia(s) pendente(s)
                </span>
              )}
            </div>
            <p className="text-xs text-text/60 mt-0.5">
              {diasPendentes.length > 0
                ? `Existem ${diasPendentes.length} dia(s) com relatórios financeiros de PDV aguardando conferência e batimento dos extratos.`
                : 'Todos os caixas anteriores estão em dia. Acesse a tela dedicada para realizar novos batimentos de extrato.'}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/acerto-diario/fechamento"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-bold text-white bg-primary rounded-xl shadow hover:opacity-90 transition-all active:scale-95 shrink-0"
        >
          <span>Ir para Fechamento Diário</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Tabela de Relatórios Financeiros & Ranking dos Campeões */}
      <div className="space-y-6">
        {/* Tabela dos Relatórios Financeiros (Largura Total) */}
        <div className="overflow-hidden rounded-2xl border border-primary/10 bg-background shadow-sm w-full">
          <div className="border-b border-primary/10 bg-primary/5 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text/70">
              Detalhamento das Vendas & Financeiro do Dia ({filtroData})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-primary/10 bg-primary/5 font-bold uppercase text-text/50">
                <tr>
                  <th className="p-3">PDV / Turno</th>
                  <th className="p-3">Atendente</th>
                  <th className="p-3 text-center">Env / Sobra / Vend</th>
                  <th className="p-3 text-right">Líquido</th>
                  <th className="p-3 text-right text-emerald-700">Vendas em Dinheiro R$</th>
                  <th className="p-3 text-right text-cyan-700">Pix/Cartão Esperado</th>
                  <th className="p-3 text-right">Diferença</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-text/50">
                      Carregando Relatórios Financeiros...
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-text/50">
                      Nenhum Relatório Financeiro lançado nesta data.
                    </td>
                  </tr>
                ) : (
                  registros.map((reg) => {
                    const vend = Math.max(
                      0,
                      (reg.qtd_total_enviada || 0) - (reg.qtd_total_retorno || 0)
                    );

                    return (
                      <tr key={reg.id} className="hover:bg-primary/5 transition-colors">
                        <td className="p-3 font-semibold text-text/80">
                          <div className="flex items-center gap-1.5">
                            <span>{reg.locais?.nome || 'PDV Geral'}</span>
                            {reg.tipo_fechamento === 'parcial' && (
                              <span className="rounded-md bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 px-1.5 py-0.5 text-[9px] font-bold">
                                🔵 Sobra em Loja
                              </span>
                            )}
                            {reg.tipo_fechamento === 'semanal' && (
                              <span className="rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 text-[9px] font-bold">
                                🟣 Semanal
                              </span>
                            )}
                          </div>
                          {reg.turno && (
                            <span className="block text-[10px] text-text/40 capitalize">
                              {reg.turno}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-text/70">{reg.vendedor_nome || '—'}</td>
                        <td className="p-3 text-center font-mono">
                          <span className="text-text/50">{reg.qtd_total_enviada || 0}</span> /{' '}
                          <span className="text-amber-600">{reg.qtd_total_retorno || 0}</span> /{' '}
                          <span className="font-bold text-primary">{vend}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-text/90">
                          R$ {Number(reg.faturamento_liquido_esperado || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          R$ {Number(reg.valor_dinheiro_gaveta || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-700 dark:text-cyan-400">
                          R$ {Number(reg.pix_cartao_esperado || 0).toFixed(2)}
                          {(Number(reg.valor_pix_declarado || 0) > 0 ||
                            Number(reg.valor_cartao_declarado || 0) > 0) && (
                            <span className="block font-sans text-[10px] font-normal text-text/50">
                              Pix: R$ {Number(reg.valor_pix_declarado || 0).toFixed(2)} | Cartão: R${' '}
                              {Number(reg.valor_cartao_declarado || 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${Number(reg.diferenca_auditoria || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                        >
                          R$ {Number(reg.diferenca_auditoria || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                              reg.status === 'auditado' || reg.status === 'conferido'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {reg.status === 'auditado'
                              ? 'Auditado'
                              : reg.status === 'conferido'
                                ? 'Conferido'
                                : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {reg.status === 'auditado' || reg.status === 'conferido' ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-text/40 cursor-not-allowed"
                              title="Relatório auditado. Acesse Fechamento Diário para reabrir o dia."
                            >
                              <Lock className="h-3.5 w-3.5 text-text/40" /> Bloqueado
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAbrirEdicao(reg)}
                                title="Editar Romaneio"
                                className="rounded-lg p-1 text-text/60 hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSolicitarExclusao(reg.id, reg.status)}
                                title="Excluir Romaneio"
                                className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking de Doces Campeões (Posicionado Abaixo da Tabela) */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm w-full">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
            <Trophy className="h-4 w-4 text-amber-500" /> Produtos Campeões de Venda
          </h2>

          {loading ? (
            <p className="py-4 text-center text-xs text-text/50">Carregando ranking...</p>
          ) : rankingProdutos.length === 0 ? (
            <p className="py-4 text-center text-xs text-text/50">
              Lançamentos em modo detalhado geram o ranking de doces mais vendidos.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rankingProdutos.map((item, index) => (
                <div
                  key={item.nome}
                  className="flex items-center justify-between rounded-xl border border-primary/5 bg-background p-3 text-xs shadow-2xs hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono font-bold shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-700 font-black'
                          : index === 1
                            ? 'bg-slate-200 text-slate-700'
                            : index === 2
                              ? 'bg-amber-900/10 text-amber-900'
                              : 'bg-primary/5 text-text/50'
                      }`}
                    >
                      {index + 1}º
                    </span>
                    <span className="font-semibold text-text/80 truncate max-w-[140px]">
                      {item.nome}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-primary block">
                      {item.qtdVendida} un
                    </span>
                    <span className="block text-[10px] text-text/40 font-mono">
                      R$ {item.faturamentoTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Romaneio */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-primary/20 bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text/80">
                Editar Romaneio ({editingRecord.locais?.nome || 'PDV Geral'})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-text/50 hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-text/70">Atendente / Vendedor</label>
                <input
                  type="text"
                  value={editingRecord.vendedor_nome || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, vendedor_nome: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text/70">Qtd Enviada Total</label>
                <input
                  type="number"
                  min="0"
                  value={editingRecord.qtd_total_enviada || 0}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      qtd_total_enviada: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text/70">Qtd Retorno (Sobras)</label>
                <input
                  type="number"
                  min="0"
                  value={editingRecord.qtd_total_retorno || 0}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      qtd_total_retorno: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-700">Vendas em Dinheiro R$</label>
                <BRLCurrencyInput
                  value={editingRecord.valor_dinheiro_gaveta || 0}
                  onChange={(val) =>
                    setEditingRecord({ ...editingRecord, valor_dinheiro_gaveta: val })
                  }
                  placeholder="R$ 0,00"
                  className="mt-1 w-full rounded-xl border border-emerald-300 bg-emerald-50/30 px-3 py-2 text-sm font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text/70">Pix Declarado</label>
                <BRLCurrencyInput
                  value={editingRecord.valor_pix_declarado || 0}
                  onChange={(val) =>
                    setEditingRecord({ ...editingRecord, valor_pix_declarado: val })
                  }
                  placeholder="R$ 0,00"
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text/70">Cartão Declarado</label>
                <BRLCurrencyInput
                  value={editingRecord.valor_cartao_declarado || 0}
                  onChange={(val) =>
                    setEditingRecord({ ...editingRecord, valor_cartao_declarado: val })
                  }
                  placeholder="R$ 0,00"
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-text/70">Observações</label>
                <textarea
                  rows={2}
                  value={editingRecord.observacoes || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, observacoes: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-primary/10 pt-4">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="rounded-xl border border-primary/20 px-4 py-2 text-xs font-bold text-text/70 hover:bg-primary/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoEdicao}
                onClick={handleSalvarEdicao}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Padrão FabriSys */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteRecordId(null);
        }}
        onConfirm={handleConfirmarExclusao}
        title="Excluir Registro de Fechamento"
        message="Tem certeza que deseja excluir este registro de romaneio? Esta ação removerá o lançamento permanentemente."
        confirmText="Sim, Excluir Lançamento"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
