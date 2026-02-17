'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { AlertTriangle, Trash2, TrendingDown, PackageX } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

interface LossData {
  motivo: string;
  name: string;
  valor: number;
  quantidade: number;
}

interface TopOffender {
  nome: string;
  valor: number;
  quantidade: number;
}

const COLORS: Record<string, string> = {
  'validade': '#ef4444',
  'quebra': '#f97316',
  'producao': '#eab308',
  'degustacao': '#3b82f6',
  'roubo': '#1e293b',
  'outros': '#94a3b8'
};

export default function LossesWidget() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalPrejuizo, setTotalPrejuizo] = useState(0);
  const [topItems, setTopItems] = useState<TopOffender[]>([]);

  useEffect(() => {
    async function fetchLosses() {
      if (!profile?.organization_id) return;
      try {
        const hoje = new Date();
        const inicio = startOfMonth(hoje).toISOString();
        const fim = endOfMonth(hoje).toISOString();

        const { data, error } = await supabase
          .from('registro_perdas')
          .select('motivo, quantidade, produto_id, local:locais!inner (organization_id)')
          .eq('local.organization_id', profile.organization_id)
          .gte('created_at', inicio)
          .lte('created_at', fim);

        if (error) throw error;

        const rows = data || [];
        const produtoIds = Array.from(new Set(rows.map((r: any) => String(r.produto_id)).filter(Boolean)));
        const produtoMap: Record<string, { nome?: string; preco_custo?: number }> = {};
        if (produtoIds.length > 0) {
          // tentar buscar preco_custo; se não existir, buscar sem e usar 0
          let produtos: any[] | null = null;
          try {
            const res = await supabase.from('produtos_finais').select('id, nome, preco_custo').in('id', produtoIds);
            if ((res as any).error) throw (res as any).error;
            produtos = (res as any).data || null;
          } catch (errSelect) {
            console.warn('preco_custo não disponível, usando fallback:', errSelect);
            const res2 = await supabase.from('produtos_finais').select('id, nome').in('id', produtoIds);
            produtos = (res2 as any).data || null;
          }
          (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome, preco_custo: Number(p.preco_custo || 0) }));
        }

        const porMotivo: Record<string, number> = {};
        const porItem: Record<string, { valor: number; qtd: number }> = {};
        let totalFinanceiro = 0;

        (rows || []).forEach((reg: any) => {
          const produtoInfo = produtoMap[String(reg.produto_id)];
          const custoUnitario = Number(produtoInfo?.preco_custo || 0);
          const qtd = Number(reg.quantidade || 0);
          const valorPerda = qtd * custoUnitario;
          const motivo = reg.motivo || 'outros';
          const nomeProd = produtoInfo?.nome || 'Produto desconhecido';

          porMotivo[motivo] = (porMotivo[motivo] || 0) + valorPerda;
          totalFinanceiro += valorPerda;

          if (!porItem[nomeProd]) porItem[nomeProd] = { valor: 0, qtd: 0 };
          porItem[nomeProd].valor += valorPerda;
          porItem[nomeProd].qtd += qtd;
        });

        const formattedChart = Object.keys(porMotivo).map((key) => ({
          motivo: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          valor: porMotivo[key],
          quantidade: 0
        })).filter(d => d.valor > 0);

        const formattedTop = Object.keys(porItem)
          .map(key => ({ nome: key, valor: porItem[key].valor, quantidade: porItem[key].qtd }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 3);

        setChartData(formattedChart);
        setTotalPrejuizo(totalFinanceiro);
        setTopItems(formattedTop);
      } catch (err) {
        console.error('Erro ao carregar perdas:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchLosses();
  }, [profile]);

  const getColor = (motivo: string) => {
    const key = motivo.toLowerCase();
    const match = Object.keys(COLORS).find(k => key.includes(k));
    return match ? COLORS[match] : COLORS['outros'];
  };

  return (
    <Card title="Perdas do Mês" size="2x1" loading={loading}>
      <div className="flex flex-col md:flex-row h-full gap-4">
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-50 rounded text-red-600">
                <Trash2 size={16} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase">Prejuízo Estimado</span>
            </div>
            <h3 className="text-2xl font-bold text-red-600 tracking-tight truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrejuizo)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Baseado no preço de custo</p>
          </div>

          <div className="mt-2 flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <AlertTriangle size={12} className="text-orange-500" /> Itens Críticos:
            </p>
            {topItems.length > 0 ? (
              <ul className="space-y-2 overflow-y-auto max-h-[100px] pr-1 custom-scrollbar">
                {topItems.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <PackageX size={12} className="text-slate-400 shrink-0" />
                      <span className="text-slate-600 truncate max-w-[100px]" title={item.nome}>{item.nome}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-medium text-red-500">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(item.valor)}
                      </span>
                      <span className="text-[9px] text-slate-400">{item.quantidade} un</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem registros recentes.</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[160px] relative">
          {totalPrejuizo > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="valor">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.motivo)} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <TrendingDown size={32} strokeWidth={1.5} />
              <p className="text-[10px] mt-2 font-medium">Sem perdas</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
