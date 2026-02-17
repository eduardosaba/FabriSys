'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import { Coins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function InventoryValueWidget() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [breakdown, setBreakdown] = useState<any[]>([]);

  useEffect(() => {
    async function fetchValue() {
        try {
        const { data: insumos, error } = await safeSelect(supabase, 'insumos', 'estoque_atual, custo_por_ue, nome', (b: any) => b.gt('estoque_atual', 0));

        if (error) throw error;

        let totalInsumos = 0;
        (insumos || []).forEach((item: any) => {
          const qtd = Number(item.estoque_atual || 0);
          const custo = Number(item.custo_por_ue || 0);
          totalInsumos += qtd * custo;
        });

        setTotal(totalInsumos);
        setBreakdown([{ name: 'Insumos / Matéria Prima', value: totalInsumos, color: '#3b82f6' }]);
      } catch (err) {
        console.error('Erro valuation:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchValue();
  }, [profile]);

  return (
    <Card title="Valor em Estoque (Custo)" size="1x1" loading={loading}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Capital Imobilizado</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </h3>
          </div>
        </div>

        <div className="mt-4 h-24 w-full flex items-center" style={{ minWidth: 0, minHeight: 96 }}>
          <ResponsiveContainer width="100%" height={96}>
            <PieChart>
              <Pie data={breakdown} innerRadius={30} outerRadius={45} paddingAngle={5} dataKey="value" startAngle={90} endAngle={-270}>
                {breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="ml-4 text-xs text-slate-500">
            <p>Baseado no Custo Médio</p>
            <p>dos Insumos ativos.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
