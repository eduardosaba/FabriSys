'use client';

import { useState, useEffect, useCallback } from 'react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { getLocalDateISOString } from '@/lib/utils';
import { PDVSelectorCards } from '@/components/ui/shared/PDVSelectorCards';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/lib/theme';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Store,
  DollarSign,
  Trash2,
  X,
  History,
  Unlock,
  PartyPopper,
  Sparkles,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  Receipt,
  Percent,
  Coins,
  FileSpreadsheet,
  Layers,
  ExternalLink,
} from 'lucide-react';

interface LocalPDV {
  id: string;
  nome: string;
  logo_url?: string;
  tipo?: string;
}

export interface FechamentoUnificadoInfo {
  id: string;
  data: string;
  organization_id?: string;
  total_faturamento_bruto?: number;
  total_faturamento_liquido?: number;
  total_dinheiro_informado?: number;
  total_pix_declarado?: number;
  total_cartao_debito_declarado?: number;
  total_cartao_credito_declarado?: number;
  total_outros_declarado?: number;
  total_recebido?: number;
  total_taxas_operacionais?: number;
  total_liquido_apos_taxas?: number;
  diferenca_caixa?: number;
  justificativa?: string;
  qtd_turnos?: number;
  qtd_pdvs?: number;
  status?: string;
  created_at?: string;
  turnos?: RomaneioRegistro[];
}

interface RomaneioRegistro {
  id: string;
  data: string;
  local_id: string;
  turno?: string;
  vendedor_nome?: string;
  status: string;
  valor_dinheiro_gaveta: number;
  valor_pix_declarado: number;
  valor_cartao_declarado: number;
  taxa_cartao_reais?: number;
  faturamento_liquido_esperado: number;
  pix_cartao_esperado: number;
  diferenca_auditoria: number;
  observacoes?: string;
  qtd_total_enviada?: number;
  qtd_total_retorno?: number;
  faturamento_bruto_teorico?: number;
  total_descontos_perdas?: number;
  fechamento_unificado_id?: string | null;
  tipo_fechamento?: string;
  fechamento_unificado?: FechamentoUnificadoInfo | null;
  is_unificado?: boolean;
  locais?: {
    id: string;
    nome: string;
  };
}

