'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Importação correta para App Router
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
import KPIsMetas from '@/components/dashboard/KPIsMetas'; // O erro está aqui dentro (ver explicação abaixo)

interface ProdutoRanking {
  nome: string;
  quantidade: number;
  faturamento: number;
}

export default function DashboardPage() {
  const router = useRouter(); // Hook de navegação

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
      const { data: ordens, error: errOrdens } = await supabase
        .from('ordens_producao')
        .select(`quantidade_prevista, produto:produtos_finais(nome, preco_venda)`)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (errOrdens) throw errOrdens;

      // Processamento Ranking
      let totalFat = 0;
      const mapaProdutos: Record<string, ProdutoRanking> = {};

      (ordens || []).forEach((item: any) => {
        const qtd = Number(item.quantidade_prevista || 0);
        // Tratamento seguro para relacionamento que pode vir como array ou objeto
        const prod = Array.isArray(item.produto) ? item.produto[0] : item.produto;
        const preco = Number(prod?.preco_venda || 0);
        const nome = prod?.nome || 'Desconhecido';
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

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Produção */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <TrendingUp size={64} className="text-green-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" /> Valor Produção
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">
            {kpis.faturamentoEstimado.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </h3>
        </div>

        {/* Card Meta */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <DollarSign size={64} className="text-indigo-600" />
          </div>
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Award size={16} className="text-indigo-600" /> Meta Global
            </p>
            <select
              value={metaScope}
              onChange={(e) => setMetaScope(e.target.value as any)}
              className="text-xs border rounded p-1 bg-slate-50 outline-none"
            >
              <option value="meta-dia">Dia</option>
              <option value="meta-mes">Mês</option>
            </select>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">
            {metaKPI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Faltam:{' '}
            <span className="font-bold text-red-500">
              {metaFaltante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </p>
        </div>

        {/* Card Kanban */}
        <div
          onClick={() => router.push('/dashboard/producao/kanban')}
          className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20">
            <ChefHat size={64} className="text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <ChefHat size={16} /> Em Produção
          </p>
          <h3 className="text-3xl font-bold text-blue-900 mt-2">{kpis.ordensAtivas}</h3>
          <p className="text-xs text-blue-500 mt-1 flex items-center">
            Ver Quadro <ArrowRight size={12} className="ml-1" />
          </p>
        </div>

        {/* Card Alertas */}
        <div
          onClick={() => router.push('/dashboard/insumos/alertas')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <AlertTriangle
              size={64}
              className={kpis.itensCriticos > 0 ? 'text-red-600' : 'text-slate-400'}
            />
          </div>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <Package size={16} /> Estoque Crítico
          </p>
          <h3
            className={`text-3xl font-bold mt-2 ${kpis.itensCriticos > 0 ? 'text-red-600' : 'text-slate-800'}`}
          >
            {kpis.itensCriticos}
          </h3>
        </div>
      </div>

      {/* COMPONENTE ONDE OCORREM OS ERROS DE LOG: KPIsMetas */}
      <KPIsMetas />

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="text-orange-500" size={20} /> Top 5 - Quantidade
          </h3>
          <div className="space-y-3">
            {rankingQtd.map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm mb-1 relative z-10 font-medium text-slate-700">
                  <span>
                    {idx + 1}. {item.nome}
                  </span>
                  <span>{item.quantidade} un</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{
                      width: `${(item.quantidade / (rankingQtd[0]?.quantidade || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
            {rankingQtd.length === 0 && (
              <p className="text-slate-400 text-sm text-center">Sem dados</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-green-600" size={20} /> Top 5 - Faturamento
          </h3>
          <div className="space-y-3">
            {rankingFat.map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm mb-1 relative z-10 font-medium text-slate-700">
                  <span>
                    {idx + 1}. {item.nome}
                  </span>
                  <span className="text-green-700">
                    {item.faturamento.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{
                      width: `${(item.faturamento / (rankingFat[0]?.faturamento || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
            {rankingFat.length === 0 && (
              <p className="text-slate-400 text-sm text-center">Sem dados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
