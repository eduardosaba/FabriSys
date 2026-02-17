'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import { Trophy, Target, TrendingUp, ShoppingBag } from 'lucide-react';

export default function MetaDoDiaWidget() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vendasHoje: 0,
    pedidosHoje: 0,
    metaLoja: 0,
    percentual: 0
  });

  useEffect(() => {
    async function fetchMyStats() {
      if (!profile?.organization_id || !(profile as any).local_id) return;
      const localId = (profile as any).local_id;
      const userId = profile.id;
      const hoje = new Date();

      const inicioDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
      const fimDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();
      const dataHojeStr = new Date().toISOString().split('T')[0];

      try {
        const { data: vendas, error: errVendas } = await supabase
          .from('vendas')
          .select('total_venda')
          .eq('organization_id', profile.organization_id)
          .eq('local_id', localId)
          .eq('usuario_id', userId)
          .eq('status', 'concluida')
          .gte('created_at', inicioDia)
          .lte('created_at', fimDia);

        if (errVendas) throw errVendas;

        const { data: metaData } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .eq('local_id', localId)
          .eq('data_referencia', dataHojeStr)
          .maybeSingle();

        const totalVendas = vendas?.reduce((acc: number, curr: any) => acc + (curr.total_venda || 0), 0) || 0;
        const totalPedidos = vendas?.length || 0;
        const valorMeta = Number(metaData?.valor_meta || 0);
        const percentual = valorMeta > 0 ? (totalVendas / valorMeta) * 100 : 0;

        setStats({ vendasHoje: totalVendas, pedidosHoje: totalPedidos, metaLoja: valorMeta, percentual });
      } catch (err) {
        console.error('Erro meta pdv:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchMyStats();
  }, [profile]);

  return (
    <Card title="Meu Desempenho (Hoje)" size="1x1" loading={loading}>
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded text-blue-600">
              <ShoppingBag size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase">Minhas Vendas</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.vendasHoje)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{stats.pedidosHoje} pedidos realizados</p>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-end mb-1 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Target size={12} /> Meta da Loja
            </span>
            <span className="font-bold text-blue-600">{stats.percentual.toFixed(1)}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-slate-100 opacity-50" />
            <div
              className={`h-full rounded-full transition-all duration-1000 ${stats.percentual >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(stats.percentual, 100)}%` }}
            />
          </div>

          {stats.percentual >= 100 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 py-1 rounded animate-pulse">
              <Trophy size={12} /> Meta Batida! Parabéns!
            </div>
          )}
        </div>

      </div>
    </Card>
  );
}
