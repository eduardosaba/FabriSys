'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ChefHat,
  Calendar,
  ArrowRight,
  DollarSign,
  Package,
  Award,
  BarChart3,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import KPIsMetas from '@/components/dashboard/KPIsMetas';

interface ProdutoRanking {
  nome: string;
  quantidade: number;
  faturamento: number;
}

export default function DashboardPage() {
  // --- ESTADOS DE FILTRO ---
  const [filtros, setFiltros] = useState({
    dataInicial: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0],
    dataFinal: new Date().toISOString().split('T')[0],
    periodo: 'ultimos-30-dias',
  });

  // Estado auxiliar para os inputs específicos (Mês/Ano/Trimestre)
  const [auxFiltro, setAuxFiltro] = useState({
    mesAno: new Date().toISOString().slice(0, 7), // Formato YYYY-MM
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

  const [_loading, setLoading] = useState(true);

  // --- LÓGICA DE DATAS AVANÇADA ---
  const atualizarDatasPorTipo = (tipo: string, valor: string | number) => {
    let inicio = new Date();
    let fim = new Date();
    const anoAtual = auxFiltro.ano;

    switch (tipo) {
      case 'mes-especifico': {
        // Valor vem como "YYYY-MM"
        const parts = typeof valor === 'string' ? valor.split('-') : String(valor).split('-');
        const [anoM, mesM] = parts.map(Number);
        inicio = new Date(anoM, mesM - 1, 1);
        fim = new Date(anoM, mesM, 0); // Último dia do mês
        setAuxFiltro((prev) => ({ ...prev, mesAno: String(valor) }));
        break;
      }

      case 'ano-especifico': {
        // Valor é o ano numérico
        inicio = new Date(Number(valor), 0, 1);
        fim = new Date(Number(valor), 11, 31);
        setAuxFiltro((prev) => ({ ...prev, ano: Number(valor) }));
        break;
      }

      case 'trimestre': {
        // Valor é 1, 2, 3 ou 4
        const q = Number(valor);
        inicio = new Date(anoAtual, (q - 1) * 3, 1);
        fim = new Date(anoAtual, q * 3, 0);
        setAuxFiltro((prev) => ({ ...prev, trimestre: q }));
        break;
      }

      case 'semestre': {
        // Valor é 1 ou 2
        const s = Number(valor);
        inicio = new Date(anoAtual, (s - 1) * 6, 1);
        fim = new Date(anoAtual, s * 6, 0);
        setAuxFiltro((prev) => ({ ...prev, semestre: s }));
        break;
      }

      case 'trimestre-ano': {
        // Atualiza o ano do trimestre/semestre
        setAuxFiltro((prev) => {
          const novoAno = Number(valor);
          // Recalcula datas baseadas no trimestre atual selecionado mas com ano novo
          let i = new Date(),
            f = new Date();
          if (filtros.periodo === 'trimestre') {
            i = new Date(novoAno, (prev.trimestre - 1) * 3, 1);
            f = new Date(novoAno, prev.trimestre * 3, 0);
          } else if (filtros.periodo === 'semestre') {
            i = new Date(novoAno, (prev.semestre - 1) * 6, 1);
            f = new Date(novoAno, prev.semestre * 6, 0);
          }
          // Atualiza o filtro principal também
          setFiltros((old) => ({
            ...old,
            dataInicial: i.toISOString().split('T')[0],
            dataFinal: f.toISOString().split('T')[0],
          }));
          return { ...prev, ano: novoAno };
        });
        return; // Sai pois já atualizou dentro do setAuxFiltro
      }
    }

    // Atualiza o filtro principal que dispara a busca
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

    // Se for um dos tipos complexos, apenas muda o modo, a data será calculada pelos inputs auxiliares
    if (['mes-especifico', 'trimestre', 'semestre', 'ano-especifico'].includes(periodo)) {
      setFiltros((prev) => ({ ...prev, periodo }));
      // Dispara uma atualização inicial baseada nos valores padrões do auxFiltro
      if (periodo === 'mes-especifico') atualizarDatasPorTipo('mes-especifico', auxFiltro.mesAno);
      if (periodo === 'ano-especifico') atualizarDatasPorTipo('ano-especifico', auxFiltro.ano);
      if (periodo === 'trimestre') atualizarDatasPorTipo('trimestre', auxFiltro.trimestre);
      if (periodo === 'semestre') atualizarDatasPorTipo('semestre', auxFiltro.semestre);
      return;
    }

    switch (periodo) {
      case 'hoje':
        break;
      case 'ontem':
        inicio.setDate(hoje.getDate() - 1);
        fim.setDate(hoje.getDate() - 1);
        break;
      case 'esta-semana': {
        const diaSemana = hoje.getDay();
        inicio.setDate(hoje.getDate() - diaSemana);
        break;
      }
      case 'este-mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'ultimos-30-dias':
        inicio.setDate(hoje.getDate() - 30);
        break;
      default:
        break;
    }

    setFiltros({
      periodo,
      dataInicial: inicio.toISOString().split('T')[0],
      dataFinal: fim.toISOString().split('T')[0],
    });
  };

  // --- BUSCA DE DADOS ---
  async function carregarMeta(scopeOverride?: 'meta-dia' | 'meta-mes' | 'meta-periodo') {
    try {
      const scope = scopeOverride ?? metaScope;
      const { dataInicial, dataFinal } = filtros;
      let metaTotal = 0;

      if (scope === 'meta-dia') {
        const { data: metas } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .eq('data_referencia', dataInicial);
        metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
      } else if (scope === 'meta-mes') {
        const [y, m] = dataInicial.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 1);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const { data: metas } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .gte('data_referencia', startStr)
          .lt('data_referencia', endStr);
        metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
      } else {
        const { data: metas } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .gte('data_referencia', dataInicial)
          .lte('data_referencia', dataFinal);
        metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
      }

      setMetaKPI(metaTotal);

      // Calcular vendas no mesmo intervalo para saber quanto falta
      try {
        let vendasTotal = 0;
        if (scope === 'meta-dia') {
          const { data: vendas } = await supabase
            .from('vendas')
            .select('total_venda')
            .gte('created_at', `${dataInicial}T00:00:00`)
            .lt('created_at', `${dataInicial}T23:59:59`);
          vendasTotal = (vendas || []).reduce(
            (s: number, v: any) => s + Number(v.total_venda || 0),
            0
          );
        } else if (scope === 'meta-mes') {
          const [y, m] = dataInicial.split('-');
          const start = new Date(Number(y), Number(m) - 1, 1);
          const end = new Date(Number(y), Number(m), 1);
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          const { data: vendas } = await supabase
            .from('vendas')
            .select('total_venda')
            .gte('created_at', `${startStr}T00:00:00`)
            .lt('created_at', `${endStr}T00:00:00`);
          vendasTotal = (vendas || []).reduce(
            (s: number, v: any) => s + Number(v.total_venda || 0),
            0
          );
        } else {
          const { data: vendas } = await supabase
            .from('vendas')
            .select('total_venda')
            .gte('created_at', `${dataInicial}T00:00:00`)
            .lte('created_at', `${dataFinal}T23:59:59`);
          vendasTotal = (vendas || []).reduce(
            (s: number, v: any) => s + Number(v.total_venda || 0),
            0
          );
        }
        setMetaFaltante(Math.max(metaTotal - vendasTotal, 0));
      } catch (err) {
        console.error('Erro ao calcular vendas para meta:', err);
        setMetaFaltante(metaTotal);
      }
    } catch (err) {
      console.error('Erro ao carregar meta (parcial):', err);
    }
  }

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const { dataInicial, dataFinal } = filtros;
      const fimDoDia = `${dataFinal}T23:59:59`;

      // 1. Buscar Ordens de Produção do Período
      const { data: ordens, error: errOrdens } = await supabase
        .from('ordens_producao')
        .select(
          `
          quantidade_prevista,
          produto:produtos_finais(nome, preco_venda)
        `
        )
        .gte('created_at', `${dataInicial}T00:00:00`)
        .lte('created_at', fimDoDia);

      if (errOrdens) throw errOrdens;

      // --- PROCESSAMENTO DOS DADOS (Agregação) ---
      let totalFat = 0;
      const mapaProdutos: Record<string, ProdutoRanking> = {};

      const ordensRows = (ordens ?? []) as unknown[];
      ordensRows.forEach((item) => {
        const it = item as Record<string, unknown>;
        const qtd = Number(it['quantidade_prevista'] ?? 0);
        const produtoField = it['produto'];
        const produtoObj = Array.isArray(produtoField) ? produtoField[0] : produtoField;
        const preco = Number(
          (produtoObj as Record<string, unknown> | undefined)?.['preco_venda'] ?? 0
        );
        const total = qtd * preco;
        const nome = String(
          (produtoObj as Record<string, unknown> | undefined)?.['nome'] ?? 'Produto Desconhecido'
        );

        totalFat += total;

        if (!mapaProdutos[nome]) {
          mapaProdutos[nome] = { nome, quantidade: 0, faturamento: 0 };
        }
        mapaProdutos[nome].quantidade += qtd;
        mapaProdutos[nome].faturamento += total;
      });

      // Gerar Rankings
      const listaProdutos = Object.values(mapaProdutos);

      const topQtd = [...listaProdutos].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
      const topFat = [...listaProdutos].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5);

      setRankingQtd(topQtd);
      setRankingFat(topFat);

      // 2. Gastos com Compras
      const { data: entradas, error: errEntradas } = await supabase
        .from('movimentacao_estoque')
        .select(
          `
          quantidade,
          insumo:insumos(custo_por_ue)
        `
        )
        .eq('tipo_movimento', 'entrada')
        .gte('data_movimento', `${dataInicial}T00:00:00`)
        .lte('data_movimento', fimDoDia);

      if (errEntradas) throw errEntradas;

      const entradasRows = (entradas ?? []) as unknown[];
      const totalCompras = entradasRows.reduce((acc: number, item) => {
        const it = item as Record<string, unknown>;
        const quantidade = Number(it['quantidade'] ?? 0);
        const custo = Number(
          (it['insumo'] as Record<string, unknown> | undefined)?.['custo_por_ue'] ?? 0
        );
        return acc + quantidade * custo;
      }, 0);

      // 3. Snapshots (Contagens atuais - independem do filtro de data, pois são "estado atual")
      const { count: countOrdens } = await supabase
        .from('ordens_producao')
        .select('id', { count: 'exact', head: true })
        .not('estagio_atual', 'in', '("concluido","expedicao")');

      const { count: countCriticos } = await supabase
        .from('insumos')
        .select('id', { count: 'exact', head: true })
        .lt('estoque_atual', 5);

      setKpis({
        faturamentoEstimado: totalFat,
        gastoCompras: totalCompras,
        ordensAtivas: countOrdens || 0,
        itensCriticos: countCriticos || 0,
      });

      // 4. Calcular Meta conforme escopo selecionado
      try {
        let metaTotal = 0;
        if (metaScope === 'meta-dia') {
          const { data: metas } = await supabase
            .from('metas_vendas')
            .select('valor_meta')
            .eq('data_referencia', dataInicial);
          metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
        } else if (metaScope === 'meta-mes') {
          const [y, m] = dataInicial.split('-');
          const start = new Date(Number(y), Number(m) - 1, 1);
          const end = new Date(Number(y), Number(m), 1);
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          const { data: metas } = await supabase
            .from('metas_vendas')
            .select('valor_meta')
            .gte('data_referencia', startStr)
            .lt('data_referencia', endStr);
          metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
        } else {
          const { data: metas } = await supabase
            .from('metas_vendas')
            .select('valor_meta')
            .gte('data_referencia', dataInicial)
            .lte('data_referencia', dataFinal);
          metaTotal = (metas || []).reduce((s: number, m: any) => s + Number(m.valor_meta || 0), 0);
        }
        setMetaKPI(metaTotal);
      } catch (err) {
        console.error('Erro ao carregar metas:', err);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao atualizar dados.');
    } finally {
      setLoading(false);
    }
  }, [filtros, metaScope]); // Dependência nas datas (objeto filtros) e escopo de meta

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  return (
    <div className="space-y-8 animate-fade-up p-6">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-slate-500">
            Dados de <strong>{new Date(filtros.dataInicial).toLocaleDateString('pt-BR')}</strong>{' '}
            até <strong>{new Date(filtros.dataFinal).toLocaleDateString('pt-BR')}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-600">Filtrar:</span>
          </div>

          {/* selector de Meta removido daqui e movido para ficar ao lado do KPI Meta */}

          {/* Seletor Principal */}
          <select
            value={filtros.periodo}
            onChange={(e) => aplicarPeriodoPredefinido(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 p-2 rounded-lg outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="esta-semana">Esta Semana</option>
            <option value="este-mes">Este Mês</option>
            <option value="ultimos-30-dias">Últimos 30 Dias</option>
            <option disabled>──────────</option>
            <option value="mes-especifico">Mês Específico</option>
            <option value="trimestre">Por Trimestre</option>
            <option value="semestre">Por Semestre</option>
            <option value="ano-especifico">Ano Completo</option>
          </select>

          {/* Controles Dinâmicos */}
          <div className="flex items-center gap-2 border-l pl-2 border-slate-200">
            {/* MÊS ESPECÍFICO */}
            {filtros.periodo === 'mes-especifico' && (
              <input
                type="month"
                value={auxFiltro.mesAno}
                onChange={(e) => atualizarDatasPorTipo('mes-especifico', e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none"
              />
            )}

            {/* ANO ESPECÍFICO */}
            {filtros.periodo === 'ano-especifico' && (
              <input
                type="number"
                min="2020"
                max="2030"
                value={auxFiltro.ano}
                onChange={(e) => atualizarDatasPorTipo('ano-especifico', e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none w-24"
              />
            )}

            {/* TRIMESTRE / SEMESTRE (Precisa do Ano também) */}
            {(filtros.periodo === 'trimestre' || filtros.periodo === 'semestre') && (
              <>
                <select
                  value={filtros.periodo === 'trimestre' ? auxFiltro.trimestre : auxFiltro.semestre}
                  onChange={(e) => atualizarDatasPorTipo(filtros.periodo, e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none"
                >
                  {filtros.periodo === 'trimestre' ? (
                    <>
                      <option value="1">1º Trimestre (Jan-Mar)</option>
                      <option value="2">2º Trimestre (Abr-Jun)</option>
                      <option value="3">3º Trimestre (Jul-Set)</option>
                      <option value="4">4º Trimestre (Out-Dez)</option>
                    </>
                  ) : (
                    <>
                      <option value="1">1º Semestre (Jan-Jun)</option>
                      <option value="2">2º Semestre (Jul-Dez)</option>
                    </>
                  )}
                </select>
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={auxFiltro.ano}
                  onChange={(e) => atualizarDatasPorTipo('trimestre-ano', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none w-20"
                  placeholder="Ano"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* GRID DE KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-green-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <DollarSign size={16} className="text-green-600" /> Produção (Valor Venda)
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">
              {kpis.faturamentoEstimado.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Estimado pelas ordens</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={64} className="text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Award size={16} className="text-indigo-600" /> Meta (
                {metaScope === 'meta-dia' ? 'Dia' : metaScope === 'meta-mes' ? 'Mês' : 'Período'})
              </p>

              <div className="ml-2">
                <label className="sr-only">Meta</label>
                <select
                  value={metaScope}
                  onChange={(e) => {
                    const v = e.target.value as any;
                    setMetaScope(v);
                    void carregarMeta(v);
                  }}
                  className="bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 p-2 rounded-lg outline-none ml-2"
                >
                  <option value="meta-dia">Meta Dia</option>
                  <option value="meta-mes">Meta Mês</option>
                </select>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mt-2">
              {metaKPI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Valor alvo conforme escopo</p>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Falta: {metaFaltante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart size={64} className="text-orange-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ShoppingCart size={16} className="text-orange-600" /> Compras (Entradas)
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">
              {kpis.gastoCompras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Notas lançadas</p>
          </div>
        </div>

        <div
          className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
          onClick={() => (window.location.href = '/dashboard/producao/kanban')}
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ChefHat size={64} className="text-blue-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <ChefHat size={16} /> Em Produção Agora
            </p>
            <h3 className="text-3xl font-bold text-blue-900 mt-2">{kpis.ordensAtivas}</h3>
            <p className="text-xs text-blue-500 mt-1 font-medium flex items-center gap-1">
              Ver Quadro Kanban <ArrowRight size={12} />
            </p>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
          onClick={() => (window.location.href = '/dashboard/insumos/alertas')}
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle
              size={64}
              className={kpis.itensCriticos > 0 ? 'text-red-600' : 'text-slate-400'}
            />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Package size={16} className="text-slate-400" /> Itens em Alerta
            </p>
            <h3
              className={`text-3xl font-bold mt-2 ${kpis.itensCriticos > 0 ? 'text-red-600' : 'text-slate-800'}`}
            >
              {kpis.itensCriticos}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Abaixo do mínimo</p>
          </div>
        </div>
      </div>

      {/* METAS DO DIA - PDVs */}
      <KPIsMetas />

      {/* SEÇÃO DE RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking 1: Mais Produzidos (Volume) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="text-orange-500" size={20} /> Campeões de Produção
            </h3>
            <span className="text-xs text-slate-400 uppercase font-bold">Por Quantidade</span>
          </div>

          <div className="space-y-4">
            {rankingQtd.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sem dados no período.</p>
            ) : (
              rankingQtd.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1 z-10 relative">
                    <span className="font-medium text-slate-700">
                      {idx + 1}. {item.nome}
                    </span>
                    <span className="font-bold text-slate-900">{item.quantidade} un</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(item.quantidade / rankingQtd[0].quantidade) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ranking 2: Maior Faturamento (Valor) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-green-600" size={20} /> Maior Faturamento
            </h3>
            <span className="text-xs text-slate-400 uppercase font-bold">Por Valor R$</span>
          </div>

          <div className="space-y-4">
            {rankingFat.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sem dados no período.</p>
            ) : (
              rankingFat.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1 z-10 relative">
                    <span className="font-medium text-slate-700">
                      {idx + 1}. {item.nome}
                    </span>
                    <span className="font-bold text-green-700">
                      {item.faturamento.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(item.faturamento / rankingFat[0].faturamento) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE AÇÃO RÁPIDA E SALDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
          <h3 className="font-bold text-slate-800 mb-4">Atalhos Operacionais</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/producao/planejamento">
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-center cursor-pointer group h-full flex flex-col justify-center items-center">
                <Calendar className="mb-2 text-slate-500 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                  Planejar Semana
                </span>
              </div>
            </Link>
            <Link href="/dashboard/compras/sugestao">
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-green-50 hover:border-green-200 transition-all text-center cursor-pointer group h-full flex flex-col justify-center items-center">
                <ShoppingCart className="mb-2 text-slate-500 group-hover:text-green-600" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">
                  Ver o que Falta
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-white flex flex-col justify-center relative overflow-hidden h-full">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-1">Saldo Operacional Estimado</h3>
            <p className="text-slate-400 text-xs mb-4">Faturamento Produção vs. Compras Insumos</p>

            <div className="text-4xl font-bold">
              {(kpis.faturamentoEstimado - kpis.gastoCompras).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs">
              <div>
                <span className="block text-slate-500">Entradas</span>
                <span className="text-green-400 font-medium">
                  +{' '}
                  {kpis.faturamentoEstimado.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Saídas</span>
                <span className="text-red-400 font-medium">
                  -{' '}
                  {kpis.gastoCompras.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <DollarSign size={150} />
          </div>
        </div>
      </div>
    </div>
  );
}
