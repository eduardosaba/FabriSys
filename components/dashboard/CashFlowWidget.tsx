"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function CashFlowWidget() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });

  useEffect(() => {
    async function fetchCashFlow() {
      if (!profile?.organization_id) return;
      setLoading(true);

      try {
        const inicioMes = startOfMonth(new Date()).toISOString();
        const fimMes = endOfMonth(new Date()).toISOString();

          // Tenta filtrar por created_at no servidor. Se coluna não existir, faz fallback sem filtro e filtra localmente.
          let vendas: any[] | null = null;
          try {
            const resp = await safeSelect(supabase, 'vendas', 'total_venda,forma_pagamento,caixa_validado,created_at', (b: any) =>
              b.eq('organization_id', profile.organization_id).eq('status', 'concluida').gte('created_at', inicioMes).lte('created_at', fimMes).or('forma_pagamento.neq.dinheiro,caixa_validado.eq.true')
            );
            vendas = resp.data as any[] | null;
            if (resp.error) throw resp.error;
          } catch (e: any) {
            const msg = String(e?.message || e?.error || e);
            if (/created_at/i.test(msg) || /column\s+.*created_at.*does not exist/i.test(msg)) {
              const fallback = await safeSelect(supabase, 'vendas', 'total_venda,forma_pagamento,caixa_validado,created_at', (b: any) =>
                b.eq('organization_id', profile.organization_id).eq('status', 'concluida')
              );
              if (fallback.error) throw fallback.error;
              vendas = fallback.data as any[] | null;
              // filtrar localmente por data
              vendas = (vendas || []).filter((v: any) => {
                try {
                  if (!v?.created_at) return false;
                  const d = new Date(v.created_at).toISOString();
                  return d >= inicioMes && d <= fimMes;
                } catch {
                  return false;
                }
              });
            } else {
              throw e;
            }
          }

          const { data: despesas } = await supabase
            .from('fin_contas_pagar')
            .select('valor_total')
            .eq('organization_id', profile.organization_id)
            .eq('status', 'pago')
            .gte('data_pagamento', inicioMes)
            .lte('data_pagamento', fimMes);

        const totalEntradas = vendas?.reduce((acc: number, v: any) => acc + Number(v.total_venda || 0), 0) || 0;
        const totalSaidas = despesas?.reduce((acc: number, d: any) => acc + Number(d.valor_total || 0), 0) || 0;
        const saldo = totalEntradas - totalSaidas;

        setResumo({ entradas: totalEntradas, saidas: totalSaidas, saldo });

        setData([
          { label: 'Entradas', valor: totalEntradas, color: '#10b981' },
          { label: 'Saídas', valor: totalSaidas, color: '#ef4444' },
        ]);
      } catch (err) {
        console.error('Erro fluxo de caixa:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchCashFlow();
  }, [profile]);

  return (
    <Card title="Fluxo de Caixa (Mês Atual)" size="2x1" loading={loading}>
      <div className="flex flex-col md:flex-row h-full gap-6">
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Recebido</p>
              <p className="text-lg font-bold text-emerald-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.entradas)}</p>
            </div>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="text-[10px] font-bold text-red-600 uppercase">Pago</p>
              <p className="text-lg font-bold text-red-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.saidas)}</p>
            </div>
            <TrendingDown className="text-red-500" size={20} />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-slate-500">Saldo Líquido:</span>
              <span className={`text-xl font-black ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.saldo)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 h-[180px] min-w-[200px]" style={{ minWidth: 0, minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={50}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
