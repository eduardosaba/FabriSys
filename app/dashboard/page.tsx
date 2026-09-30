'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Importação correta para App Router
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getActiveLocal } from '@/lib/activeLocal';
import { getOperationalContext } from '@/lib/operationalLocal';
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ChefHat,
  Filter,
  DollarSign,
  Award,
  BarChart3,
  ArrowRight,
  Package, // <--- Adicione isto aqui
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import KPIsMetas from '@/components/dashboard/KPIsMetas';
import {
  WIDGET_REGISTRY as WIDGETS,
  DEFAULT_LAYOUT_BY_ROLE as DEFAULT_BY_ROLE,
} from '@/components/dashboard';
import dynamic from 'next/dynamic';
import WidgetSkeleton from '@/components/dashboard/WidgetSkeleton';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
// avoid importing optional utilities to keep types simple

// dynamic wrappers for specific widgets used in role-specific branches
const CaixaStatusWidget = dynamic(
  () => import('@/components/dashboard/CaixaStatusWidget').then((m) => m.default),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);
const SalesChartWidget = dynamic(
  () => import('@/components/dashboard/SalesChartWidget').then((m) => m.default),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);
const LowStockWidget = dynamic(
  () => import('@/components/dashboard/LowStockWidget').then((m) => m.default),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);
const ProductionQueueWidget = dynamic(
  () => import('@/components/dashboard/ProductionQueueWidget').then((m) => m.default),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);

interface ProdutoRanking {
  nome: string;
  quantidade: number;
  faturamento: number;
}

