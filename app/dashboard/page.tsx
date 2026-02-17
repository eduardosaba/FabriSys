'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Importação correta para App Router
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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
import { WIDGET_REGISTRY as WIDGETS, DEFAULT_LAYOUT_BY_ROLE as DEFAULT_BY_ROLE } from '@/components/dashboard';
import dynamic from 'next/dynamic';
import WidgetSkeleton from '@/components/dashboard/WidgetSkeleton';

// dynamic wrappers for specific widgets used in role-specific branches
const CaixaStatusWidget = dynamic(() => import('@/components/dashboard/CaixaStatusWidget').then((m) => m.default), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});
const SalesChartWidget = dynamic(() => import('@/components/dashboard/SalesChartWidget').then((m) => m.default), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});
const LowStockWidget = dynamic(() => import('@/components/dashboard/LowStockWidget').then((m) => m.default), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});
const ProductionQueueWidget = dynamic(() => import('@/components/dashboard/ProductionQueueWidget').then((m) => m.default), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});

interface ProdutoRanking {
  nome: string;
  quantidade: number;
  faturamento: number;
}

export default function DashboardPage() {
  const router = useRouter(); // Hook de navegação
  const { profile, loading } = useAuth();
  // NOTE: não redirecionar automaticamente PDV; mostramos um botão para ir ao caixa

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

      // 1. Ordens de Produção
      const { data: ordensRaw, error: errOrdens } = await supabase
        .from('ordens_producao')
        .select('quantidade_prevista, produto_final_id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (errOrdens) throw errOrdens;

      const ordens = ordensRaw || [];

      // Buscar dados dos produtos referenciados
      const produtoIds = Array.from(new Set(ordens.map((o: any) => String(o.produto_final_id)).filter(Boolean)));
      const produtoMap: Record<string, { nome: string; preco_venda: number }> = {};
      if (produtoIds.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < produtoIds.length; i += chunkSize) {
          const chunk = produtoIds.slice(i, i + chunkSize);
          const { data: produtos, error: prodErr } = await supabase
            .from('produtos_finais')
            .select('id, nome, preco_venda')
            .in('id', chunk);
          if (prodErr) throw prodErr;
          (produtos || []).forEach((p: any) => {
            produtoMap[String(p.id)] = { nome: p.nome || 'Desconhecido', preco_venda: Number(p.preco_venda || 0) };
          });
        }
      }

      // Processamento Ranking
      let totalFat = 0;
      const mapaProdutos: Record<string, ProdutoRanking> = {};

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
  const [dashboardConfig, setDashboardConfig] = useState<string[] | null>(null);
  const [dashboardMeta, setDashboardMeta] = useState<Record<string, Record<string, number>> | null>(null);
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
            } catch {}
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
            } catch {}
          }
        }

        if (parsed) {
          const rolesPart = parsed.roles || parsed;
          const metaPart = parsed.meta || {};
          const chosenRaw = (rolesPart && ((role && rolesPart[role]) || rolesPart.default)) || (role ? DEFAULT_BY_ROLE[role] : null) || null;
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
      setDraftMeta(dashboardMeta?.[role || ''] ? { ...(dashboardMeta?.[role || ''] as Record<string, number>) } : {});
    } else {
      // entering edit mode: initialize draft from current
      setDraftConfig(dashboardConfig ? Array.from(dashboardConfig) : []);
      setDraftMeta(dashboardMeta?.[role || ''] ? { ...(dashboardMeta?.[role || ''] as Record<string, number>) } : {});
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
        valor: JSON.stringify({ roles: { [(role as string) || 'default']: draftConfig }, meta: { [(role as string) || 'default']: metaToSave } }),
      } as any;

      // Use RPC to perform upsert securely (rpc_upsert_configuracoes_sistema)
      const rpcPayload = {
        p_organization_id: profile?.organization_id ?? null,
        p_chave: 'dashboard_widgets',
        p_valor: JSON.stringify({ roles: { [(role as string) || 'default']: draftConfig }, meta: { [(role as string) || 'default']: metaToSave } }),
      } as any;

      const { error: rpcErr } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload as any);
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

  return (
    <div className="space-y-8 animate-fade-up p-6">
      {/* Filtros e Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
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
            <option disabled>──────────</option>
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
            <p className="text-sm text-slate-500">Modo de edição: arraste e solte os widgets para reordenar. Clique em Salvar para aplicar.</p>
          )}

            <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-6">
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
              const rawCols = metaCols ?? (entry.defaultSize ? defaultSizeToCols(entry.defaultSize) : 1);
              const mdSpan = Math.max(1, Math.min(12, rawCols * 4));
              const spanClass = `col-span-12 md:col-span-${mdSpan}`;

              const refFn = (el: HTMLDivElement | null) => {
                itemRefs.current[idx] = el;
              };

              const sizeForWidget = (draftMeta && draftMeta[wid]) || (dashboardMeta?.[role || '']?.[wid] as number) || (entry.defaultSize === '4x1' ? 3 : 1);
              const spanClassWithSize = `col-span-12 md:col-span-${Math.max(1, Math.min(12, (sizeForWidget || 1) * 4))}`;

              return (
                <div
                  key={wid}
                  ref={refFn}
                  className={`${spanClassWithSize}`}
                  draggable={!!editing}
                  onDragStart={(e) => editing && onDragStart(e, idx)}
                  onDragOver={(e) => editing && onDragOver(e)}
                  onDrop={(e) => editing && onDrop(e, idx)}
                  onDragEnd={() => setDropIndex(null)}
                >
                  <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${editing && dropIndex === idx ? 'border-dashed border-2 border-indigo-300' : ''}`}>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                      <span>{entry.title || wid}</span>
                      <div className="flex items-center gap-2">
                        {editing && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => changeSize(wid, 1)} className={`text-xs px-2 py-0.5 rounded ${sizeForWidget === 1 ? 'bg-slate-200' : 'bg-white'}`}>1</button>
                            <button onClick={() => changeSize(wid, 2)} className={`text-xs px-2 py-0.5 rounded ${sizeForWidget === 2 ? 'bg-slate-200' : 'bg-white'}`}>2</button>
                            <button onClick={() => changeSize(wid, 3)} className={`text-xs px-2 py-0.5 rounded ${sizeForWidget === 3 ? 'bg-slate-200' : 'bg-white'}`}>3</button>
                          </div>
                        )}
                        {editing && <span className="text-xs text-slate-400">Arraste</span>}
                      </div>
                    </h3>
                    <Comp />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : role === 'admin' || role === 'master' ? (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Personalize seu dashboard adicionando widgets em Configuração do Dashboard.</p>
        </div>
      ) : role === 'gerente' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CaixaStatusWidget />
            <SalesChartWidget />
          </div>
          <LowStockWidget />
        </div>
      ) : role === 'compras' ? (
        <div className="space-y-6">
          <LowStockWidget />
        </div>
      ) : role === 'fabrica' ? (
        <div className="space-y-6">
          <ProductionQueueWidget />
        </div>
      ) : (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Visualização padrão do dashboard.</p>
        </div>
      )}
    </div>
  );
}
