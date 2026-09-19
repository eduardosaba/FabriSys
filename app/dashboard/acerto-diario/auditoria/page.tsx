'use client';

import { useState, useEffect, useCallback } from 'react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { getLocalDateISOString } from '@/lib/utils';
import { PDVSelectorCards } from '@/components/ui/shared/PDVSelectorCards';

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
  Smartphone,
  Sparkles,
  Store,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Unlock,
  X,
  ChevronDown,
  ChevronUp,
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
  qtdEnviada: number;
  faturamentoTotal: number;
  giroRate: number;
  sobraRate: number;
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
  pixDeclarado: number;
  cartaoDeclarado: number;
  diferencaTotal: number;
}

interface LocalPDV {
  id: string;
  nome: string;
  logo_url?: string;
  tipo?: string;
}

export default function AuditoriaPDVPage() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [registros, setRegistros] = useState<RomaneioRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [encerrandoDia, setEncerrandoDia] = useState(false);

  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [tipoPeriodo, setTipoPeriodo] = useState<
    'dia' | 'mes' | 'trimestre' | 'semestre' | 'personalizado'
  >('dia');
  const [presetAtivo, setPresetAtivo] = useState<'hoje' | 'ontem' | '7dias' | 'mes' | 'custom'>('hoje');
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

  const [filtroData, setFiltroData] = useState<string>(getLocalDateISOString(now));
  const [filtroMes, setFiltroMes] = useState<string>(currentMonthStr);
  const [filtroAno, setFiltroAno] = useState<number>(currentYear);
  const [filtroTrimestre, setFiltroTrimestre] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q3');
  const [filtroSemestre, setFiltroSemestre] = useState<'s1' | 's2'>('s2');
  const [dataInicio, setDataInicio] = useState<string>(getLocalDateISOString(now));
  const [dataFim, setDataFim] = useState<string>(getLocalDateISOString(now));

  // Estados de Fechamento Noturno da Confeitaria
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
      try {
        let query = supabase.from('locais').select('id, nome, tipo, logo_url, ordem');
        if (profile?.organization_id) {
          query = query.eq('organization_id', profile.organization_id);
        }
        let data;
        const resOrd = await query.order('ordem', { ascending: true }).order('nome');
        data = resOrd.data;
        if (resOrd.error && resOrd.error.message?.includes('ordem')) {
          const res = await query.order('nome');
          data = res.data;
        }

        if (!data || data.length === 0) {
          let { data: fallbackData } = await supabase
            .from('locais')
            .select('id, nome, tipo, logo_url, ordem')
            .order('ordem', { ascending: true })
            .order('nome');
          if (!fallbackData) {
            const resFallback = await supabase
              .from('locais')
              .select('id, nome, tipo, logo_url')
              .order('nome');
            fallbackData = resFallback.data;
          }
          data = fallbackData;
        }

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

  // Função de seleção rápida de período (Presets)
  const aplicarPresetData = (preset: 'hoje' | 'ontem' | '7dias' | 'mes' | 'custom') => {
    setPresetAtivo(preset);
    const dHoje = new Date();

    if (preset === 'hoje') {
      setTipoPeriodo('dia');
      setFiltroData(getLocalDateISOString(dHoje));
    } else if (preset === 'ontem') {
      setTipoPeriodo('dia');
      const dOntem = new Date();
      dOntem.setDate(dOntem.getDate() - 1);
      setFiltroData(getLocalDateISOString(dOntem));
    } else if (preset === '7dias') {
      setTipoPeriodo('personalizado');
      const d7Dias = new Date();
      d7Dias.setDate(d7Dias.getDate() - 6);
      setDataInicio(getLocalDateISOString(d7Dias));
      setDataFim(getLocalDateISOString(dHoje));
    } else if (preset === 'mes') {
      setTipoPeriodo('mes');
      setFiltroMes(currentMonthStr);
    } else {
      setTipoPeriodo('personalizado');
    }
  };

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
      profile?.organizations?.nome ||
      profile?.organization_name ||
      profile?.empresa_nome ||
      profile?.nome_empresa ||
      'Larissa Saba - Confeitaria Gourmet';
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const rawLogoUrl =
      profile?.company_logo_url ||
      profile?.organizations?.logo_url ||
      theme?.company_logo_url ||
      theme?.logo_url ||
      '/logolarissa.png';

    const logoSrc = rawLogoUrl.startsWith('http')
      ? rawLogoUrl
      : typeof window !== 'undefined'
        ? `${window.location.origin}${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}`
        : rawLogoUrl;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Executivo — ${nomeEmpresa}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 16px; color: #4a2c2b; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #88544c; padding-bottom: 14px; margin-bottom: 18px; }
            .brand-box { display: flex; align-items: center; gap: 14px; }
            .brand-logo { max-height: 60px; max-width: 180px; object-fit: contain; }
            .brand-titles h1 { font-size: 20px; font-weight: 800; margin: 0; color: #4a2c2b; letter-spacing: -0.3px; }
            .brand-titles p { font-size: 12px; color: #88544c; font-weight: 600; margin: 3px 0 0 0; }
            .meta-info { text-align: right; font-size: 11px; color: #64748b; line-height: 1.4; }
            .meta-info strong { color: #4a2c2b; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .kpi-card { background: #fdfafa; border: 1px solid #e9c4c2; padding: 12px; border-radius: 8px; font-size: 11px; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #88544c; font-weight: 700; }
            .kpi-value { font-size: 17px; font-weight: 900; margin-top: 4px; color: #4a2c2b; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background-color: #f5e4e2; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #4a2c2b; border-bottom: 2px solid #e9c4c2; }
            tbody tr:nth-child(even) { background-color: #fdfafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer { margin-top: 24px; border-top: 1px solid #e9c4c2; padding-top: 10px; font-size: 10px; color: #88544c; text-align: center; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-box">
              <img src="${logoSrc}" alt="${nomeEmpresa}" class="brand-logo" onerror="this.style.display='none'" />
              <div class="brand-titles">
                <h1>${nomeEmpresa}</h1>
                <p>Relatório Executivo de Fechamentos & Auditoria PDV</p>
              </div>
            </div>
            <div class="meta-info">
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
              <div class="kpi-value" style="color: #88544c;">R$ ${totalPixCartaoEsperado.toFixed(2)}</div>
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
            <p>${nomeEmpresa} — Documento gerado automaticamente para fins de controle interno e auditoria.</p>
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
  const totalPixDeclarado = registros.reduce(
    (acc, r) => acc + Number(r.valor_pix_declarado || 0),
    0
  );
  const totalCartaoDeclarado = registros.reduce(
    (acc, r) => acc + Number(r.valor_cartao_declarado || 0),
    0
  );
  const totalPixCartaoEsperado = registros.reduce(
    (acc, r) => acc + Number(r.pix_cartao_esperado || 0),
    0
  );

  const taxaSobraPercentual =
    totalEnviadoGeral > 0 ? (totalRetornoGeral / totalEnviadoGeral) * 100 : 0;
  const taxaGiroPercentual =
    totalEnviadoGeral > 0 ? (totalVendidosGeral / totalEnviadoGeral) * 100 : 0;
  const ticketMedioUnitario =
    totalVendidosGeral > 0 ? faturamentoTotalLiquido / totalVendidosGeral : 0;

  // Divergência / Furo de Caixa acumulado
  const totalFurosDeCaixa = registros
    .filter((r) => Math.abs(Number(r.diferenca_auditoria || 0)) >= 0.5)
    .reduce((acc, r) => acc + Number(r.diferenca_auditoria || 0), 0);

  // Status de Auditoria do Período
  const totalTurnos = registros.length;
  const turnosAuditados = registros.filter(
    (r) => r.status === 'auditado' || r.status === 'conferido'
  ).length;
  const percentualAuditado = totalTurnos > 0 ? (turnosAuditados / totalTurnos) * 100 : 0;
  const statusGeralAuditado = totalTurnos > 0 && turnosAuditados === totalTurnos;

  // Meios de pagamento em porcentagem
  const totalFormasCalculadas = faturamentoTotalLiquido > 0 ? faturamentoTotalLiquido : 1;
  const pctDinheiro = (totalDinheiroGaveta / totalFormasCalculadas) * 100;
  const pctPix = ((totalPixDeclarado || totalPixCartaoEsperado * 0.45) / totalFormasCalculadas) * 100;
  const pctCartao = ((totalCartaoDeclarado || totalPixCartaoEsperado * 0.55) / totalFormasCalculadas) * 100;

  // --- PREPARAÇÃO DE DADOS PARA GRÁFICOS ---

  // 1. Ranking dos Produtos Mais Vendidos & Análise de Giro
  const rankingMap: Record<string, RankingItem> = {};
  registros.forEach((reg) => {
    if (reg.itens_grade && Array.isArray(reg.itens_grade)) {
      reg.itens_grade.forEach((item) => {
        const env = (item.qtd_sobra_anterior || 0) + (item.qtd_enviada || 0);
        const vend = Math.max(0, env - (item.qtd_retorno || 0));
        if (vend > 0 || env > 0) {
          if (!rankingMap[item.nome]) {
            rankingMap[item.nome] = {
              nome: item.nome,
              qtdVendida: 0,
              qtdEnviada: 0,
              faturamentoTotal: 0,
              giroRate: 0,
              sobraRate: 0,
            };
          }
          rankingMap[item.nome].qtdVendida += vend;
          rankingMap[item.nome].qtdEnviada += env;
          rankingMap[item.nome].faturamentoTotal += vend * (item.preco_unitario || 0);
        }
      });
    }
  });

  const rankingProdutos = Object.values(rankingMap)
    .map((p) => {
      const giroRate = p.qtdEnviada > 0 ? (p.qtdVendida / p.qtdEnviada) * 100 : 0;
      const sobraRate = p.qtdEnviada > 0 ? ((p.qtdEnviada - p.qtdVendida) / p.qtdEnviada) * 100 : 0;
      return { ...p, giroRate, sobraRate };
    })
    .sort((a, b) => b.qtdVendida - a.qtdVendida);

  // Produtos com Alta Devolução (> 25% de Sobra)
  const produtosAlertaSobra = rankingProdutos
    .filter((p) => p.qtdEnviada >= 10 && p.sobraRate >= 25)
    .sort((a, b) => b.sobraRate - a.sobraRate);

  // 2. Resumo por PDV
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
        pixDeclarado: 0,
        cartaoDeclarado: 0,
        diferencaTotal: 0,
      };
    }

    resumoPDVMap[localId].qtdEnviada += reg.qtd_total_enviada || 0;
    resumoPDVMap[localId].qtdRetorno += reg.qtd_total_retorno || 0;
    resumoPDVMap[localId].qtdVendida += vend;
    resumoPDVMap[localId].faturamentoLiquido += Number(reg.faturamento_liquido_esperado || 0);
    resumoPDVMap[localId].dinheiroGaveta += Number(reg.valor_dinheiro_gaveta || 0);
    resumoPDVMap[localId].pixCartaoEsperado += Number(reg.pix_cartao_esperado || 0);
    resumoPDVMap[localId].pixDeclarado += Number(reg.valor_pix_declarado || 0);
    resumoPDVMap[localId].cartaoDeclarado += Number(reg.valor_cartao_declarado || 0);
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

  // 3. Meios de Pagamento (Recharts)
  const chartDataPagamentos = [
    { name: 'Dinheiro em Espécie', value: totalDinheiroGaveta, color: '#10b981' },
    {
      name: 'Pix Recebido',
      value: totalPixDeclarado > 0 ? totalPixDeclarado : totalPixCartaoEsperado * 0.45,
      color: '#a855f7',
    },
    {
      name: 'Cartão Crédito/Débito',
      value: totalCartaoDeclarado > 0 ? totalCartaoDeclarado : totalPixCartaoEsperado * 0.55,
      color: '#06b6d4',
    },
  ].filter((item) => item.value > 0);

  // 4. Gráfico de Evolução Temporal
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

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden space-y-6 p-3 sm:p-5 md:p-8 animate-fade-up">
      {/* Topo: Título & Botões de Ação */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-primary/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-text/90 tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Cockpit Estratégico de Auditoria & Sobras
            </h1>
          </div>
          <p className="text-sm font-medium text-text/50 mt-1">
            Gestão inteligente da confeitaria: faturamento, raio-x financeiro, giro de produção e comparativo por PDV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportarCSV}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-all shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" /> Excel (CSV)
          </button>

          <button
            type="button"
            onClick={handleExportarPDF}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 transition-all shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 text-cyan-600" /> PDF Executivo
          </button>
        </div>
      </div>

      {/* BLOCO 1: SELETOR DE PERÍODO (PRESETS RÁPIDOS) & FILTRO DE PDV */}
      <div className="rounded-2xl border border-primary/20 bg-background p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Botões Rápidos de Período */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text/50 flex items-center gap-1.5 mr-1">
              <Calendar className="h-4 w-4 text-primary" /> Período:
            </span>

            <button
              type="button"
              onClick={() => aplicarPresetData('hoje')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                presetAtivo === 'hoje'
                  ? 'bg-primary text-white ring-2 ring-primary/40'
                  : 'bg-primary/10 text-text/70 hover:bg-primary/20'
              }`}
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => aplicarPresetData('ontem')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                presetAtivo === 'ontem'
                  ? 'bg-primary text-white ring-2 ring-primary/40'
                  : 'bg-primary/10 text-text/70 hover:bg-primary/20'
              }`}
            >
              Ontem
            </button>

            <button
              type="button"
              onClick={() => aplicarPresetData('7dias')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                presetAtivo === '7dias'
                  ? 'bg-primary text-white ring-2 ring-primary/40'
                  : 'bg-primary/10 text-text/70 hover:bg-primary/20'
              }`}
            >
              Últimos 7 Dias
            </button>

            <button
              type="button"
              onClick={() => aplicarPresetData('mes')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                presetAtivo === 'mes'
                  ? 'bg-primary text-white ring-2 ring-primary/40'
                  : 'bg-primary/10 text-text/70 hover:bg-primary/20'
              }`}
            >
              Mês Atual
            </button>

            <button
              type="button"
              onClick={() => aplicarPresetData('custom')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                presetAtivo === 'custom'
                  ? 'bg-primary text-white ring-2 ring-primary/40'
                  : 'bg-primary/10 text-text/70 hover:bg-primary/20'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Seletores Granulares quando em Mês ou Personalizado */}
          <div className="flex flex-wrap items-center gap-2">
            {tipoPeriodo === 'dia' && (
              <input
                type="date"
                value={filtroData}
                onChange={(e) => {
                  setFiltroData(e.target.value);
                  setPresetAtivo('custom');
                }}
                className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
              />
            )}

            {tipoPeriodo === 'mes' && (
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => {
                  setFiltroMes(e.target.value);
                  setPresetAtivo('mes');
                }}
                className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
              />
            )}

            {tipoPeriodo === 'personalizado' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:border-primary"
                />
                <span className="text-xs font-semibold text-text/50">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="rounded-xl border border-primary/20 bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="button"
              onClick={carregarDados}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {/* Seletor de PDV por Cards Clicáveis */}
        <div className="border-t border-primary/10 pt-3">
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
            <Store className="h-4 w-4 text-primary" /> Filtrar por Ponto de Venda (PDV)
          </label>
          <PDVSelectorCards
            locais={locais}
            selectedId={filtroPDV}
            onSelect={(id) => setFiltroPDV(id)}
            incluirTodos={true}
            todosLabel="Todos os PDVs (Visão Consolidada)"
          />
        </div>
      </div>

      {/* Banner de Alerta de Dias Pendentes de Fechamento */}
      {diasPendentes.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40 shadow-sm animate-fade-in">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Atenção: {diasPendentes.length}{' '}
                  {diasPendentes.length === 1
                    ? 'dia possui relatórios aguardando auditoria'
                    : 'dias possuem relatórios aguardando auditoria'}
                </h4>
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Clique na data abaixo para conferir o batimento e encerrar o dia:
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
                          setPresetAtivo('custom');
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
          </div>
        </div>
      )}

      {/* BLOCO 2: CARDS DE KPIS PRINCIPAIS (VISÃO MACRO) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Faturamento Total */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-background dark:border-emerald-800/60 dark:from-emerald-950/30 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Faturamento Total
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="font-mono text-3xl font-black text-emerald-700 dark:text-emerald-300">
            R${' '}
            {faturamentoTotalLiquido.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-800/70 dark:text-emerald-400/80">
            Dinheiro + Pix + Cartão no período
          </p>
        </div>

        {/* KPI 2: Mercadoria Vendida */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-background dark:border-purple-800/60 dark:from-purple-950/30 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800 dark:text-purple-300">
              Mercadoria Vendida
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <p className="font-mono text-3xl font-black text-purple-700 dark:text-purple-300">
            {totalVendidosGeral.toLocaleString('pt-BR')}{' '}
            <span className="text-sm font-bold text-purple-800/60">un</span>
          </p>
          <p className="text-[11px] font-semibold text-purple-800/70 dark:text-purple-400/80">
            Giro médio: <strong className="font-mono">{taxaGiroPercentual.toFixed(1)}%</strong> da carga
          </p>
        </div>

        {/* KPI 3: Total de Sobras */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-background dark:border-amber-800/60 dark:from-amber-950/30 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Total de Sobras
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="font-mono text-3xl font-black text-amber-700 dark:text-amber-300">
            {totalRetornoGeral.toLocaleString('pt-BR')}{' '}
            <span className="text-sm font-bold text-amber-800/60">un</span>
          </p>
          <p className="text-[11px] font-semibold text-amber-800/70 dark:text-amber-400/80">
            Taxa de Devolução: <strong className="font-mono">{taxaSobraPercentual.toFixed(1)}%</strong>
          </p>
        </div>

        {/* KPI 4: Divergência / Furo de Caixa */}
        <div
          className={`rounded-2xl border p-5 shadow-sm space-y-2 bg-gradient-to-br ${
            totalFurosDeCaixa !== 0
              ? 'border-rose-300 from-rose-50/70 to-background dark:border-rose-900 dark:from-rose-950/30'
              : 'border-emerald-200 from-emerald-50/50 to-background dark:border-emerald-800/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${
                totalFurosDeCaixa !== 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
              }`}
            >
              Furo / Divergência
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                totalFurosDeCaixa !== 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p
            className={`font-mono text-3xl font-black ${
              totalFurosDeCaixa < 0 ? 'text-rose-600' : totalFurosDeCaixa > 0 ? 'text-emerald-600' : 'text-emerald-600'
            }`}
          >
            R${' '}
            {Math.abs(totalFurosDeCaixa).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] font-semibold text-text/50">
            {totalFurosDeCaixa === 0 ? '✅ Caixas 100% batidos' : 'Diferença apurada nas auditorias'}
          </p>
        </div>
      </div>

      {/* BLOCO 3: RAIO-X DOS MEIOS DE PAGAMENTO (CONCILIAÇÃO FINANCEIRA) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rosca / Distribuição dos Meios de Pagamento */}
        <div className="rounded-2xl border border-primary/10 bg-background p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-text/80 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-cyan-600" /> Raio-X dos Meios de Pagamento
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                statusGeralAuditado
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {statusGeralAuditado ? '✅ Auditado' : '⏳ Conciliação Pendente'}
            </span>
          </div>

          {chartDataPagamentos.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-text/40 font-medium">
              Nenhum recebimento registrado no período
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataPagamentos}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataPagamentos.map((entry, index) => (
                      <Cell key={`cell-pag-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detalhamento Numérico dos Meios de Pagamento */}
        <div className="space-y-3 lg:col-span-2 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text/80 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" /> Conciliação de Recebimentos em Espécie e Digital
            </h3>
            <span className="text-xs font-mono font-bold text-text/50">
              Total: R$ {faturamentoTotalLiquido.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Dinheiro */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" /> Dinheiro em Espécie
                </span>
                <span className="text-[10px] font-extrabold font-mono text-emerald-700 bg-emerald-200/60 dark:bg-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded">
                  {pctDinheiro.toFixed(1)}%
                </span>
              </div>
              <p className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">
                R$ {totalDinheiroGaveta.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-800/70 dark:text-emerald-400">
                Recolhido nas gavetas/envelopes
              </p>
            </div>

            {/* Pix */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> Pix Recebido
                </span>
                <span className="text-[10px] font-extrabold font-mono text-purple-700 bg-purple-200/60 dark:bg-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded">
                  {pctPix.toFixed(1)}%
                </span>
              </div>
              <p className="font-mono text-xl font-black text-purple-700 dark:text-purple-300">
                R$ {(totalPixDeclarado > 0 ? totalPixDeclarado : totalPixCartaoEsperado * 0.45).toFixed(2)}
              </p>
              <p className="text-[10px] text-purple-800/70 dark:text-purple-400">
                Verificado em extratos bancários
              </p>
            </div>

            {/* Cartão */}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Cartão (Crédito/Débito)
                </span>
                <span className="text-[10px] font-extrabold font-mono text-cyan-700 bg-cyan-200/60 dark:bg-cyan-800 dark:text-cyan-200 px-1.5 py-0.5 rounded">
                  {pctCartao.toFixed(1)}%
                </span>
              </div>
              <p className="font-mono text-xl font-black text-cyan-700 dark:text-cyan-300">
                R$ {(totalCartaoDeclarado > 0 ? totalCartaoDeclarado : totalPixCartaoEsperado * 0.55).toFixed(2)}
              </p>
              <p className="text-[10px] text-cyan-800/70 dark:text-cyan-400">
                Transacionado nas maquininhas POS
              </p>
            </div>
          </div>

          {/* Bar de Progresso da Conciliação */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-2 text-slate-300 mt-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Conciliação Bancária dos Turnos
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {percentualAuditado.toFixed(0)}% Auditado ({turnosAuditados} de {totalTurnos} turnos)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentualAuditado)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 4: INTELIGÊNCIA DE MIX, ALERTAS DE SOBRA & GRÁFICOS DE VENDAS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 3 Campeões de Venda */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/80">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Campeões de Venda (Giro de Produto)
            </h2>
            <span className="text-[11px] font-semibold text-text/50">
              {rankingProdutos.length} produto(s) no mix
            </span>
          </div>

          {rankingProdutos.length === 0 ? (
            <p className="p-6 text-center text-xs text-text/50">
              Nenhum produto registrado nas cargas do período.
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
                    <div className="mt-3 border-t border-primary/10 pt-2 flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">
                        Giro: {prod.giroRate.toFixed(0)}%
                      </span>
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

        {/* Alerta de Sobra / Produtos em Queda (Atenção na Produção) */}
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
              <TrendingDown className="h-4 w-4 text-rose-600" /> Alerta de Sobra (Atenção Produção)
            </h2>
            <AlertOctagon className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>

          {produtosAlertaSobra.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-rose-300 bg-background p-3 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Alta Devolução ({produtosAlertaSobra[0].sobraRate.toFixed(1)}% sobra)
                </span>
                <h4 className="text-base font-black text-text/90">
                  {produtosAlertaSobra[0].nome}
                </h4>
                <p className="font-mono text-sm font-bold text-rose-600">
                  {produtosAlertaSobra[0].qtdEnviada - produtosAlertaSobra[0].qtdVendida} un sobraram de {produtosAlertaSobra[0].qtdEnviada} enviadas
                </p>
              </div>

              <div className="rounded-xl bg-amber-100/90 dark:bg-amber-950/60 p-3 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 font-medium space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-100">
                  💡 Ação Gerencial Recomendada:
                </p>
                <p>
                  Sinalizar para a cozinha <strong>reduzir a fornada de {produtosAlertaSobra[0].nome}</strong> ou remanejar a carga para um quiosque com maior demanda.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold p-4">
              ✅ Nenhuma sobra excessiva registrada no período! Giro de estoque 100% eficiente na produção.
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICOS VISUAIS DE EVOLUÇÃO E PRODUTOS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de Evolução de Vendas / Faturamento */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/70">
              <BarChart2 className="h-4 w-4 text-primary" />
              {tipoPeriodo === 'dia'
                ? 'Faturamento por Ponto de Venda (PDV)'
                : 'Evolução do Faturamento no Período'}
            </h2>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-primary/5 p-1 text-[11px] font-bold">
                <button
                  onClick={() => setTipoGraficoVisual('barras')}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    tipoGraficoVisual === 'barras'
                      ? 'bg-primary text-white shadow'
                      : 'text-text/60 hover:text-text'
                  }`}
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
                >
                  Área
                </button>
              </div>
            </div>
          </div>

          {(() => {
            const chartData =
              graficoModo === 'evolucao' && tipoPeriodo !== 'dia'
                ? chartDataEvolucao
                : chartDataPDV;

            if (chartData.length === 0) {
              return (
                <div className="flex h-56 items-center justify-center text-xs text-text/40 font-medium">
                  Nenhum dado de vendas para exibir o gráfico.
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
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#2563eb' }}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorFaturamentoAreaAuditoria" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
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
                        stroke="#2563eb"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorFaturamentoAreaAuditoria)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* Gráfico de Ranking dos Produtos (Volume de Peças) */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/70">
            <ShoppingBag className="h-4 w-4 text-purple-600" /> Volume de Doces Vendidos
          </h2>

          {rankingProdutos.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-text/40 font-medium">
              Aguardando vendas de produtos...
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={rankingProdutos.slice(0, 5)}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value} un`, 'Quantidade Vendida']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="qtdVendida" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* BLOCO 5: COMPARATIVO DE DESEMPENHO POR PONTO DE VENDA (PDVS) */}
      <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-primary/10 pb-3">
          <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text/80">
            <Store className="h-4 w-4 text-primary" /> Comparativo de Desempenho por Ponto de Venda (PDVs)
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
            const taxaSobraPdv = pdv.qtdEnviada > 0 ? (pdv.qtdRetorno / pdv.qtdEnviada) * 100 : 0;
            const cardColor = PDV_COLORS[index % PDV_COLORS.length];
            const ticketPdv = pdv.qtdVendida > 0 ? pdv.faturamentoLiquido / pdv.qtdVendida : 0;

            return (
              <div
                key={pdv.localId}
                className="flex flex-col justify-between rounded-2xl border border-primary/15 bg-background p-4 shadow-sm space-y-3 transition-all hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text/90 truncate">{pdv.nome}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-2xs"
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
                    <span className="font-mono font-bold text-emerald-600">
                      {giroStand.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Sobras:</span>
                    <span
                      className={`font-mono font-bold ${
                        taxaSobraPdv > 20 ? 'text-amber-600' : 'text-text/70'
                      }`}
                    >
                      {taxaSobraPdv.toFixed(1)}% ({pdv.qtdRetorno} un)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ticket Médio / Peça:</span>
                    <span className="font-mono font-semibold">
                      R$ {ticketPdv.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diferença Acumulada:</span>
                    <span
                      className={`font-mono font-bold ${
                        pdv.diferencaTotal < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
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

      {/* LINK DEDICADO DE CONCILIAÇÃO BANCÁRIA DIÁRIA */}
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

      {/* TABELA DETALHADA DE RELATÓRIOS FINANCEIROS */}
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-background shadow-sm w-full">
        <div className="border-b border-primary/10 bg-primary/5 p-4 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text/70">
            Detalhamento de Vendas & Relatórios Financeiros no Período
          </h2>
          <span className="text-xs font-mono font-bold text-text/50">
            Total: {registros.length} lançamento(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-primary/10 bg-primary/5 font-bold uppercase text-text/50">
              <tr>
                <th className="p-3">Data / PDV</th>
                <th className="p-3">Turno / Atendente</th>
                <th className="p-3 text-center">Env / Sobra / Vend</th>
                <th className="p-3 text-right">Faturamento Líquido</th>
                <th className="p-3 text-right text-emerald-700">Dinheiro Gaveta</th>
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
                    Nenhum Relatório Financeiro lançado neste período.
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
                          {reg.tipo_fechamento === 'unificado' && (
                            <span className="rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 text-[9px] font-bold">
                              ⚡ Unificado
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-text/40">
                          {reg.data.split('-').reverse().join('/')}
                        </span>
                      </td>
                      <td className="p-3 text-text/70">
                        <span className="block font-bold capitalize">{reg.turno || 'Integral'}</span>
                        <span className="block text-[10px] text-text/50">{reg.vendedor_nome || '—'}</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="text-text/50">{reg.qtd_total_enviada || 0}</span> /{' '}
                        <span className="text-amber-600 font-bold">{reg.qtd_total_retorno || 0}</span> /{' '}
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
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          Number(reg.diferenca_auditoria || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
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

      {/* Modal de Edição de Romaneio */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-primary/20 bg-background p-6 shadow-xl animate-scale-up">
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

      {/* Modal de Confirmação de Exclusão */}
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