export default function FechamentoDiarioPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<'conciliacao' | 'historico'>('historico');
  const [tipoFiltroData, setTipoFiltroData] = useState<'dia' | 'periodo'>('dia');
  const [filtroData, setFiltroData] = useState<string>(() => getLocalDateISOString());
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateISOString(d);
  });
  const [filtroDataFim, setFiltroDataFim] = useState<string>(() => getLocalDateISOString());
  const [filtroPDV, setFiltroPDV] = useState<string>('todos');
  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [registros, setRegistros] = useState<RomaneioRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  // Conciliação bancária (Extratos reais)
  const [pixExtratoBanco, setPixExtratoBanco] = useState<number>(0);
  const [cartaoMaquininha, setCartaoMaquininha] = useState<number>(0);
  const [justificativaAuditoria, setJustificativaAuditoria] = useState<string>('');
  const [encerrandoDia, setEncerrandoDia] = useState(false);
  const [tentouFinalizar, setTentouFinalizar] = useState(false);
  const [modoEdicaoDia, setModoEdicaoDia] = useState(false);

  // Estado para Edição & Exclusão de Relatório Individual
  const [editingRecord, setEditingRecord] = useState<RomaneioRegistro | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Dias pendentes e Histórico
  const [diasPendentes, setDiasPendentes] = useState<string[]>([]);
  const [pendenciasList, setPendenciasList] = useState<any[]>([]);
  const [historicoFechamentos, setHistoricoFechamentos] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [filtroStatusHistorico, setFiltroStatusHistorico] = useState<string>('todos');
  const [buscaHistorico, setBuscaHistorico] = useState<string>('');

  // Fechamentos unificados mapeados por id e por data
  const [fechamentosUnificadosMap, setFechamentosUnificadosMap] = useState<Record<string, FechamentoUnificadoInfo>>({});
  const [fechamentoUnificadoDia, setFechamentoUnificadoDia] = useState<FechamentoUnificadoInfo | null>(null);

  // Modal de Detalhes Financeiros do Fechamento Unificado
  const [modalDetalhesUnificado, setModalDetalhesUnificado] = useState<FechamentoUnificadoInfo | null>(null);
  const [carregandoDetalhesUnificado, setCarregandoDetalhesUnificado] = useState(false);

  const abrirModalFinanceiro = useCallback(
    async (fechamento: any) => {
      if (!fechamento) return;
      setCarregandoDetalhesUnificado(true);
      setModalDetalhesUnificado(fechamento);

      try {
        let queryTurnos = supabase
          .from('remessas_cargas_pdv')
          .select('*, locais(id, nome)')
          .order('turno', { ascending: true });

        if (fechamento.id) {
          queryTurnos = queryTurnos.eq('fechamento_unificado_id', fechamento.id);
        } else if (fechamento.data) {
          queryTurnos = queryTurnos.eq('data', fechamento.data);
        }

        if (profile?.organization_id) {
          queryTurnos = queryTurnos.eq('organization_id', profile.organization_id);
        }

        const { data: turnosData } = await queryTurnos;
        setModalDetalhesUnificado((prev: any) => ({
          ...(prev || fechamento),
          ...fechamento,
          turnos: turnosData || [],
        }));
      } catch (err) {
        console.error('Erro ao carregar turnos do fechamento unificado:', err);
      } finally {
        setCarregandoDetalhesUnificado(false);
      }
    },
    [profile?.organization_id]
  );

  // Disparar efeito de festa com confetes ao bater zero divergência
  const dispararFestaZeroDivergencia = useCallback(() => {
    try {
      void confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#10b981', '#fbbf24', '#3b82f6', '#ec4899', '#8b5cf6'],
      });
      setTimeout(() => {
        void confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#fbbf24', '#3b82f6'],
        });
        void confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#fbbf24', '#ec4899'],
        });
      }, 300);
    } catch (e) {
      console.error('Erro ao disparar confetes:', e);
    }
  }, []);

  // Carregar locais de PDV para filtro
  useEffect(() => {
    async function carregarLocais() {
      try {
        let queryLocais = supabase.from('locais').select('id, nome, tipo, logo_url, ordem');

        if (profile?.organization_id) {
          queryLocais = queryLocais.eq('organization_id', profile.organization_id);
        }

        const { data: dataLocaisRaw, error: errorLocais } = await queryLocais
          .order('ordem', { ascending: true })
          .order('nome');

        let data = dataLocaisRaw;

        if (errorLocais && errorLocais.message?.includes('ordem')) {
          const res = await queryLocais.order('nome');
          data = res.data;
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

  const carregarDiasPendentes = useCallback(async () => {
    try {
      let query = supabase
        .from('remessas_cargas_pdv')
        .select('*, locais:local_id(nome)')
        .not('status', 'in', '("auditado","conferido")')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data } = await query;

      if (data) {
        setPendenciasList(data);
        const datasUnicas: string[] = Array.from(new Set(data.map((r: any) => String(r.data))));
        setDiasPendentes(datasUnicas);
      }
    } catch (err) {
      console.error('Erro ao buscar pendências:', err);
    }
  }, [profile?.organization_id]);

  const carregarHistoricoFechamentos = useCallback(async () => {
    setLoadingHistorico(true);
    try {
      let query = supabase
        .from('remessas_cargas_pdv')
        .select(
          `
          id,
          data,
          turno,
          vendedor_nome,
          local_id,
          status,
          valor_dinheiro_gaveta,
          valor_pix_declarado,
          valor_cartao_declarado,
          diferenca_auditoria,
          observacoes,
          fechamento_unificado_id,
          tipo_fechamento,
          locais(id, nome)
        `
        )
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      if (tipoFiltroData === 'dia') {
        if (filtroData) query = query.eq('data', filtroData);
      } else {
        if (filtroDataInicio) query = query.gte('data', filtroDataInicio);
        if (filtroDataFim) query = query.lte('data', filtroDataFim);
      }

      if (filtroPDV !== 'todos') {
        query = query.eq('local_id', filtroPDV);
      }

      const resQuery = await query;
      let data = resQuery.data;
      const error = resQuery.error;

      if ((!data || data.length === 0) && profile?.organization_id) {
        let fallbackQuery = supabase
          .from('remessas_cargas_pdv')
          .select(
            `
            id,
            data,
            turno,
            vendedor_nome,
            local_id,
            status,
            valor_dinheiro_gaveta,
            valor_pix_declarado,
            valor_cartao_declarado,
            diferenca_auditoria,
            observacoes,
            fechamento_unificado_id,
            tipo_fechamento,
            locais(id, nome)
          `
          )
          .order('data', { ascending: false })
          .order('created_at', { ascending: false });

        if (tipoFiltroData === 'dia') {
          if (filtroData) fallbackQuery = fallbackQuery.eq('data', filtroData);
        } else {
          if (filtroDataInicio) fallbackQuery = fallbackQuery.gte('data', filtroDataInicio);
          if (filtroDataFim) fallbackQuery = fallbackQuery.lte('data', filtroDataFim);
        }

        if (filtroPDV !== 'todos') {
          fallbackQuery = fallbackQuery.eq('local_id', filtroPDV);
        }

        const fallbackRes = await fallbackQuery;
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      }

      if (error && (!data || data.length === 0)) throw error;

      // Buscar fechamentos unificados no período para vincular métricas
      let queryFech = supabase
        .from('fechamentos_unificados_pdv')
        .select('*')
        .order('data', { ascending: false });

      if (profile?.organization_id) {
        queryFech = queryFech.eq('organization_id', profile.organization_id);
      }

      if (tipoFiltroData === 'dia') {
        if (filtroData) queryFech = queryFech.eq('data', filtroData);
      } else {
        if (filtroDataInicio) queryFech = queryFech.gte('data', filtroDataInicio);
        if (filtroDataFim) queryFech = queryFech.lte('data', filtroDataFim);
      }

      const { data: fechData } = await queryFech;
      const mapFech: Record<string, FechamentoUnificadoInfo> = {};
      const mapFechPorData: Record<string, FechamentoUnificadoInfo> = {};
      if (fechData) {
        fechData.forEach((f: any) => {
          mapFech[f.id] = f;
          mapFechPorData[f.data] = f;
        });
      }
      setFechamentosUnificadosMap((prev) => ({ ...prev, ...mapFech }));

      const formatados = (data || []).map((r: any) => {
        const fechUnificado =
          (r.fechamento_unificado_id ? mapFech[r.fechamento_unificado_id] : null) ||
          mapFechPorData[r.data] ||
          null;

        const isUnificado = Boolean(
          r.fechamento_unificado_id || r.tipo_fechamento === 'unificado' || fechUnificado
        );

        return {
          id: r.id,
          data: r.data,
          local_id: r.local_id,
          turno: r.turno || 'integral',
          vendedor_nome: r.vendedor_nome || 'Atendente',
          pdv_nome: r.locais?.nome || 'PDV',
          status: r.status || 'aberto',
          valor_dinheiro_gaveta: Number(r.valor_dinheiro_gaveta || 0),
          valor_pix_declarado: Number(r.valor_pix_declarado || 0),
          valor_cartao_declarado: Number(r.valor_cartao_declarado || 0),
          diferenca_auditoria: Number(r.diferenca_auditoria || 0),
          observacoes: r.observacoes || '',
          fechamento_unificado_id: r.fechamento_unificado_id || fechUnificado?.id || null,
          tipo_fechamento: r.tipo_fechamento || (isUnificado ? 'unificado' : undefined),
          fechamento_unificado: fechUnificado,
          is_unificado: isUnificado,
        };
      });

      setHistoricoFechamentos(formatados);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  }, [
    profile?.organization_id,
    tipoFiltroData,
    filtroData,
    filtroDataInicio,
    filtroDataFim,
    filtroPDV,
  ]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('remessas_cargas_pdv')
        .select(
          `
          *,
          locais(id, nome)
        `
        )
        .order('created_at', { ascending: false });

      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      if (tipoFiltroData === 'dia') {
        if (filtroData) query = query.eq('data', filtroData);
      } else {
        if (filtroDataInicio) query = query.gte('data', filtroDataInicio);
        if (filtroDataFim) query = query.lte('data', filtroDataFim);
      }

      if (filtroPDV !== 'todos') {
        query = query.eq('local_id', filtroPDV);
      }

      const resQuery = await query;
      let data = resQuery.data;
      const error = resQuery.error;

      if ((!data || data.length === 0) && profile?.organization_id) {
        let fallbackQuery = supabase
          .from('remessas_cargas_pdv')
          .select(
            `
            *,
            locais(id, nome)
          `
          )
          .order('created_at', { ascending: false });

        if (tipoFiltroData === 'dia') {
          if (filtroData) fallbackQuery = fallbackQuery.eq('data', filtroData);
        } else {
          if (filtroDataInicio) fallbackQuery = fallbackQuery.gte('data', filtroDataInicio);
          if (filtroDataFim) fallbackQuery = fallbackQuery.lte('data', filtroDataFim);
        }

        if (filtroPDV !== 'todos') {
          fallbackQuery = fallbackQuery.eq('local_id', filtroPDV);
        }

        const fallbackRes = await fallbackQuery;
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      }

      if (error && (!data || data.length === 0)) throw error;

      // Buscar fechamento unificado correspondente ao filtro
      let queryFech = supabase.from('fechamentos_unificados_pdv').select('*');

      if (profile?.organization_id) {
        queryFech = queryFech.eq('organization_id', profile.organization_id);
      }

      if (tipoFiltroData === 'dia') {
        if (filtroData) queryFech = queryFech.eq('data', filtroData);
      } else {
        if (filtroDataInicio) queryFech = queryFech.gte('data', filtroDataInicio);
        if (filtroDataFim) queryFech = queryFech.lte('data', filtroDataFim);
      }

      const { data: fechData } = await queryFech;
      const mapFech: Record<string, FechamentoUnificadoInfo> = {};
      let fechDoDia: FechamentoUnificadoInfo | null = null;
      if (fechData && fechData.length > 0) {
        fechData.forEach((f: any) => {
          mapFech[f.id] = f;
          if (tipoFiltroData === 'dia' && f.data === filtroData) {
            fechDoDia = f;
          }
        });
        if (!fechDoDia && tipoFiltroData === 'dia') {
          fechDoDia = fechData[0];
        }
      }
      setFechamentosUnificadosMap((prev) => ({ ...prev, ...mapFech }));
      setFechamentoUnificadoDia(fechDoDia);

      const formatados: RomaneioRegistro[] = (data || []).map((r: any) => {
        const fechUnificado =
          (r.fechamento_unificado_id ? mapFech[r.fechamento_unificado_id] : null) || fechDoDia;
        const isUnificado = Boolean(
          r.fechamento_unificado_id || r.tipo_fechamento === 'unificado' || fechUnificado
        );

        return {
          id: r.id,
          data: r.data,
          local_id: r.local_id,
          turno: r.turno || 'integral',
          vendedor_nome: r.vendedor_nome || 'Atendente',
          status: r.status || 'aberto',
          valor_dinheiro_gaveta: Number(r.valor_dinheiro_gaveta || 0),
          valor_pix_declarado: Number(r.valor_pix_declarado || 0),
          valor_cartao_declarado: Number(r.valor_cartao_declarado || 0),
          faturamento_liquido_esperado: Number(r.faturamento_liquido_esperado || 0),
          pix_cartao_esperado: Number(r.pix_cartao_esperado || 0),
          diferenca_auditoria:
            (r.status || 'aberto') === 'aberto' ? 0 : Number(r.diferenca_auditoria || 0),
          observacoes: r.observacoes || '',
          qtd_total_enviada: Number(r.qtd_total_enviada || 0),
          qtd_total_retorno: Number(r.qtd_total_retorno || 0),
          faturamento_bruto_teorico: Number(r.faturamento_bruto_teorico || 0),
          total_descontos_perdas: Number(r.total_descontos_perdas || 0),
          fechamento_unificado_id: r.fechamento_unificado_id || fechUnificado?.id || null,
          tipo_fechamento: r.tipo_fechamento || (isUnificado ? 'unificado' : undefined),
          fechamento_unificado: fechUnificado,
          is_unificado: isUnificado,
          locais: r.locais,
        };
      });

      setRegistros(formatados);

      // Se o dia tem fechamento unificado OU já foi auditado, carregar dados gravados
      if (fechDoDia) {
        setPixExtratoBanco(Number(fechDoDia.total_pix_declarado || 0));
        setCartaoMaquininha(
          Number(fechDoDia.total_cartao_debito_declarado || 0) +
            Number(fechDoDia.total_cartao_credito_declarado || 0) +
            Number(fechDoDia.total_outros_declarado || 0)
        );
        if (fechDoDia.justificativa) {
          setJustificativaAuditoria(fechDoDia.justificativa);
        } else if (data && data[0]?.observacoes?.includes('[AUDITORIA]:')) {
          const obsParts = data[0].observacoes.split('[AUDITORIA]:');
          setJustificativaAuditoria(obsParts[1]?.trim() || '');
        }
      } else if (data && data.length > 0 && data[0].status === 'auditado') {
        setPixExtratoBanco(Number(data[0].valor_pix_declarado || 0));
        setCartaoMaquininha(Number(data[0].valor_cartao_declarado || 0));
        if (data[0].observacoes?.includes('[AUDITORIA]:')) {
          const obsParts = data[0].observacoes.split('[AUDITORIA]:');
          setJustificativaAuditoria(obsParts[1]?.trim() || '');
        }
      } else {
        setPixExtratoBanco(0);
        setCartaoMaquininha(0);
        setJustificativaAuditoria('');
      }
    } catch (err: any) {
      console.error('Erro ao carregar fechamentos:', err);
    } finally {
      setLoading(false);
    }
  }, [
    profile?.organization_id,
    tipoFiltroData,
    filtroData,
    filtroDataInicio,
    filtroDataFim,
    filtroPDV,
  ]);

  useEffect(() => {
    carregarDiasPendentes();
  }, [carregarDiasPendentes]);

  useEffect(() => {
    if (abaAtiva === 'conciliacao') {
      carregarDados();
    } else {
      carregarHistoricoFechamentos();
    }
  }, [abaAtiva, carregarDados, carregarHistoricoFechamentos]);

  // Estado para Exclusão com ConfirmDialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  const handleSolicitarExclusao = (id: string, statusReg?: string) => {
    if (statusReg === 'auditado' || statusReg === 'conferido') {
      toast({
        title: 'Relatório Auditado & Bloqueado',
        description:
          'Não é permitido excluir relatórios de um dia já auditado. Clique em "Reabrir / Editar Fechamento" primeiro.',
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
        title: 'Relatório Excluído',
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
          'Não é permitido editar relatórios de um dia já auditado. Clique em "Reabrir / Editar Fechamento" primeiro.',
        variant: 'warning',
      });
      return;
    }
    setEditingRecord(reg);
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
        editingRecord.qtd_total_enviada &&
        editingRecord.qtd_total_enviada > 0 &&
        editingRecord.faturamento_bruto_teorico &&
        editingRecord.faturamento_bruto_teorico > 0
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

      const novoStatus =
        (editingRecord.status === 'dinheiro_informado' ||
          editingRecord.status === 'sobras_informadas' ||
          editingRecord.status === 'aberto') &&
        ((editingRecord.valor_pix_declarado || 0) > 0 ||
          (editingRecord.valor_cartao_declarado || 0) > 0)
          ? 'encerrado'
          : editingRecord.status;

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
          status: novoStatus,
          observacoes: editingRecord.observacoes,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: 'Relatório Atualizado',
        description:
          novoStatus === 'encerrado' && editingRecord.status === 'dinheiro_informado'
            ? 'Valores Pix/Cartão lançados com sucesso! O turno foi alterado para Encerrado.'
            : 'Alterações salvas com sucesso.',
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

  // Totais consolidados dos caixas
  const totalDinheiroGaveta = registros.reduce(
    (acc, r) => acc + Number(r.valor_dinheiro_gaveta || 0),
    0
  );
  const totalPixDeclarado = fechamentoUnificadoDia
    ? Number(fechamentoUnificadoDia.total_pix_declarado || 0)
    : registros.reduce(
        (acc, r) => acc + Number(r.valor_pix_declarado || 0),
        0
      );
  const totalCartaoDeclarado = fechamentoUnificadoDia
    ? Number(fechamentoUnificadoDia.total_cartao_debito_declarado || 0) +
      Number(fechamentoUnificadoDia.total_cartao_credito_declarado || 0) +
      Number(fechamentoUnificadoDia.total_outros_declarado || 0)
    : registros.reduce(
        (acc, r) => acc + Number(r.valor_cartao_declarado || 0),
        0
      );
  const totalPixCartaoEsperado = registros.reduce(
    (acc, r) =>
      acc + Number(r.pix_cartao_esperado || r.valor_pix_declarado + r.valor_cartao_declarado),
    0
  );
  const totalFurosDeCaixa = registros.reduce(
    (acc, r) =>
      acc +
      (r.status === 'aberto' ? 0 : Math.abs(r.diferenca_auditoria < 0 ? r.diferenca_auditoria : 0)),
    0
  );

  const pixReal = Number(pixExtratoBanco || 0);
  const cartaoReal = Number(cartaoMaquininha || 0);
  const totalDigitalRealDeclarado = pixReal + cartaoReal;
  const diferencaConciliacaoDigital =
    totalDigitalRealDeclarado > 0 ? totalDigitalRealDeclarado - totalPixCartaoEsperado : 0;

  const handleExportarCSV = () => {
    if (registros.length === 0) {
      toast({ title: 'Aviso', description: 'Nenhum registro para exportar.', variant: 'warning' });
      return;
    }

    const headers = [
      'Data',
      'PDV / Loja',
      'Turno',
      'Vendedor',
      'Qtd Enviada',
      'Qtd Retorno',
      'Qtd Vendida',
      'Faturamento Esperado (R$)',
      'Dinheiro Gaveta (R$)',
      'Pix/Cartão Esperado (R$)',
      'Pix Declarado (R$)',
      'Cartão Declarado (R$)',
      'Diferença Auditoria (R$)',
      'Status',
      'Observações',
    ];

    const rows = registros.map((r) => {
      const vend = Math.max(0, (r.qtd_total_enviada || 0) - (r.qtd_total_retorno || 0));
      return [
        r.data,
        `"${(r.locais?.nome || 'PDV Geral').replace(/"/g, '""')}"`,
        r.turno || 'Integral',
        `"${(r.vendedor_nome || '—').replace(/"/g, '""')}"`,
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
    link.download = `fechamento_diario_${filtroData}.csv`;
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
      'FabriSys';
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const rawLogoUrl =
      profile?.company_logo_url ||
      profile?.organizations?.logo_url ||
      theme?.company_logo_url ||
      theme?.logo_url ||
      '/logo.png';

    const logoSrc = rawLogoUrl.startsWith('http')
      ? rawLogoUrl
      : typeof window !== 'undefined'
        ? `${window.location.origin}${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}`
        : rawLogoUrl;

    const totalFaturamentoLiquido = registros.reduce(
      (acc, r) => acc + Number(r.faturamento_liquido_esperado || 0),
      0
    );

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
              <div class="kpi-title">Faturamento Esperado</div>
              <div class="kpi-value">R$ ${totalFaturamentoLiquido.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Dinheiro Gaveta</div>
              <div class="kpi-value" style="color: #059669;">R$ ${totalDinheiroGaveta.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Pix / Cartão Esperado</div>
              <div class="kpi-value" style="color: #88544c;">R$ ${totalPixCartaoEsperado.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Diferença Conciliação</div>
              <div class="kpi-value" style="color: ${diferencaConciliacaoDigital < 0 ? '#dc2626' : '#059669'}">
                R$ ${diferencaConciliacaoDigital.toFixed(2)}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>PDV / Loja</th>
                <th>Turno</th>
                <th>Atendente</th>
                <th class="text-right">Fat. Esperado</th>
                <th class="text-right">Dinheiro Gaveta</th>
                <th class="text-right">Pix/Cartão Esperado</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${registros
                .map(
                  (r) => `
                <tr>
                  <td>${r.data.split('-').reverse().join('/')}</td>
                  <td><strong>${r.locais?.nome || 'PDV Geral'}</strong></td>
                  <td>${r.turno || 'Integral'}</td>
                  <td>${r.vendedor_nome || '—'}</td>
                  <td class="text-right">R$ ${Number(r.faturamento_liquido_esperado || 0).toFixed(2)}</td>
                  <td class="text-right">R$ ${Number(r.valor_dinheiro_gaveta || 0).toFixed(2)}</td>
                  <td class="text-right">R$ ${Number(r.pix_cartao_esperado || 0).toFixed(2)}</td>
                  <td class="text-center"><strong>${r.status.toUpperCase()}</strong></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>FabriSys — ${nomeEmpresa} | Documento gerado automaticamente para conferência financeira.</p>
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

  // Quando o modo de edição está ativo, a página NÃO considera o dia como bloqueado/auditado
  const isDiaAuditado =
    ((registros.length > 0 && registros.every((r) => r.status === 'auditado')) ||
      fechamentoUnificadoDia?.status === 'auditado') &&
    !modoEdicaoDia;

  const handleFinalizarDia = async () => {
    if (registros.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Não há relatórios financeiros registrados nesta data para encerrar.',
        variant: 'warning',
      });
      return;
    }

    setTentouFinalizar(true);

    const temDivergenciaValores =
      Math.abs(diferencaConciliacaoDigital) >= 0.01 || totalFurosDeCaixa > 0;
    const semValoresInformados = totalDigitalRealDeclarado === 0 && totalPixCartaoEsperado > 0;
    const valorDiferenca = Math.abs(
      diferencaConciliacaoDigital !== 0 ? diferencaConciliacaoDigital : totalFurosDeCaixa
    );

    if ((temDivergenciaValores || semValoresInformados) && !justificativaAuditoria.trim()) {
      toast({
        title: '⚠️ Divergência Detectada no Fechamento',
        description: `Existe uma diferença de R$ ${valorDiferenca.toFixed(2)}. Por favor, informe a Observação / Justificativa da diferença para finalizar e fechar o dia.`,
        variant: 'error',
      });
      const el = document.getElementById('justificativa-input');
      if (el) el.focus();
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

      if (fechamentoUnificadoDia) {
        await supabase
          .from('fechamentos_unificados_pdv')
          .update({
            status: 'auditado',
            total_pix_declarado: pixReal,
            diferenca_caixa: diferencaConciliacaoDigital,
            justificativa: justificativaAuditoria.trim() || fechamentoUnificadoDia.justificativa,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fechamentoUnificadoDia.id);
      }

      if (!temDivergenciaValores && !semValoresInformados) {
        dispararFestaZeroDivergencia();
        toast({
          title: '🎉 Conferido 100% e R$ 0,00 falta!',
          description: `Todas as vendas do dia ${filtroData.split('-').reverse().join('/')} foram validadas sem nenhuma divergência!`,
          variant: 'success',
        });
      } else {
        toast({
          title: modoEdicaoDia
            ? 'Fechamento Atualizado com Sucesso!'
            : 'Dia Auditado & Finalizado com Justificativa!',
          description: `As vendas do dia ${filtroData.split('-').reverse().join('/')} foram registradas com a justificativa informada.`,
          variant: 'success',
        });
      }

      setTentouFinalizar(false);
      setModoEdicaoDia(false);
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
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update({
          status: 'encerrado',
          diferenca_auditoria: 0,
          updated_at: nowIso,
        })
        .eq('organization_id', profile.organization_id)
        .eq('data', targetData);

      if (error) throw error;

      // Sincroniza também o cabeçalho fechamentos_unificados_pdv se houver
      await supabase
        .from('fechamentos_unificados_pdv')
        .update({
          status: 'encerrado',
          updated_at: nowIso,
        })
        .eq('organization_id', profile.organization_id)
        .eq('data', targetData);

      // Reseta modos para o dia voltar ao estado 'Aguardando Auditoria'
      setModoEdicaoDia(false);
      setTentouFinalizar(false);
      setJustificativaAuditoria('');
      setPixExtratoBanco(0);
      setCartaoMaquininha(0);

      // Atualiza o estado local dos registros para 'encerrado' com diferença zerada
      setRegistros((prev) =>
        prev.map((r) => ({ ...r, status: 'encerrado', diferenca_auditoria: 0 }))
      );

      if (dataReabrir) {
        setFiltroData(dataReabrir);
      }
      setAbaAtiva('conciliacao');

      await carregarDados();
      await carregarDiasPendentes();
      await carregarHistoricoFechamentos();

      toast({
        title: 'Auditoria Reaberta com Sucesso!',
        description: `O status do dia ${targetData.split('-').reverse().join('/')} retornou para 'Aguardando Auditoria' (encerrado). Lançamentos e dados preservados para conferência.`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Erro ao reabrir auditoria', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      {/* Topo da Tela */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text/80">
              Fechamento Diário & Conciliação Bancária
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isDiaAuditado
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {isDiaAuditado ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {isDiaAuditado ? 'Dia Encerrado & Validado' : 'Fechamento Em Aberto'}
            </span>
          </div>
          <p className="text-sm text-text/50">
            Conferência e batimento dos extratos bancários (PIX) e comprovantes de máquina de cartão
            com os relatórios financeiros dos PDVs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportarCSV}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-all shadow-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Excel (CSV)
          </button>

          <button
            type="button"
            onClick={handleExportarPDF}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 transition-all shadow-xs shrink-0"
          >
            <Printer className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> PDF Executivo
          </button>

          {isDiaAuditado && abaAtiva === 'conciliacao' && (
            <button
              type="button"
              onClick={() => handleReabrirFechamento()}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 transition-all shrink-0"
            >
              <Unlock className="h-3.5 w-3.5" /> Reabrir / Editar Fechamento
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              abaAtiva === 'conciliacao' ? carregarDados() : carregarHistoricoFechamentos()
            }
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar Fechamentos
          </button>
        </div>
      </div>

      {/* Navegação por Abas removida: A página agora é puramente Histórico */}

      {/* ABA 1: CONCILIAÇÃO DO DIA */}
      {abaAtiva === 'conciliacao' && (
        <div className="space-y-6">
          {/* Alerta de Dias & PDVs Pendentes */}
          {pendenciasList.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Atenção: {pendenciasList.length} relatório(s) pendente(s) de conciliação /
                    fechamento
                  </h4>
                </div>
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                  Clique no card para filtrar a data e PDV automaticamente
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {pendenciasList.map((item) => {
                  const formatada = item.data ? item.data.split('-').reverse().join('/') : '-';
                  const pdvNome = item.locais?.nome || 'PDV';
                  const isSelected =
                    item.data === filtroData &&
                    (filtroPDV === 'todos' || filtroPDV === item.local_id);
                  const statusItem = item.status || 'aberto';

                  const badgeText =
                    statusItem === 'dinheiro_informado'
                      ? Number(item.valor_dinheiro_gaveta || 0) > 0
                        ? 'Gaveta / Dinheiro OK (Pix/Cartão Pendente)'
                        : 'Fechamento Parcial (Pix/Cartão Pendente)'
                      : statusItem === 'sobras_informadas'
                        ? 'Sobras Informadas'
                        : statusItem === 'aberto'
                          ? 'Sobras Pendentes'
                          : 'Conciliação Pendente';

                  const badgeClass =
                    statusItem === 'dinheiro_informado'
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400 font-black'
                      : statusItem === 'aberto'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-cyan-100 text-cyan-900';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFiltroData(item.data);
                        if (item.local_id) setFiltroPDV(item.local_id);
                        setModoEdicaoDia(false);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                        isSelected
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-amber-300/80 hover:border-amber-500'
                      }`}
                    >
                      <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {pdvNome} ({formatada})
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] uppercase font-extrabold ${badgeClass}`}
                      >
                        {badgeText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seleção de Data & PDV */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div className="flex items-center gap-1 rounded-xl bg-primary/5 p-1 border border-primary/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTipoFiltroData('dia')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      tipoFiltroData === 'dia'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text/70 hover:text-text'
                    }`}
                  >
                    Por Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFiltroData('periodo')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      tipoFiltroData === 'periodo'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text/70 hover:text-text'
                    }`}
                  >
                    Por Período
                  </button>
                </div>

                {tipoFiltroData === 'dia' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text/70">Data:</span>
                    <input
                      type="date"
                      value={filtroData}
                      onChange={(e) => {
                        setFiltroData(e.target.value);
                        setModoEdicaoDia(false);
                      }}
                      className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-text/70">De:</span>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
                    />
                    <span className="text-xs font-bold text-text/70">Até:</span>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        setFiltroDataInicio(getLocalDateISOString(firstDay));
                        setFiltroDataFim(getLocalDateISOString(today));
                      }}
                      className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20"
                    >
                      Este Mês
                    </button>
                  </div>
                )}
              </div>

              <div className="text-right text-xs text-text/50 font-medium">
                {registros.length} relatório(s) financeiro(s) registrado(s)
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                <Store className="h-4 w-4 text-primary" /> Filtrar por Ponto de Venda (PDV)
              </label>
              <PDVSelectorCards
                locais={locais}
                selectedId={filtroPDV}
                onSelect={(id) => setFiltroPDV(id)}
                incluirTodos={true}
                todosLabel="Todos os PDVs (Visão Geral)"
              />
            </div>
          </div>

          {/* Banner de Fechamento Unificado se houver */}
          {fechamentoUnificadoDia && (
            <div className="rounded-2xl border border-purple-300 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-indigo-50 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-indigo-950/40 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-purple-950 dark:text-purple-100">
                      Fechamento Unificado de PDVs Vinculado
                    </h3>
                    <span className="rounded-full bg-purple-200 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700 px-2 py-0.5 text-[10px] font-black uppercase text-purple-800 dark:text-purple-300">
                      {fechamentoUnificadoDia.status || 'AUDITADO'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-purple-800 dark:text-purple-200">
                    Operações digitais conciliadas de forma unificada:{' '}
                    <strong>Pix R$ {Number(fechamentoUnificadoDia.total_pix_declarado || 0).toFixed(2)}</strong>,{' '}
                    <strong>
                      Cartões R${' '}
                      {(
                        Number(fechamentoUnificadoDia.total_cartao_debito_declarado || 0) +
                        Number(fechamentoUnificadoDia.total_cartao_credito_declarado || 0)
                      ).toFixed(2)}
                    </strong>{' '}
                    e{' '}
                    <strong>Taxas R$ {Number(fechamentoUnificadoDia.total_taxas_operacionais || 0).toFixed(2)}</strong>{' '}
                    (Líquido em conta:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      R$ {Number(fechamentoUnificadoDia.total_liquido_apos_taxas || 0).toFixed(2)}
                    </strong>
                    ).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => abrirModalFinanceiro(fechamentoUnificadoDia)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-800 transition-all shrink-0 active:scale-95"
              >
                <Eye className="h-4 w-4" /> Ver Financeiro Detalhado do Dia
              </button>
            </div>
          )}

          {/* Resumo Consolidado dos Caixas do Dia */}
          {(() => {
            const totalSobrasRetorno = registros.reduce(
              (acc, r) => acc + (Number(r.qtd_total_retorno) || 0),
              0
            );

            return (
              <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${fechamentoUnificadoDia ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                <div className="rounded-2xl border border-primary/10 bg-background p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    Vendas (em Dinheiro) R$
                  </span>
                  <p className="mt-1 font-mono text-xl font-black text-emerald-600">
                    R$ {totalDinheiroGaveta.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-text/40">Declarado nos PDVs</p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                      Vendas no Pix R$
                    </span>
                    {fechamentoUnificadoDia && (
                      <span className="rounded bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                        Unificado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xl font-black text-cyan-600">
                    R$ {totalPixDeclarado.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-text/40">
                    {fechamentoUnificadoDia ? 'Extrato Bancário do dia' : 'Informado nos PDVs'}
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                      Vendas nos Cartões R$
                    </span>
                    {fechamentoUnificadoDia && (
                      <span className="rounded bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                        Unificado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xl font-black text-purple-600">
                    R$ {totalCartaoDeclarado.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-text/40">
                    {fechamentoUnificadoDia
                      ? `Déb: R$ ${Number(fechamentoUnificadoDia.total_cartao_debito_declarado || 0).toFixed(2)} | Créd: R$ ${Number(fechamentoUnificadoDia.total_cartao_credito_declarado || 0).toFixed(2)}`
                      : 'Informado nos PDVs'}
                  </p>
                </div>

                {fechamentoUnificadoDia && (
                  <div className="rounded-2xl border border-rose-300/80 bg-rose-50/60 dark:bg-rose-950/30 p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Taxas Financeiras
                    </span>
                    <p className="mt-1 font-mono text-xl font-black text-rose-600 dark:text-rose-400">
                      R$ {Number(fechamentoUnificadoDia.total_taxas_operacionais || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-rose-700/70">Taxas de maquininhas/Pix</p>
                  </div>
                )}

                <div className="rounded-2xl border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/30 p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Sobras em Loja (Retorno)
                  </span>
                  <p className="mt-1 font-mono text-xl font-black text-amber-700 dark:text-amber-300">
                    {totalSobrasRetorno} un
                  </p>
                  <p className="text-[10px] text-amber-700/70">Produtos devolvidos / sobras</p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    Diferenças nos Caixas R$
                  </span>
                  <p
                    className={`mt-1 font-mono text-xl font-black ${totalFurosDeCaixa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    R$ {totalFurosDeCaixa.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-text/40">Diferenças de caixa</p>
                </div>
              </div>
            );
          })()}

          {/* Card Principal: Formulário de Conciliação Bancária */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-background to-primary/5 p-6 shadow-md space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-primary/10 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-text/80">
                  <Lock className="h-5 w-5 text-primary" /> Fechamento Vendas Diário & Conciliação
                  Bancária
                </h2>
                <p className="text-xs text-text/50">
                  Insira o saldo consolidado do extrato Pix e relatório da máquina de cartão para o
                  dia{' '}
                  <strong className="text-primary font-bold">
                    {filtroData.split('-').reverse().join('/')}
                  </strong>
                  .
                </p>
              </div>

              <div className="flex items-center gap-3">
                {fechamentoUnificadoDia && (
                  <button
                    type="button"
                    onClick={() => abrirModalFinanceiro(fechamentoUnificadoDia)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-purple-900 dark:text-purple-200 hover:bg-purple-200 transition-colors shadow-2xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Financeiro Unificado
                  </button>
                )}

                {isDiaAuditado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5" /> Dia Auditado
                  </span>
                )}

                <div className="text-right">
                  <span className="text-xs text-text/50">Total Digital Esperado:</span>
                  <p className="font-mono text-lg font-black text-cyan-700 dark:text-cyan-400">
                    R$ {totalPixCartaoEsperado.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Campo Extrato Pix */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-text/70">
                  <QrCode className="h-4 w-4 text-cyan-600" /> Pix Total do Extrato Bancário
                </label>
                <BRLCurrencyInput
                  value={pixExtratoBanco}
                  onChange={(val) => setPixExtratoBanco(val)}
                  placeholder="R$ 0,00"
                  disabled={isDiaAuditado}
                  className="mt-1.5 w-full rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-base font-mono font-bold outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              {/* Campo Maquininha Cartão */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-text/70">
                  <CreditCard className="h-4 w-4 text-purple-600" /> Cartão Total da Maquininha
                </label>
                <BRLCurrencyInput
                  value={cartaoMaquininha}
                  onChange={(val) => setCartaoMaquininha(val)}
                  placeholder="R$ 0,00"
                  disabled={isDiaAuditado}
                  className="mt-1.5 w-full rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-base font-mono font-bold outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              {/* Resultado do Batimento & Ação */}
              <div className="flex flex-col justify-end space-y-3">
                {(totalDigitalRealDeclarado > 0 ||
                  tentouFinalizar ||
                  isDiaAuditado ||
                  totalPixCartaoEsperado >= 0) && (
                  <>
                    {Math.abs(diferencaConciliacaoDigital) < 0.01 && totalFurosDeCaixa === 0 ? (
                      <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 p-3.5 text-center shadow-lg animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200 font-black text-sm">
                          <Sparkles className="h-5 w-5 text-amber-500 animate-spin" />
                          <span>Conferido 100% e R$ 0,00 falta</span>
                          <PartyPopper className="h-5 w-5 text-pink-500 animate-bounce" />
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Tudo OK! Quantidades e vendas validadas sem nenhuma divergência.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-center shadow-md animate-in fade-in">
                        <div className="flex items-center justify-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-pulse shrink-0" />
                          <span>
                            ⚠️ Divergência Detectada: R${' '}
                            {Math.abs(
                              diferencaConciliacaoDigital !== 0
                                ? diferencaConciliacaoDigital
                                : totalFurosDeCaixa
                            ).toFixed(2)}{' '}
                            de diferença!
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                          Informe a observação ou justificativa abaixo para finalizar e encerrar o
                          dia.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={handleFinalizarDia}
                  disabled={encerrandoDia || isDiaAuditado || registros.length === 0}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-md transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 ${
                    Math.abs(diferencaConciliacaoDigital) < 0.01 && totalFurosDeCaixa === 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-primary text-white'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {modoEdicaoDia
                    ? `Salvar Alterações do Fechamento`
                    : isDiaAuditado
                      ? `Dia ${filtroData.split('-').reverse().join('/')} Auditado & Validado`
                      : encerrandoDia
                        ? 'Encerrando...'
                        : `Finalizar & Fechar Dia ${filtroData.split('-').reverse().join('/')}`}
                </button>
              </div>

              {/* Campo de Justificativa (Aparece se houver divergência ou se preenchido) */}
              {(Math.abs(diferencaConciliacaoDigital) >= 0.01 ||
                totalFurosDeCaixa > 0 ||
                tentouFinalizar ||
                (totalDigitalRealDeclarado === 0 && totalPixCartaoEsperado > 0) ||
                justificativaAuditoria.trim() !== '' ||
                modoEdicaoDia) && (
                <div className="md:col-span-3 border-t border-primary/10 pt-3 animate-in fade-in">
                  <div className="rounded-xl border-2 border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/30 p-3 space-y-1.5">
                    <label
                      htmlFor="justificativa-input"
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      Observação / Justificativa da Diferença (Exigida devido à divergência de R${' '}
                      {Math.abs(
                        diferencaConciliacaoDigital !== 0
                          ? diferencaConciliacaoDigital
                          : totalFurosDeCaixa
                      ).toFixed(2)}
                      )
                    </label>
                    <textarea
                      id="justificativa-input"
                      rows={2}
                      value={justificativaAuditoria}
                      onChange={(e) => setJustificativaAuditoria(e.target.value)}
                      placeholder="Ex: Furo de R$ 15,00 sob averiguação com atendente do Stand A para consultar troco"
                      disabled={isDiaAuditado}
                      className="w-full rounded-xl border border-amber-300 bg-background px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Relatórios Financeiros dos PDVs */}
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-background shadow-sm">
            <div className="border-b border-primary/10 bg-primary/5 p-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text/70">
                Relatórios Financeiros dos PDVs — {filtroData.split('-').reverse().join('/')}
              </h2>
              <span className="text-xs text-text/50 font-medium">
                Total: {registros.length} registro(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-primary/5 text-text/50 uppercase font-bold border-b border-primary/10">
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
                        Carregando relatórios financeiros...
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
                      const isRowUnificado = Boolean(
                        reg.fechamento_unificado_id ||
                          reg.tipo_fechamento === 'unificado' ||
                          fechamentoUnificadoDia
                      );

                      return (
                        <tr key={reg.id} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 font-semibold text-text/80">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{reg.locais?.nome || reg.local_id || 'PDV Geral'}</span>
                              {isRowUnificado && (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  🟣 Unificado
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
                            {isRowUnificado ? (
                              <div className="mt-1 flex flex-col items-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirModalFinanceiro(
                                      reg.fechamento_unificado_id
                                        ? fechamentosUnificadosMap[reg.fechamento_unificado_id] ||
                                            fechamentoUnificadoDia
                                        : fechamentoUnificadoDia
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 hover:underline bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800"
                                >
                                  <Eye className="h-3 w-3" /> Ver Financeiro
                                </button>
                                <span className="text-[9px] font-normal text-text/40">
                                  Pix e Cartões unificados
                                </span>
                              </div>
                            ) : (
                              (Number(reg.valor_pix_declarado || 0) > 0 ||
                                Number(reg.valor_cartao_declarado || 0) > 0) && (
                                <span className="block font-sans text-[10px] font-normal text-text/50">
                                  Pix: R$ {Number(reg.valor_pix_declarado || 0).toFixed(2)} | Cartão:
                                  R$ {Number(reg.valor_cartao_declarado || 0).toFixed(2)}
                                </span>
                              )
                            )}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold ${Number(reg.diferenca_auditoria || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                          >
                            R$ {Number(reg.diferenca_auditoria || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                                reg.status === 'auditado' || reg.status === 'conferido'
                                  ? isRowUnificado
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                                  : reg.status === 'encerrado'
                                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-300'
                                    : reg.status === 'dinheiro_informado'
                                      ? 'bg-amber-500/20 text-amber-900 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-extrabold'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'
                              }`}
                            >
                              {reg.status === 'auditado'
                                ? isRowUnificado
                                  ? 'Auditado (Unificado)'
                                  : 'Auditado'
                                : reg.status === 'conferido'
                                  ? isRowUnificado
                                    ? 'Conferido (Unificado)'
                                    : 'Conferido'
                                  : reg.status === 'encerrado'
                                    ? 'Encerrado'
                                    : reg.status === 'dinheiro_informado'
                                      ? Number(reg.valor_dinheiro_gaveta || 0) > 0
                                        ? 'Gaveta / Dinheiro OK (Pix/Cartão Pendente)'
                                        : 'Fechamento Parcial (Dinheiro, Pix/Cartão Pendente)'
                                      : 'Aberto'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {reg.status === 'auditado' || reg.status === 'conferido' ? (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text/40 cursor-not-allowed"
                                  title="Relatório auditado. Reabra o fechamento para editar ou excluir."
                                >
                                  <Lock className="h-3.5 w-3.5 text-text/40" /> Bloqueado
                                </span>
                                {isRowUnificado && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirModalFinanceiro(
                                        reg.fechamento_unificado_id
                                          ? fechamentosUnificadosMap[reg.fechamento_unificado_id] ||
                                              fechamentoUnificadoDia
                                          : fechamentoUnificadoDia
                                      )
                                    }
                                    title="Ver financeiro detalhado do fechamento unificado"
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold hover:bg-purple-200 transition-colors shadow-2xs"
                                  >
                                    <Eye className="h-3 w-3" /> Financeiro
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                {reg.status === 'dinheiro_informado' && (
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirEdicao(reg)}
                                    title="Lançar Totais Pix/Cartão"
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-amber-600 text-white text-[10px] font-extrabold hover:bg-amber-700 transition-colors shadow-2xs shrink-0"
                                  >
                                    <QrCode className="h-3 w-3" /> Pix/Cartão
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAbrirEdicao(reg)}
                                  title="Editar Relatório"
                                  className="rounded-lg p-1 text-text/50 hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSolicitarExclusao(reg.id, reg.status)}
                                  title="Excluir Relatório"
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
        </div>
      )}

      {/* ABA 2: HISTÓRICO DE FECHAMENTOS */}
      {abaAtiva === 'historico' &&
        (() => {
          const historicoFiltrado = historicoFechamentos.filter((item) => {
            if (filtroPDV !== 'todos' && item.local_id !== filtroPDV) return false;
            if (filtroStatusHistorico !== 'todos' && item.status !== filtroStatusHistorico)
              return false;
            if (buscaHistorico.trim() !== '') {
              const term = buscaHistorico.toLowerCase();
              const matchPdv = String(item.pdv_nome || '')
                .toLowerCase()
                .includes(term);
              const matchVend = String(item.vendedor_nome || '')
                .toLowerCase()
                .includes(term);
              const matchObs = String(item.observacoes || '')
                .toLowerCase()
                .includes(term);
              const matchData = String(item.data || '').includes(term);
              if (!matchPdv && !matchVend && !matchObs && !matchData) return false;
            }
            return true;
          });

          return (
            <div className="space-y-4">
              {/* Filtro por PDV na Aba 2 */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                  <Store className="h-4 w-4 text-primary" /> Filtrar por Ponto de Venda (PDV)
                </label>
                <PDVSelectorCards
                  locais={locais}
                  selectedId={filtroPDV}
                  onSelect={(id) => setFiltroPDV(id)}
                  incluirTodos={true}
                  todosLabel="Todos os PDVs (Visão Geral)"
                />
              </div>

              {/* Barra de Filtros Complementares (Busca & Status) */}
              <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-primary/20 bg-background p-3 shadow-2xs">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaHistorico}
                    onChange={(e) => setBuscaHistorico(e.target.value)}
                    placeholder="Buscar por atendente, PDV, data ou observações..."
                    className="w-full rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-primary shrink-0" />
                  <select
                    value={filtroStatusHistorico}
                    onChange={(e) => setFiltroStatusHistorico(e.target.value)}
                    className="w-full sm:w-44 rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="aberto">Aberto</option>
                    <option value="dinheiro_informado">
                      Fechamento Parcial (Dinheiro, Pix/Cartão Pendente)
                    </option>
                    <option value="encerrado">Encerrado</option>
                    <option value="auditado">Auditado</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-background shadow-sm">
                <div className="border-b border-primary/10 bg-primary/5 p-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text/70">
                      Histórico de Fechamentos Realizados
                    </h2>
                    <p className="text-[11px] text-text/50">
                      Lista de todos os fechamentos e romaneios processados com saldos, furos e
                      opção de reabertura.
                    </p>
                  </div>
                  <span className="text-xs text-text/50 font-medium">
                    Exibindo: {historicoFiltrado.length} de {historicoFechamentos.length}{' '}
                    fechamento(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-primary/5 text-text/60 uppercase font-bold border-b border-primary/10">
                      <tr>
                        <th className="p-3">Data / Turno</th>
                        <th className="p-3">PDV / Loja</th>
                        <th className="p-3">Atendente</th>
                        <th className="p-3 text-right">Dinheiro R$</th>
                        <th className="p-3 text-right">Pix R$</th>
                        <th className="p-3 text-right">Cartão R$</th>
                        <th className="p-3 text-right">Diferenças R$</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {loadingHistorico ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-text/50">
                            Carregando histórico de fechamentos...
                          </td>
                        </tr>
                      ) : historicoFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-text/50">
                            Nenhum fechamento encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        historicoFiltrado.map((item) => {
                          const isItemUnificado = Boolean(
                            item.fechamento_unificado_id ||
                              item.tipo_fechamento === 'unificado' ||
                              item.fechamento_unificado ||
                              item.is_unificado
                          );
                          const fech =
                            item.fechamento_unificado ||
                            (item.fechamento_unificado_id
                              ? fechamentosUnificadosMap[item.fechamento_unificado_id]
                              : null) ||
                            fechamentosUnificadosMap[item.data];

                          const pixExibir = fech
                            ? Number(fech.total_pix_declarado || 0)
                            : item.valor_pix_declarado;
                          const cartaoExibir = fech
                            ? Number(fech.total_cartao_debito_declarado || 0) +
                              Number(fech.total_cartao_credito_declarado || 0) +
                              Number(fech.total_outros_declarado || 0)
                            : item.valor_cartao_declarado;

                          return (
                            <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                              <td className="p-3 font-bold text-text/80 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{item.data ? item.data.split('-').reverse().join('/') : '-'}</span>
                                  {isItemUnificado && (
                                    <span className="inline-flex items-center rounded bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      🟣 Unificado
                                    </span>
                                  )}
                                </div>
                                <span className="text-text/40 text-[10px] font-normal block">
                                  {item.turno
                                    ? item.turno.charAt(0).toUpperCase() + item.turno.slice(1)
                                    : ''}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-primary whitespace-nowrap">
                                {item.pdv_nome}
                              </td>
                              <td className="p-3 text-text/70">{item.vendedor_nome || '-'}</td>
                              <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                                R$ {item.valor_dinheiro_gaveta.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono text-cyan-600 font-bold">
                                R$ {pixExibir.toFixed(2)}
                                {isItemUnificado && fech && (
                                  <span className="block text-[9px] font-sans font-normal text-text/40">
                                    (Total Unificado)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono text-purple-600 font-bold">
                                R$ {cartaoExibir.toFixed(2)}
                                {isItemUnificado && fech && (
                                  <span className="block text-[9px] font-sans font-normal text-text/40">
                                    (Total Unificado)
                                  </span>
                                )}
                              </td>
                              <td
                                className={`p-3 text-right font-mono font-bold ${
                                  item.diferenca_auditoria < 0
                                    ? 'text-rose-600'
                                    : item.diferenca_auditoria > 0
                                      ? 'text-emerald-600'
                                      : 'text-text/60'
                                }`}
                              >
                                R$ {item.diferenca_auditoria.toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                    item.status === 'auditado'
                                      ? isItemUnificado
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : item.status === 'encerrado'
                                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                                        : item.status === 'dinheiro_informado'
                                          ? 'bg-amber-500/20 text-amber-900 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-extrabold'
                                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {item.status === 'auditado'
                                    ? isItemUnificado
                                      ? 'Auditado (Unificado)'
                                      : 'Auditado'
                                    : item.status === 'encerrado'
                                      ? 'Encerrado'
                                      : item.status === 'dinheiro_informado'
                                        ? Number(item.valor_dinheiro_gaveta || 0) > 0
                                          ? 'Gaveta / Dinheiro OK (Pix/Cartão Pendente)'
                                          : 'Fechamento Parcial (Pix/Cartão Pendente)'
                                        : 'Aberto'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {isItemUnificado && fech && (
                                    <button
                                      type="button"
                                      onClick={() => abrirModalFinanceiro(fech)}
                                      title="Ver financeiro detalhado do fechamento unificado"
                                      className="inline-flex items-center gap-1 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 text-xs font-bold text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all shadow-2xs"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> Ver Financeiro
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleReabrirFechamento(item.data)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-all"
                                  >
                                    <Unlock className="h-3.5 w-3.5" /> Reabrir / Editar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Modal de Edição de Relatório Financeiro Individual */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-primary/20 bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text/80">
                Editar Relatório ({editingRecord.locais?.nome || 'PDV Geral'})
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
              {editingRecord.status === 'dinheiro_informado' && (
                <div className="sm:col-span-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Turno com dinheiro recolhido na gaveta. Ao informar os totais de Pix e/ou
                    Cartão, o status será atualizado automaticamente para <strong>Encerrado</strong>
                    .
                  </span>
                </div>
              )}

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
                <label className="text-xs font-semibold text-text/70">Cartão Bruto (R$)</label>
                <BRLCurrencyInput
                  value={editingRecord.valor_cartao_declarado || 0}
                  onChange={(val) =>
                    setEditingRecord({ ...editingRecord, valor_cartao_declarado: val })
                  }
                  placeholder="R$ 0,00"
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-between">
                  <span>Desconto Taxa Cartão (R$)</span>
                  {Number(editingRecord.valor_cartao_declarado || 0) > 0 && (
                    <span className="text-[10px] font-mono text-amber-600 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full font-bold">
                      {(
                        ((editingRecord.taxa_cartao_reais || 0) /
                          Number(editingRecord.valor_cartao_declarado || 1)) *
                        100
                      ).toFixed(2)}
                      %
                    </span>
                  )}
                </label>
                <BRLCurrencyInput
                  value={editingRecord.taxa_cartao_reais || 0}
                  onChange={(val) => {
                    setEditingRecord({
                      ...editingRecord,
                      taxa_cartao_reais: val,
                    });
                  }}
                  placeholder="R$ 0,00"
                  className="mt-1 w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm font-mono font-bold text-amber-900 dark:text-amber-100 outline-none focus:border-amber-500"
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
        title="Excluir Relatório Financeiro"
        message="Tem certeza que deseja excluir este relatório de fechamento? Esta ação removerá o registro permanentemente."
        confirmText="Sim, Excluir Relatório"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de Detalhamento Financeiro do Fechamento Unificado */}
      {modalDetalhesUnificado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8 space-y-5 rounded-3xl border border-purple-300 dark:border-purple-800 bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between border-b border-primary/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-text/90">
                      Detalhamento Financeiro do Fechamento Unificado
                    </h2>
                    <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-800 dark:text-purple-300">
                      {modalDetalhesUnificado.status || 'AUDITADO'}
                    </span>
                  </div>
                  <p className="text-xs text-text/50 mt-0.5">
                    Data de Fechamento:{' '}
                    <strong className="text-primary font-bold">
                      {modalDetalhesUnificado.data
                        ? modalDetalhesUnificado.data.split('-').reverse().join('/')
                        : '-'}
                    </strong>{' '}
                    • Conciliação consolidada de todos os PDVs e turnos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalhesUnificado(null)}
                className="rounded-xl p-2 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Grid de KPIs Financeiros Executivos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
                  Faturamento Esperado
                </span>
                <p className="mt-1 font-mono text-base font-black text-text/90">
                  R${' '}
                  {Number(
                    modalDetalhesUnificado.total_faturamento_bruto ||
                      modalDetalhesUnificado.total_faturamento_liquido ||
                      0
                  ).toFixed(2)}
                </p>
                <span className="text-[10px] text-text/40">Vendas apuradas</span>
              </div>

              <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Recebido Bruto
                </span>
                <p className="mt-1 font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                  R${' '}
                  {Number(
                    modalDetalhesUnificado.total_recebido ||
                      Number(modalDetalhesUnificado.total_dinheiro_informado || 0) +
                        Number(modalDetalhesUnificado.total_pix_declarado || 0) +
                        Number(modalDetalhesUnificado.total_cartao_debito_declarado || 0) +
                        Number(modalDetalhesUnificado.total_cartao_credito_declarado || 0) +
                        Number(modalDetalhesUnificado.total_outros_declarado || 0)
                  ).toFixed(2)}
                </p>
                <span className="text-[10px] text-emerald-700/60 dark:text-emerald-400/60">
                  Dinheiro + Pix + Cartões
                </span>
              </div>

              <div className="rounded-2xl border border-rose-300/80 bg-rose-50/60 dark:bg-rose-950/30 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Taxas Financeiras
                </span>
                <p className="mt-1 font-mono text-base font-black text-rose-600 dark:text-rose-400">
                  R$ {Number(modalDetalhesUnificado.total_taxas_operacionais || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-rose-700/60 dark:text-rose-400/60">
                  {(() => {
                    const dig =
                      Number(modalDetalhesUnificado.total_pix_declarado || 0) +
                      Number(modalDetalhesUnificado.total_cartao_debito_declarado || 0) +
                      Number(modalDetalhesUnificado.total_cartao_credito_declarado || 0);
                    const tx = Number(modalDetalhesUnificado.total_taxas_operacionais || 0);
                    return dig > 0
                      ? `${((tx / dig) * 100).toFixed(2)}% sobre digitais`
                      : 'Taxa operacional';
                  })()}
                </span>
              </div>

              <div className="rounded-2xl border border-purple-300/80 bg-purple-50/60 dark:bg-purple-950/30 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                  Líquido em Conta
                </span>
                <p className="mt-1 font-mono text-base font-black text-purple-700 dark:text-purple-300">
                  R${' '}
                  {Number(
                    modalDetalhesUnificado.total_liquido_apos_taxas ||
                      (Number(modalDetalhesUnificado.total_recebido || 0) ||
                        Number(modalDetalhesUnificado.total_dinheiro_informado || 0) +
                          Number(modalDetalhesUnificado.total_pix_declarado || 0) +
                          Number(modalDetalhesUnificado.total_cartao_debito_declarado || 0) +
                          Number(modalDetalhesUnificado.total_cartao_credito_declarado || 0)) -
                        Number(modalDetalhesUnificado.total_taxas_operacionais || 0)
                  ).toFixed(2)}
                </p>
                <span className="text-[10px] text-purple-700/60 dark:text-purple-300/60">
                  Após descontar taxas
                </span>
              </div>
            </div>

            {/* Raio-X Detalhado dos Fundos */}
            <div className="rounded-2xl border border-primary/15 bg-background p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text/70 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-primary" /> Raio-X dos Meios de Pagamento Conciliados
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Coluna 1: Caixa Físico */}
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                    <Banknote className="h-4 w-4 text-emerald-600" /> Caixa Físico (Dinheiro em Gaveta)
                  </span>
                  <div className="flex justify-between items-center py-1 border-b border-emerald-200/50 dark:border-emerald-800/50">
                    <span className="text-text/70">Total Recolhido em Dinheiro:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {Number(modalDetalhesUnificado.total_dinheiro_informado || 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-text/50">
                    Soma do dinheiro físico recolhido nas gavetas de todos os atendentes/turnos do dia.
                  </p>
                </div>

                {/* Coluna 2: Operações Digitais */}
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                  <span className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                    <CreditCard className="h-4 w-4 text-purple-600" /> Operações Digitais (Extratos & Maquininhas)
                  </span>

                  <div className="flex justify-between items-center py-0.5 border-b border-purple-200/50 dark:border-purple-800/50">
                    <span className="text-text/70 flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5 text-cyan-600" /> Pix (Extrato Bancário):
                    </span>
                    <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                      R$ {Number(modalDetalhesUnificado.total_pix_declarado || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-purple-200/50 dark:border-purple-800/50">
                    <span className="text-text/70">Cartão de Débito:</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                      R$ {Number(modalDetalhesUnificado.total_cartao_debito_declarado || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-purple-200/50 dark:border-purple-800/50">
                    <span className="text-text/70">Cartão de Crédito:</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                      R$ {Number(modalDetalhesUnificado.total_cartao_credito_declarado || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 font-bold border-b border-purple-300 dark:border-purple-700">
                    <span className="text-text/90">Subtotal Cartões (Débito + Crédito):</span>
                    <span className="font-mono text-purple-800 dark:text-purple-200">
                      R${' '}
                      {(
                        Number(modalDetalhesUnificado.total_cartao_debito_declarado || 0) +
                        Number(modalDetalhesUnificado.total_cartao_credito_declarado || 0)
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 text-rose-600 dark:text-rose-400 font-bold">
                    <span>Taxas Financeiras Descontadas:</span>
                    <span className="font-mono">
                      −R$ {Number(modalDetalhesUnificado.total_taxas_operacionais || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resultado Comercial / Diferença de Caixa */}
              <div className="p-3 rounded-xl border border-primary/10 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Math.abs(Number(modalDetalhesUnificado.diferenca_caixa || 0)) < 0.01 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-text/80 text-xs">
                      Resultado da Conciliação de Caixa:
                    </span>
                    <p className="text-[11px] text-text/50">
                      {Math.abs(Number(modalDetalhesUnificado.diferenca_caixa || 0)) < 0.01
                        ? 'Caixa 100% conferido sem nenhuma divergência entre vendas apuradas e recebimentos brutos.'
                        : `Divergência detectada entre faturamento apurado e valores recebidos.`}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg ${
                    Math.abs(Number(modalDetalhesUnificado.diferenca_caixa || 0)) < 0.01
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : Number(modalDetalhesUnificado.diferenca_caixa || 0) < 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  {Number(modalDetalhesUnificado.diferenca_caixa || 0) < 0
                    ? `Furo: -R$ ${Math.abs(Number(modalDetalhesUnificado.diferenca_caixa || 0)).toFixed(2)}`
                    : Number(modalDetalhesUnificado.diferenca_caixa || 0) > 0
                      ? `Sobra: +R$ ${Number(modalDetalhesUnificado.diferenca_caixa || 0).toFixed(2)}`
                      : 'R$ 0,00 (Exato)'}
                </span>
              </div>

              {/* Justificativa / Observações se houver */}
              {modalDetalhesUnificado.justificativa && (
                <div className="p-3 rounded-xl border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/30 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                    Observações / Justificativa da Auditoria:
                  </span>
                  <p className="text-amber-800 dark:text-amber-300 font-medium">
                    {modalDetalhesUnificado.justificativa}
                  </p>
                </div>
              )}
            </div>

            {/* Turnos / PDVs Vinculados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text/70 flex items-center justify-between">
                <span>PDVs e Turnos Participantes ({modalDetalhesUnificado.turnos?.length || 0})</span>
              </h4>

              {carregandoDetalhesUnificado ? (
                <div className="p-6 text-center text-xs text-text/50">
                  Carregando detalhes dos turnos...
                </div>
              ) : !modalDetalhesUnificado.turnos || modalDetalhesUnificado.turnos.length === 0 ? (
                <div className="p-4 text-center text-xs text-text/50 border border-primary/10 rounded-xl">
                  Nenhum registro de turno vinculado diretamente localizado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-primary/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-primary/5 text-text/50 font-bold border-b border-primary/10">
                      <tr>
                        <th className="p-2.5">PDV / Loja</th>
                        <th className="p-2.5">Turno</th>
                        <th className="p-2.5">Atendente</th>
                        <th className="p-2.5 text-center">Env / Sob / Vend</th>
                        <th className="p-2.5 text-right">Fat. Esperado</th>
                        <th className="p-2.5 text-right text-emerald-600">Dinheiro Gaveta</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {modalDetalhesUnificado.turnos.map((t: any) => {
                        const vend = Math.max(
                          0,
                          (t.qtd_total_enviada || 0) - (t.qtd_total_retorno || 0)
                        );
                        return (
                          <tr key={t.id} className="hover:bg-primary/5">
                            <td className="p-2.5 font-bold text-text/80">{t.locais?.nome || 'PDV'}</td>
                            <td className="p-2.5 capitalize text-text/60">{t.turno || 'Integral'}</td>
                            <td className="p-2.5 text-text/60">{t.vendedor_nome || '—'}</td>
                            <td className="p-2.5 text-center font-mono">
                              <span className="text-text/40">{t.qtd_total_enviada || 0}</span> /{' '}
                              <span className="text-amber-600">{t.qtd_total_retorno || 0}</span> /{' '}
                              <span className="font-bold text-primary">{vend}</span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-text/80">
                              R$ {Number(t.faturamento_liquido_esperado || 0).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                              R$ {Number(t.valor_dinheiro_gaveta || 0).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 capitalize">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="flex items-center justify-end gap-2 border-t border-primary/10 pt-4">
              <button
                type="button"
                onClick={() => setModalDetalhesUnificado(null)}
                className="rounded-xl border border-primary/20 bg-background px-4 py-2 text-xs font-bold text-text/70 hover:bg-primary/10 hover:text-text transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
