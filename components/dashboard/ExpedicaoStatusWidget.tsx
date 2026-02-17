'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Truck, Package, Clock, AlertCircle } from 'lucide-react';
import Loading from '@/components/ui/Loading';
import Link from 'next/link';

export default function ExpedicaoStatusWidget() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ pendentes: 0, emTransito: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!profile?.organization_id) return;
      try {
        setLoading(true);

        // 1. OPs prontas na Fábrica aguardando envio
        const { count: pendentes } = await supabase
          .from('ordens_producao')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .in('estagio_atual', ['concluido', 'expedicao'])
          .neq('status', 'finalizada');

        // 2. Cargas que já saíram mas o PDV ainda não recebeu
        const { count: emTransito } = await supabase
          .from('distribuicao_pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'enviado');

        setStats({ pendentes: pendentes || 0, emTransito: emTransito || 0 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [profile]);

  if (loading) return <div className="h-40 flex items-center justify-center"><Loading /></div>;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
          <Truck size={20} />
        </div>
        <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Fluxo de Logística</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        <Link href="/dashboard/logistica/expedicao" className="group">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Package size={16} className="text-slate-400" />
              {stats.pendentes > 5 && <AlertCircle size={14} className="text-amber-500 animate-pulse" />}
            </div>
            <p className="text-2xl font-black text-slate-800">{stats.pendentes}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Aguardando Envio</p>
          </div>
        </Link>

        <Link href="/dashboard/pdv/recebimento" className="group">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Clock size={16} className="text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-800">{stats.emTransito}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Em Trânsito</p>
          </div>
        </Link>
      </div>

      <div className="mt-4 text-center">
        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase">Status em Tempo Real</span>
      </div>
    </div>
  );
}