export default function DashboardPage() {
  const router = useRouter(); // Hook de navegação
  const { profile, loading: authLoading } = useAuth();
  // Contexto operacional: local selecionado (ID) ou null para Visão Geral
  const selectedLocalId = profile?.local_id || getActiveLocal();

  useEffect(() => {
    const diagnose = async () => {
      try {
        const persisted = getActiveLocal();
        const ctx = await getOperationalContext(profile);
        console.debug(
          '[diagnose][dashboard] profile:',
          profile?.id ?? null,
          'profile.local_id:',
          profile?.local_id ?? null
        );
        console.debug('[diagnose][dashboard] persisted:', persisted, 'opCtx:', ctx);
      } catch (e) {
        console.warn('[diagnose][dashboard] erro ao obter contexto operacional', e);
      }
    };
    void diagnose();
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.role === 'express' || profile?.role === 'pdv_simples') {
      router.replace('/dashboard/acerto-diario/auditoria');
    }
  }, [profile?.role, router]);

  // --- ESTADOS DE FILTRO ---
  const [filtros, setFiltros] = useState({
    dataInicial: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0],
    dataFinal: new Date().toISOString().split('T')[0],
    periodo: 'ultimos-30-dias',
  });

  const [auxFiltro, setAuxFiltro] = useState({
    mesAno: new Date().toISOString().slice(0, 7),
    ano: new Date().getFullYear(),
    trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
    semestre: Math.ceil((new Date().getMonth() + 1) / 6),
  });

  // --- ESTADOS DE DADOS (KPIs) ---
  const [kpis, setKpis] = useState({
    faturamentoEstimado: 0,
    gastoCompras: 0,
    ordensAtivas: 0,
    itensCriticos: 0,
    mercadoriasCirculacao: 0,
    recebimentoBruto: 0,
    taxasOperacionais: 0,
    recebimentoLiquido: 0,
    diferencaCaixa: 0,
  });

  // KPI Meta
  const [metaKPI, setMetaKPI] = useState(0);
  const [metaScope, setMetaScope] = useState<'meta-dia' | 'meta-mes' | 'meta-periodo'>('meta-mes');
  const [metaFaltante, setMetaFaltante] = useState(0);

  // --- ESTADOS DE RANKING ---
  const [rankingQtd, setRankingQtd] = useState<ProdutoRanking[]>([]);
  const [rankingFat, setRankingFat] = useState<ProdutoRanking[]>([]);

  // --- LÓGICA DE DATAS ---
  const atualizarDatasPorTipo = (tipo: string, valor: string | number) => {
    let inicio = new Date();
    let fim = new Date();
    const anoAtual = auxFiltro.ano;

    switch (tipo) {
      case 'mes-especifico': {
        const parts = String(valor).split('-');
        const [anoM, mesM] = parts.map(Number);
        inicio = new Date(anoM, mesM - 1, 1);
        fim = new Date(anoM, mesM, 0);
        setAuxFiltro((prev) => ({ ...prev, mesAno: String(valor) }));
        break;
      }
      case 'ano-especifico': {
        inicio = new Date(Number(valor), 0, 1);
        fim = new Date(Number(valor), 11, 31);
        setAuxFiltro((prev) => ({ ...prev, ano: Number(valor) }));
        break;
      }
      case 'trimestre': {
        const q = Number(valor);
        inicio = new Date(anoAtual, (q - 1) * 3, 1);
        fim = new Date(anoAtual, q * 3, 0);
        setAuxFiltro((prev) => ({ ...prev, trimestre: q }));
        break;
      }
      case 'semestre': {
        const s = Number(valor);
        inicio = new Date(anoAtual, (s - 1) * 6, 1);
        fim = new Date(anoAtual, s * 6, 0);
        setAuxFiltro((prev) => ({ ...prev, semestre: s }));
        break;
      }
      case 'trimestre-ano': {
        setAuxFiltro((prev) => {
          const novoAno = Number(valor);
          let i = new Date(),
            f = new Date();
          if (filtros.periodo === 'trimestre') {
            i = new Date(novoAno, (prev.trimestre - 1) * 3, 1);
            f = new Date(novoAno, prev.trimestre * 3, 0);
          } else if (filtros.periodo === 'semestre') {
            i = new Date(novoAno, (prev.semestre - 1) * 6, 1);
            f = new Date(novoAno, prev.semestre * 6, 0);
          }
          setFiltros((old) => ({
            ...old,
            dataInicial: i.toISOString().split('T')[0],
            dataFinal: f.toISOString().split('T')[0],
          }));
          return { ...prev, ano: novoAno };
        });
        return;
      }
    }

    setFiltros((prev) => ({
      ...prev,
      dataInicial: inicio.toISOString().split('T')[0],
      dataFinal: fim.toISOString().split('T')[0],
    }));
  };

  const aplicarPeriodoPredefinido = (periodo: string) => {
    const hoje = new Date();
    let inicio = new Date();
    const fim = new Date();

    if (['mes-especifico', 'trimestre', 'semestre', 'ano-especifico'].includes(periodo)) {
      setFiltros((prev) => ({ ...prev, periodo }));
      if (periodo === 'mes-especifico') atualizarDatasPorTipo('mes-especifico', auxFiltro.mesAno);
      if (periodo === 'ano-especifico') atualizarDatasPorTipo('ano-especifico', auxFiltro.ano);
      if (periodo === 'trimestre') atualizarDatasPorTipo('trimestre', auxFiltro.trimestre);
      if (periodo === 'semestre') atualizarDatasPorTipo('semestre', auxFiltro.semestre);
      return;
    }

    switch (periodo) {
      case 'ontem':
        inicio.setDate(hoje.getDate() - 1);
        fim.setDate(hoje.getDate() - 1);
        break;
      case 'esta-semana':
        inicio.setDate(hoje.getDate() - hoje.getDay());
        break;
      case 'este-mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'ultimos-30-dias':
        inicio.setDate(hoje.getDate() - 30);
        break;
    }

    setFiltros({
      periodo,
      dataInicial: inicio.toISOString().split('T')[0],
      dataFinal: fim.toISOString().split('T')[0],
    });
  };

  // --- CARREGAR META GLOBAL ---
  const carregarMeta = useCallback(async () => {
    try {
      const scope = metaScope;
      const { dataInicial, dataFinal } = filtros;

      // Formata datas para evitar erro 400 no Supabase
      const startIso = `${dataInicial}T00:00:00`;
      const endIso = `${dataFinal}T23:59:59`;

      let metaQuery = supabase.from('metas_vendas').select('valor_meta');
      // usar 'valor_total' conforme o schema do banco
      let vendasQuery = supabase.from('vendas').select('valor_total');

      if (scope === 'meta-dia') {
        metaQuery = metaQuery.eq('data_referencia', dataInicial);
        vendasQuery = vendasQuery
          .gte('created_at', startIso)
          .lte('created_at', `${dataInicial}T23:59:59`);
      } else if (scope === 'meta-mes') {
        const [y, m] = dataInicial.split('-');
        const startMonth = `${y}-${m}-01`;
        const endMonthDate = new Date(Number(y), Number(m), 0);
        const endMonth = endMonthDate.toISOString().split('T')[0];

        metaQuery = metaQuery.gte('data_referencia', startMonth).lte('data_referencia', endMonth);
        vendasQuery = vendasQuery
          .gte('created_at', `${startMonth}T00:00:00`)
          .lte('created_at', `${endMonth}T23:59:59`);
      } else {
        metaQuery = metaQuery.gte('data_referencia', dataInicial).lte('data_referencia', dataFinal);
        vendasQuery = vendasQuery.gte('created_at', startIso).lte('created_at', endIso);
      }

      // Executa as queries em paralelo
      const [resMeta, resVendas] = await Promise.all([metaQuery, vendasQuery]);

      const metaTotal = (resMeta.data || []).reduce((s, m) => s + Number(m.valor_meta || 0), 0);
      const vendasTotal = (resVendas.data || []).reduce(
        (s, v) => s + Number(v.valor_total || 0),
        0
      );

      setMetaKPI(metaTotal);
      setMetaFaltante(Math.max(metaTotal - vendasTotal, 0));
    } catch (err) {
      console.error('Erro ao carregar meta:', err);
    }
  }, [filtros, metaScope]);

  // --- CARREGAR DADOS GERAIS ---
  const carregarDados = useCallback(async () => {
    try {
      const { dataInicial, dataFinal } = filtros;
      const startIso = `${dataInicial}T00:00:00`;
      const endIso = `${dataFinal}T23:59:59`;

      // 1. Vendas Reais do PDV (remessas_cargas_pdv)
      let queryRemessas = supabase
        .from('remessas_cargas_pdv')
        .select('*')
        .gte('data', dataInicial)
        .lte('data', dataFinal);

      if (profile?.organization_id) {
        queryRemessas = queryRemessas.eq('organization_id', profile.organization_id);
      }

      const { data: remessasData, error: errRemessas } = await queryRemessas;
      let remessas = remessasData;

      // Fallback por created_at se data não retornar registros
      if ((!remessas || remessas.length === 0) && !errRemessas) {
        let queryAlt = supabase
          .from('remessas_cargas_pdv')
          .select('*')
          .gte('created_at', startIso)
          .lte('created_at', endIso);
        if (profile?.organization_id) {
          queryAlt = queryAlt.eq('organization_id', profile.organization_id);
        }
        const resAlt = await queryAlt;
        if (resAlt.data && resAlt.data.length > 0) {
          remessas = resAlt.data;
        }
      }

      let totalFat = 0;
      let totalMercadoriasCirculacao = 0;
      let totalDinheiroRecebido = 0;
      let totalPixRecebido = 0;
      let totalCartaoRecebido = 0;
      let totalTaxasFinanceiras = 0;
      const mapaProdutos: Record<string, ProdutoRanking> = {};

      if (remessas && remessas.length > 0) {
        remessas.forEach((reg: any) => {
          // Registros históricos legados: 36 registros (17 principais com totais consolidados e 19 secundários com faturamento zerado).
          // As grades de itens (itens_grade) são individuais por turno e somam exatamente o faturamento apurado.
          // Os valores financeiros digitais dos secundários já estão zerados no banco, garantindo ausência de duplicidade.

          // Remessas abertas ou parciais representam mercadorias em circulação (não faturamento realizado)
          const isAbertoOuParcial =
            reg.status === 'aberto' ||
            reg.status === 'dinheiro_informado' ||
            reg.status === 'sobras_informadas';

          if (isAbertoOuParcial) {
            if (Array.isArray(reg.itens_grade) && reg.itens_grade.length > 0) {
              reg.itens_grade.forEach((item: any) => {
                const env = Number(item.qtd_sobra_anterior || 0) + Number(item.qtd_enviada || 0);
                const preco = Number(item.preco_unitario || item.preco_venda || 0);
                totalMercadoriasCirculacao += env * preco;
              });
            } else {
              totalMercadoriasCirculacao += Number(reg.faturamento_bruto_teorico || 0);
            }
            return;
          }

          // Apenas registros com fechamento confirmado geram faturamento realizado
          const isConfirmado =
            reg.status === 'encerrado' || reg.status === 'auditado' || reg.status === 'conferido';

          if (!isConfirmado) return;

          // Se tiver grade de itens detalhada e conferida
          if (Array.isArray(reg.itens_grade) && reg.itens_grade.length > 0) {
            reg.itens_grade.forEach((item: any) => {
              const env = Number(item.qtd_sobra_anterior || 0) + Number(item.qtd_enviada || 0);
              const temSobra = item.qtd_retorno !== null && item.qtd_retorno !== undefined;
              const ret = temSobra ? Number(item.qtd_retorno) : 0;
              const vend = Math.max(0, env - ret);
              const preco = Number(item.preco_unitario || item.preco_venda || 0);
              const subtotal = vend * preco;

              totalFat += subtotal;

              const nome = item.nome_produto || item.nome || item.produto_nome || 'Desconhecido';
              if (!mapaProdutos[nome]) mapaProdutos[nome] = { nome, quantidade: 0, faturamento: 0 };
              mapaProdutos[nome].quantidade += vend;
              mapaProdutos[nome].faturamento += subtotal;
            });
          } else {
            // Se for um fechamento geral consolidado
            const fatReg =
              Number(reg.faturamento_liquido_esperado || 0) ||
              Number(reg.faturamento_bruto_teorico || 0) ||
              Number(reg.valor_dinheiro_gaveta || 0) +
                Number(reg.valor_pix_declarado || 0) +
                Number(reg.valor_cartao_declarado || 0);
            totalFat += fatReg;
          }

          // Acumula valores financeiros confirmados
          totalDinheiroRecebido += Number(reg.valor_dinheiro_gaveta || 0);

          // Se a remessa pertence a um fechamento unificado moderno, os digitais estão consolidados em fechamentos_unificados_pdv
          if (!reg.fechamento_unificado_id) {
            totalPixRecebido += Number(reg.valor_pix_declarado || 0);
            totalCartaoRecebido += Number(reg.valor_cartao_declarado || 0);
            totalTaxasFinanceiras += Number(reg.taxa_cartao_reais || 0);
          }
        });
      } else {
        // Fallback secundário para ordens de produção caso não haja fechamentos no período
        const { data: ordensRaw } = await supabase
          .from('ordens_producao')
          .select('quantidade_prevista, produto_final_id, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso);

        const ordens = ordensRaw || [];
        const produtoIds = Array.from(
          new Set(ordens.map((o: any) => String(o.produto_final_id)).filter(Boolean))
        );
        const produtoMap: Record<string, { nome: string; preco_venda: number }> = {};
        if (produtoIds.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < produtoIds.length; i += chunkSize) {
            const chunk = produtoIds.slice(i, i + chunkSize);
            const { data: produtos } = await supabase
              .from('produtos_finais')
              .select('id, nome, preco_venda')
              .in('id', (chunk || []).filter(Boolean));
            (produtos || []).forEach((p: any) => {
              produtoMap[String(p.id)] = {
                nome: p.nome || 'Desconhecido',
                preco_venda: Number(p.preco_venda || 0),
              };
            });
          }
        }

        (ordens || []).forEach((item: any) => {
          const qtd = Number(item.quantidade_prevista || 0);
          const prodInfo = produtoMap[String(item.produto_final_id)];
          const preco = Number(prodInfo?.preco_venda || 0);
          const nome = prodInfo?.nome || 'Desconhecido';
          const total = qtd * preco;

          totalFat += total;

          if (!mapaProdutos[nome]) mapaProdutos[nome] = { nome, quantidade: 0, faturamento: 0 };
          mapaProdutos[nome].quantidade += qtd;
          mapaProdutos[nome].faturamento += total;
        });
      }

      // Consulta complementar a fechamentos unificados para consolidação dos recebimentos digitais e taxas operacionais
      try {
        let queryFech = supabase
          .from('fechamentos_unificados_pdv')
          .select(
            'total_taxas_operacionais, total_pix_declarado, total_cartao_debito_declarado, total_cartao_credito_declarado, total_outros_declarado'
          )
          .gte('data', dataInicial)
          .lte('data', dataFinal);
        if (profile?.organization_id) {
          queryFech = queryFech.eq('organization_id', profile.organization_id);
        }
        const { data: fechData } = await queryFech;
        if (fechData && fechData.length > 0) {
          fechData.forEach((fu: any) => {
            totalPixRecebido += Number(fu.total_pix_declarado || 0);
            totalCartaoRecebido +=
              Number(fu.total_cartao_debito_declarado || 0) +
              Number(fu.total_cartao_credito_declarado || 0) +
              Number(fu.total_outros_declarado || 0);
            totalTaxasFinanceiras += Number(fu.total_taxas_operacionais || 0);
          });
        }
      } catch (errFech) {
        console.warn('Consulta a fechamentos unificados:', errFech);
      }

      const totalRecebidoBruto =
        Math.round((totalDinheiroRecebido + totalPixRecebido + totalCartaoRecebido) * 100) / 100;
      const totalRecebidoLiquido = Math.max(
        0,
        Math.round((totalRecebidoBruto - totalTaxasFinanceiras) * 100) / 100
      );
      const diferencaCaixa = Math.round((totalRecebidoBruto - totalFat) * 100) / 100;

      const lista = Object.values(mapaProdutos);
      setRankingQtd([...lista].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5));
      setRankingFat([...lista].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5));

      // 2. Compras
      const { data: entradas } = await supabase
        .from('movimentacao_estoque')
        .select(`quantidade, insumo:insumos(custo_por_ue)`)
        .eq('tipo_movimento', 'entrada')
        .gte('data_movimento', startIso)
        .lte('data_movimento', endIso);

      const totalCompras = (entradas || []).reduce((acc: number, item: any) => {
        const insumo = Array.isArray(item.insumo) ? item.insumo[0] : item.insumo;
        return acc + Number(item.quantidade || 0) * Number(insumo?.custo_por_ue || 0);
      }, 0);

      // 3. Contadores Rápidos
      const { count: countOrdens } = await supabase
        .from('ordens_producao')
        .select('*', { count: 'exact', head: true })
        .not('estagio_atual', 'in', '("concluido","expedicao")');
      const { count: countCriticos } = await supabase
        .from('insumos')
        .select('*', { count: 'exact', head: true })
        .lt('estoque_atual', 5);

      setKpis({
        faturamentoEstimado: totalFat,
        gastoCompras: totalCompras,
        ordensAtivas: countOrdens || 0,
        itensCriticos: countCriticos || 0,
        mercadoriasCirculacao: totalMercadoriasCirculacao,
        recebimentoBruto: totalRecebidoBruto,
        taxasOperacionais: totalTaxasFinanceiras,
        recebimentoLiquido: totalRecebidoLiquido,
        diferencaCaixa: diferencaCaixa,
      });

      // Carregar Meta
      void carregarMeta();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar dados.');
    }
  }, [filtros, carregarMeta]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const role = profile?.role;
  const firstName =
    (profile?.nome && String(profile.nome).split(' ')[0]) ||
    (profile?.email && String(profile.email).split('@')[0]) ||
    '';
  const displayName =
    profile?.nome || profile?.full_name || profile?.username || firstName || 'Usuário';
  const [dashboardConfig, setDashboardConfig] = useState<string[] | null>(null);
  const [dashboardMeta, setDashboardMeta] = useState<Record<string, Record<string, number>> | null>(
    null
  );
  const [editing, setEditing] = useState(false);
  const [draftConfig, setDraftConfig] = useState<string[] | null>(null);
  const [draftMeta, setDraftMeta] = useState<Record<string, number> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboardConfig() {
      try {
        let parsed: any = null;

        if (profile?.organization_id) {
          const { data: orgData } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'dashboard_widgets')
            .eq('organization_id', profile.organization_id)
            .limit(1)
            .maybeSingle();
          if (orgData?.valor) {
            try {
              parsed = JSON.parse(orgData.valor);
            } catch (e) {
              void e;
            }
          }
        }

        if (!parsed) {
          const { data: globalData } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'dashboard_widgets')
            .is('organization_id', null)
            .limit(1)
            .maybeSingle();
          if (globalData?.valor) {
            try {
              parsed = JSON.parse(globalData.valor);
            } catch (e) {
              void e;
            }
          }
        }

        if (parsed) {
          const rolesPart = parsed.roles || parsed;
          const metaPart = parsed.meta || {};
          const chosenRaw =
            (rolesPart && ((role && rolesPart[role]) || rolesPart.default)) ||
            (role ? DEFAULT_BY_ROLE[role] : null) ||
            null;
          const chosen = Array.isArray(chosenRaw) ? Array.from(new Set(chosenRaw)) : chosenRaw;
          setDashboardConfig(chosen);
          setDashboardMeta(metaPart || {});
        } else {
          setDashboardConfig(role ? DEFAULT_BY_ROLE[role] || null : null);
          setDashboardMeta({});
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard_widgets:', err);
        setDashboardConfig(role ? DEFAULT_BY_ROLE[role] || null : null);
        setDashboardMeta({});
      }
    }

    void loadDashboardConfig();
  }, [profile?.organization_id, role]);

  // Sync draft when entering edit mode or when dashboardConfig changes
  useEffect(() => {
    if (!editing) {
      setDraftConfig(dashboardConfig ? Array.from(dashboardConfig) : null);
      setDraftMeta(dashboardMeta?.[role || ''] ? { ...dashboardMeta?.[role || ''] } : {});
    } else {
      // entering edit mode: initialize draft from current
      setDraftConfig(dashboardConfig ? Array.from(dashboardConfig) : []);
      setDraftMeta(dashboardMeta?.[role || ''] ? { ...dashboardMeta?.[role || ''] } : {});
    }
  }, [dashboardConfig, editing]);

  const startEditing = () => {
    setDraftConfig(dashboardConfig ? Array.from(dashboardConfig) : []);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraftConfig(dashboardConfig ? Array.from(dashboardConfig) : null);
    setEditing(false);
  };

  const saveDashboardConfig = async () => {
    try {
      if (!draftConfig) return;
      const metaToSave = draftMeta || {};
      const payload = {
        chave: 'dashboard_widgets',
        organization_id: profile?.organization_id ?? null,
        valor: JSON.stringify({
          roles: { [(role as string) || 'default']: draftConfig },
          meta: { [(role as string) || 'default']: metaToSave },
        }),
      } as any;

      // Use RPC to perform upsert securely (rpc_upsert_configuracoes_sistema)
      const rpcPayload = {
        p_organization_id: profile?.organization_id ?? null,
        p_chave: 'dashboard_widgets',
        p_valor: JSON.stringify({
          roles: { [(role as string) || 'default']: draftConfig },
          meta: { [(role as string) || 'default']: metaToSave },
        }),
      } as any;

      const { error: rpcErr } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
      if (rpcErr) throw rpcErr;
      setDashboardConfig(Array.from(draftConfig));
      setEditing(false);
      toast.success('Configuração do dashboard salva.');
    } catch (err) {
      console.error('Erro ao salvar dashboard_widgets:', err);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Drag handlers for simple reorder
  const onDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const configToRender = editing ? draftConfig : dashboardConfig;

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // compute target index based on pointer position
    const entries = Object.entries(itemRefs.current);
    if (!entries.length) return setDropIndex(null);
    const pointerY = e.clientY;
    let found: number | null = null;
    for (const [k, el] of entries) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const idx = Number(k);
      if (pointerY < centerY) {
        found = idx;
        break;
      }
    }
    if (found === null) {
      setDropIndex(entries.length - 1 + 1);
    } else {
      setDropIndex(found);
    }
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    if (!draftConfig || src === '') return;
    const srcIndex = Number(src);
    if (Number.isNaN(srcIndex)) return;
    const next = Array.from(draftConfig);
    const [moved] = next.splice(srcIndex, 1);
    const insertAt = dropIndex ?? targetIndex;
    next.splice(insertAt, 0, moved);
    setDraftConfig(next);
    setDropIndex(null);
  };

  const changeSize = (wid: string, size: number) => {
    setDraftMeta((prev) => {
      const next = { ...(prev || {}) };
      next[wid] = size;
      return next;
    });
  };

  // DnD-kit sensors and handlers for mobile/desktop drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!draftConfig) return;
    if (over && active.id !== over.id) {
      const oldIndex = draftConfig.indexOf(String(active.id));
      const newIndex = draftConfig.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        setDraftConfig((items: string[] | null) => arrayMove(items || [], oldIndex, newIndex));
      }
    }
  };

  function SortableWidget({ id, idx, children, editing }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
    });
    const style: any = {
      transform: transform
        ? `translate3d(${(transform as any).x ?? 0}px, ${(transform as any).y ?? 0}px, 0)`
        : undefined,
      transition,
      touchAction: 'none',
      zIndex: isDragging ? 999 : 'auto',
    };
    const refFn = (el: HTMLDivElement | null) => {
      setNodeRef(el);
      itemRefs.current[idx] = el;
    };

    return (
      <div ref={refFn} style={style} {...attributes}>
        <div className="flex items-center justify-between">
          {editing && (
            <div {...listeners} className="p-2 mr-2 cursor-grab select-none touch-none">
              ?
            </div>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up p-6">
      {/* Filtros e Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--primary)] mb-1">
            {displayName} 🍭🍫🍪👋🚀
          </h1>
          <p className="text-2xl sm:text-3xl font-black text-[var(--secondary)] dark:text-white tracking-tight">
            📈 Dashboard{' '}
          </p>
          <p className="text-slate-500 text-sm">
            {new Date(filtros.dataInicial).toLocaleDateString('pt-BR')} até{' '}
            {new Date(filtros.dataFinal).toLocaleDateString('pt-BR')}
          </p>
          {profile?.role === 'pdv' && (
            <div className="mt-2">
              <button
                onClick={() => router.push('/dashboard/pdv/caixa')}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-500"
              >
                Ir para Caixa
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 px-2 border-r border-slate-100">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-600 hidden sm:inline">Filtrar:</span>
          </div>

          <select
            value={filtros.periodo}
            onChange={(e) => aplicarPeriodoPredefinido(e.target.value)}
            className="bg-slate-50 border-none text-sm font-medium text-slate-700 p-2 rounded-lg cursor-pointer hover:bg-slate-100"
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="esta-semana">Esta Semana</option>
            <option value="este-mes">Este Mês</option>
            <option value="ultimos-30-dias">Últimos 30 Dias</option>
            <option disabled>----------</option>
            <option value="mes-especifico">Mês Específico</option>
            <option value="ano-especifico">Ano Completo</option>
          </select>

          {/* Inputs Condicionais de Data */}
          {filtros.periodo === 'mes-especifico' && (
            <input
              type="month"
              value={auxFiltro.mesAno}
              onChange={(e) => atualizarDatasPorTipo('mes-especifico', e.target.value)}
              className="bg-slate-50 text-sm p-1.5 rounded-lg border border-slate-200"
            />
          )}
          {filtros.periodo === 'ano-especifico' && (
            <input
              type="number"
              min="2020"
              max="2030"
              value={auxFiltro.ano}
              onChange={(e) => atualizarDatasPorTipo('ano-especifico', e.target.value)}
              className="bg-slate-50 text-sm p-1.5 rounded-lg border border-slate-200 w-20"
            />
          )}
        </div>
      </div>

      {/* Painel Financeiro e Operacional Unificado (Larissa Saba Confeitaria) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Conciliação Financeira & Movimentação de PDVs
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Período:{' '}
            <strong className="text-slate-700 dark:text-slate-300">{filtros.dataInicial}</strong>{' '}
            até <strong className="text-slate-700 dark:text-slate-300">{filtros.dataFinal}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Faturamento Vendas */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
              Vendas Confirmadas
            </span>
            <span className="font-mono font-black text-base text-slate-900 dark:text-slate-100">
              R$ {kpis.faturamentoEstimado.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Turnos encerrados</span>
          </div>

          {/* 2. Mercadorias em Circulação */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">
              Em Circulação
            </span>
            <span className="font-mono font-black text-base text-amber-800 dark:text-amber-300">
              R$ {kpis.mercadoriasCirculacao.toFixed(2)}
            </span>
            <span className="text-[9px] text-amber-600/70 block mt-0.5">Aguardando fechamento</span>
          </div>

          {/* 3. Recebimentos Brutos */}
          <div className="bg-cyan-50/50 dark:bg-cyan-950/20 p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/60">
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold uppercase block">
              Recebido Bruto
            </span>
            <span className="font-mono font-black text-base text-cyan-800 dark:text-cyan-300">
              R$ {kpis.recebimentoBruto.toFixed(2)}
            </span>
            <span className="text-[9px] text-cyan-600/70 block mt-0.5">
              Dinheiro + Pix + Cartões
            </span>
          </div>

          {/* 4. Taxas Financeiras */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200 dark:border-rose-800/60">
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase block">
              Taxas Financeiras
            </span>
            <span className="font-mono font-black text-base text-rose-800 dark:text-rose-300">
              -R$ {kpis.taxasOperacionais.toFixed(2)}
            </span>
            <span className="text-[9px] text-rose-600/70 block mt-0.5">
              Encargos de maquininhas
            </span>
          </div>

          {/* 5. Recebimento Líquido */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">
              Líquido em Conta
            </span>
            <span className="font-mono font-black text-base text-emerald-800 dark:text-emerald-300">
              R$ {kpis.recebimentoLiquido.toFixed(2)}
            </span>
            <span className="text-[9px] text-emerald-600/70 block mt-0.5">Bruto − Taxas</span>
          </div>

          {/* 6. Diferença de Caixa */}
          <div
            className={`p-3 rounded-xl border ${
              Math.abs(kpis.diferencaCaixa) > 0.05
                ? kpis.diferencaCaixa < 0
                  ? 'bg-rose-100/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-100/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase block opacity-80">
              Diferença Caixa
            </span>
            <span className="font-mono font-black text-base">
              {kpis.diferencaCaixa < 0
                ? `-R$ ${Math.abs(kpis.diferencaCaixa).toFixed(2)}`
                : kpis.diferencaCaixa > 0
                  ? `+R$ ${kpis.diferencaCaixa.toFixed(2)}`
                  : 'R$ 0,00'}
            </span>
            <span className="text-[9px] opacity-70 block mt-0.5">
              {Math.abs(kpis.diferencaCaixa) <= 0.05 ? 'Caixa batido' : 'Diferença comercial'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de KPIs / Widgets modular por role */}
      {configToRender ? (
        <div className="space-y-6">
          {/* Admin edit toolbar */}
          {(role === 'admin' || role === 'master') && (
            <div className="flex items-center justify-end gap-2">
              {!editing ? (
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-500"
                >
                  Editar layout
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveDashboardConfig}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-500"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-md hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {editing && (
            <p className="text-sm text-slate-500">
              Modo de edição: arraste e solte os widgets para reordenar. Clique em Salvar para
              aplicar.
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={configToRender} strategy={rectSortingStrategy}>
              <div
                ref={containerRef}
                className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-6"
              >
                {Array.from(new Set(configToRender)).map((wid, idx) => {
                  const entry = WIDGETS[wid];
                  if (!entry) return null;
                  const Comp = entry.component;

                  // Map small cols (1..3) to a 12-grid system: 1 -> 4, 2 -> 8, 3 -> 12
                  const metaCols = dashboardMeta?.[role || '']?.[wid];
                  const defaultSizeToCols = (size: any) => {
                    switch (size) {
                      case '2x1':
                      case '2x2':
                        return 2;
                      case '4x1':
                        return 3;
                      default:
                        return 1;
                    }
                  };
                  const rawCols =
                    metaCols ?? (entry.defaultSize ? defaultSizeToCols(entry.defaultSize) : 1);
                  const mdSpan = Math.max(1, Math.min(12, rawCols * 4));
                  const spanClassWithSize = `col-span-12 md:col-span-${Math.max(1, Math.min(12, ((draftMeta && draftMeta[wid]) || dashboardMeta?.[role || '']?.[wid] || (entry.defaultSize === '4x1' ? 3 : 1)) * 4))}`;

                  return (
                    <div key={wid} className={`${spanClassWithSize}`}>
                      <SortableWidget id={wid} idx={idx} editing={editing}>
                        <div
                          className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${editing && dropIndex === idx ? 'border-dashed border-2 border-indigo-300' : ''}`}
                        >
                          <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                            <span>{entry.title || wid}</span>
                            <div className="flex items-center gap-2">
                              {editing && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => changeSize(wid, 1)}
                                    className={`text-xs px-2 py-0.5 rounded ${((draftMeta && draftMeta[wid]) || dashboardMeta?.[role || '']?.[wid] || (entry.defaultSize === '4x1' ? 3 : 1)) === 1 ? 'bg-slate-200' : 'bg-white'}`}
                                  >
                                    1
                                  </button>
                                  <button
                                    onClick={() => changeSize(wid, 2)}
                                    className={`text-xs px-2 py-0.5 rounded ${((draftMeta && draftMeta[wid]) || dashboardMeta?.[role || '']?.[wid] || (entry.defaultSize === '4x1' ? 3 : 1)) === 2 ? 'bg-slate-200' : 'bg-white'}`}
                                  >
                                    2
                                  </button>
                                  <button
                                    onClick={() => changeSize(wid, 3)}
                                    className={`text-xs px-2 py-0.5 rounded ${((draftMeta && draftMeta[wid]) || dashboardMeta?.[role || '']?.[wid] || (entry.defaultSize === '4x1' ? 3 : 1)) === 3 ? 'bg-slate-200' : 'bg-white'}`}
                                  >
                                    3
                                  </button>
                                </div>
                              )}
                              {editing && <span className="text-xs text-slate-400">Arraste</span>}
                            </div>
                          </h3>
                          <Comp
                            filtros={filtros}
                            auxFiltro={auxFiltro}
                            organizationId={profile?.organization_id}
                            profile={profile}
                            localId={selectedLocalId}
                          />
                        </div>
                      </SortableWidget>
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : role === 'admin' || role === 'master' ? (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Personalize seu dashboard adicionando widgets em Configuração do Dashboard.
          </p>
        </div>
      ) : role === 'gerente' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CaixaStatusWidget
              filtros={filtros}
              auxFiltro={auxFiltro}
              organizationId={profile?.organization_id}
              profile={profile}
              localId={selectedLocalId}
            />
            <SalesChartWidget
              filtros={filtros}
              auxFiltro={auxFiltro}
              organizationId={profile?.organization_id}
              profile={profile}
              localId={selectedLocalId}
            />
          </div>
          <LowStockWidget
            filtros={filtros}
            auxFiltro={auxFiltro}
            organizationId={profile?.organization_id}
            profile={profile}
            localId={selectedLocalId}
          />
        </div>
      ) : role === 'compras' ? (
        <div className="space-y-6">
          <LowStockWidget
            filtros={filtros}
            auxFiltro={auxFiltro}
            organizationId={profile?.organization_id}
          />
        </div>
      ) : role === 'fabrica' ? (
        <div className="space-y-6">
          <ProductionQueueWidget
            filtros={filtros}
            auxFiltro={auxFiltro}
            organizationId={profile?.organization_id}
            profile={profile}
            localId={selectedLocalId}
          />
        </div>
      ) : (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Visualização padrão do dashboard.</p>
        </div>
      )}
    </div>
  );
}
