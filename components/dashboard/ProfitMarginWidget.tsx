"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function ProfitMarginWidget() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    custoEstimado: 0,
    lucroBruto: 0,
    margemPercentual: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function calculateProfit() {
      if (!profile?.organization_id) return;

      try {
        const hoje = new Date();
        const inicio = startOfMonth(hoje).toISOString();
        const fim = endOfMonth(hoje).toISOString();

        // 1. Buscar Vendas do Mês (Concluídas)
        const { data: vendas, error: errVendas } = await supabase
          .from('vendas')
          .select('id, created_at, total_venda')
          .eq('organization_id', profile.organization_id)
          .eq('status', 'concluida')
          .gte('created_at', inicio)
          .lte('created_at', fim);

        if (errVendas) throw errVendas;

        if (!vendas || vendas.length === 0) {
          setLoading(false);
          return;
        }

        const idsVendas = vendas.map((v: any) => v.id);
        const faturamentoTotal = vendas.reduce((acc: number, v: any) => acc + Number(v.total_venda || 0), 0);

        // 2. Buscar Itens das Vendas para calcular o Custo (em lotes para evitar URLs longas)
        const chunkSize = 50;
        const allItens: any[] = [];
        for (let i = 0; i < idsVendas.length; i += chunkSize) {
          const chunk = idsVendas.slice(i, i + chunkSize);
          const { data: itensChunk, error: errItensChunk } = await supabase
            .from('itens_venda')
            .select('quantidade, produto_id')
            .in('venda_id', chunk);
          if (errItensChunk) throw errItensChunk;
          if (itensChunk) allItens.push(...itensChunk);
        }

        // 3. Buscar preços de custo dos produtos referenciados (em lote)
        const produtoIds = Array.from(new Set(allItens.map((it) => String(it.produto_id)).filter(Boolean)));
        const produtoPrecoMap: Record<string, number> = {};
        if (produtoIds.length > 0) {
          for (let i = 0; i < produtoIds.length; i += chunkSize) {
            const chunk = produtoIds.slice(i, i + chunkSize);
            // tentar buscar preco_custo; se coluna não existir, buscar sem ela e usar 0
            let produtos: any[] | null = null;
            try {
              const res = await supabase.from('produtos_finais').select('id, preco_custo').in('id', chunk);
              if ((res as any).error) throw (res as any).error;
              produtos = (res as any).data || null;
            } catch (errSelect) {
              // provável que coluna `preco_custo` não exista — fallback para não quebrar
              console.warn('preco_custo não disponível, usando fallback:', errSelect);
              const res2 = await supabase.from('produtos_finais').select('id').in('id', chunk);
              produtos = (res2 as any).data || null;
            }
            (produtos || []).forEach((p: any) => {
              produtoPrecoMap[String(p.id)] = Number(p.preco_custo || 0);
            });
          }
        }

        // 4. Calcular Custo Total (CMV) usando o mapa de preços
        let custoTotal = 0;
        allItens.forEach((item: any) => {
          const qtd = Number(item.quantidade || 0);
          const custoUnit = produtoPrecoMap[String(item.produto_id)] || 0;
          custoTotal += qtd * custoUnit;
        });

        const lucro = faturamentoTotal - custoTotal;
        const margem = faturamentoTotal > 0 ? (lucro / faturamentoTotal) * 100 : 0;

        setMetrics({
          faturamento: faturamentoTotal,
          custoEstimado: custoTotal,
          lucroBruto: lucro,
          margemPercentual: margem,
        });

        setChartData([
          { name: 'Faturamento', valor: faturamentoTotal, color: '#3b82f6' },
          { name: 'Custos (CMV)', valor: custoTotal, color: '#ef4444' },
          { name: 'Lucro Bruto', valor: lucro, color: '#10b981' },
        ]);
      } catch (err) {
        console.error('Erro calculo margem:', err);
      } finally {
        setLoading(false);
      }
    }

    void calculateProfit();
  }, [profile]);

  const isHealthy = metrics.margemPercentual > 40;
  const isCritical = metrics.margemPercentual < 20;

  return (
    <Card title="Margem & Lucro Bruto (Mês)" size="2x1" loading={loading}>
      <div className="flex flex-col md:flex-row h-full gap-6">
        <div className="flex-1 flex flex-col justify-between py-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`p-1.5 rounded-md text-white ${isHealthy ? 'bg-emerald-500' : isCritical ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {isHealthy ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">Margem Atual</span>
            </div>
            <h3 className={`text-4xl font-bold tracking-tighter ${isHealthy ? 'text-emerald-600' : isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
              {metrics.margemPercentual.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-slate-400 mt-2 leading-tight">
              Isso significa que para cada R$ 100 vendidos, sobram <strong>R$ {metrics.margemPercentual.toFixed(0)}</strong> para pagar despesas fixas.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end">
              <span className="text-sm text-slate-500 font-medium">Lucro Bruto Est.</span>
              <span className="text-xl font-bold text-slate-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.lucroBruto)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 h-[180px] w-full" style={{ minWidth: 0, minHeight: 180 }}>
          {metrics.faturamento > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center">
              <DollarSign size={32} className="opacity-50 mb-2" />
              <p className="text-xs">Sem dados financeiros suficientes.</p>
            </div>
          )}
        </div>

      </div>

      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 justify-end">
        <AlertCircle size={10} /> Cálculo baseado no 'preço de custo' cadastrado nos produtos.
      </div>
    </Card>
  );
}
