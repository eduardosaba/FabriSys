'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DollarSign, Award, ChefHat, AlertTriangle, Package } from 'lucide-react';

interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function ValorProducaoWidget({
  filtros,
  auxFiltro,
  organizationId,
  profile,
}: WidgetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [valorProducao, setValorProducao] = useState(0);
  const [metaMensal, setMetaMensal] = useState(0);
  const [metaFaltante, setMetaFaltante] = useState(0);
  const [emProducao, setEmProducao] = useState(0);
  const [estoqueCritico, setEstoqueCritico] = useState(0);
  const [periodo, setPeriodo] = useState<'mes-atual' | 'ultimos-30-dias' | 'personalizado'>(
    'mes-atual'
  );
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const loadKPIs = useCallback(async () => {
    try {
      setLoading(true);

      let startIso = '';
      let endIso = '';
      let startRef = '';
      let endRef = '';

      const now = new Date();
      if (periodo === 'mes-atual') {
        startRef = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endRef = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        startIso = `${startRef}T00:00:00`;
        endIso = `${endRef}T23:59:59`;
      } else if (periodo === 'ultimos-30-dias') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        startRef = start.toISOString().split('T')[0];
        endRef = end.toISOString().split('T')[0];
        startIso = `${startRef}T00:00:00`;
        endIso = `${endRef}T23:59:59`;
      } else {
        // personalizado
        startRef = customStart || new Date().toISOString().split('T')[0];
        endRef = customEnd || new Date().toISOString().split('T')[0];
        startIso = `${startRef}T00:00:00`;
        endIso = `${endRef}T23:59:59`;
      }

      // Valor Produção
      const { data: ordensRaw, error: ordErr } = await supabase
        .from('ordens_producao')
        .select('quantidade_prevista, produto_final_id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso);
      if (ordErr) throw ordErr;
      const ordens = ordensRaw || [];

      const produtoIds = Array.from(
        new Set(ordens.map((o: any) => String(o.produto_final_id)).filter(Boolean))
      );
      const produtoMap: Record<string, { preco_venda?: number }> = {};
      if (produtoIds.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < produtoIds.length; i += chunkSize) {
          const chunk = produtoIds.slice(i, i + chunkSize);
          const { data: produtos, error: prodErr } = await supabase
            .from('produtos_finais')
            .select('id, preco_venda')
            .in('id', chunk);
          if (prodErr) throw prodErr;
          (produtos || []).forEach(
            (p: any) => (produtoMap[String(p.id)] = { preco_venda: Number(p.preco_venda || 0) })
          );
        }
      }

      let total = 0;
      ordens.forEach((o: any) => {
        const qtd = Number(o.quantidade_prevista || 0);
        const preco = Number(produtoMap[String(o.produto_final_id)]?.preco_venda || 0);
        total += qtd * preco;
      });
      setValorProducao(total);

      // Meta geral
      const { data: metasData, error: metasErr } = await supabase
        .from('metas_vendas')
        .select('valor_meta')
        .gte('data_referencia', startRef)
        .lte('data_referencia', endRef);
      if (!metasErr) {
        const metaTotal = (metasData || []).reduce(
          (s: number, m: any) => s + Number(m.valor_meta || 0),
          0
        );
        setMetaMensal(metaTotal);
        setMetaFaltante(Math.max(metaTotal - total, 0));
      }

      // Em produção
      const { count: countOrdens } = await supabase
        .from('ordens_producao')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pendente', 'em_producao']);
      setEmProducao(countOrdens || 0);

      // Estoque crítico
      const { count: countCriticos } = await supabase
        .from('insumos')
        .select('*', { count: 'exact', head: true })
        .lt('estoque_atual', 5);
      setEstoqueCritico(countCriticos || 0);
    } catch (err) {
      console.error('Erro ao carregar KPIs do painel:', err);
    } finally {
      setLoading(false);
    }
  }, [periodo, customStart, customEnd]);

  useEffect(() => {
    void loadKPIs();
  }, [loadKPIs]);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-end gap-2">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as any)}
          className="text-sm border rounded px-2 py-1 bg-white"
        >
          <option value="mes-atual">Mês atual</option>
          <option value="ultimos-30-dias">Últimos 30 dias</option>
          <option value="personalizado">Personalizado</option>
        </select>
        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            />
            <button
              onClick={() => void loadKPIs()}
              className="text-sm bg-indigo-600 text-white px-3 py-1 rounded"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <DollarSign size={48} className="text-green-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            Valor Produção
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">
            {loading
              ? '...'
              : valorProducao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <Award size={48} className="text-indigo-600" />
          </div>
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">Meta Geral</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">
            {loading
              ? '...'
              : metaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Faltam:{' '}
            <span className="font-bold text-red-500">
              {loading
                ? '...'
                : metaFaltante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </p>
        </div>

        <div
          onClick={() => router.push('/dashboard/producao/kanban')}
          className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20">
            <ChefHat size={48} className="text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-600 flex items-center gap-2">Em Produção</p>
          <h3 className="text-3xl font-bold text-blue-900 mt-2">{loading ? '...' : emProducao}</h3>
          <p className="text-xs text-blue-500 mt-1">Ver Quadro</p>
        </div>

        <div
          onClick={() => router.push('/dashboard/insumos/alertas')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <AlertTriangle
              size={48}
              className={estoqueCritico > 0 ? 'text-red-600' : 'text-slate-400'}
            />
          </div>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            Estoque Crítico
          </p>
          <h3
            className={`text-3xl font-bold mt-2 ${estoqueCritico > 0 ? 'text-red-600' : 'text-slate-800'}`}
          >
            {loading ? '...' : estoqueCritico}
          </h3>
        </div>
      </div>
    </div>
  );
}
