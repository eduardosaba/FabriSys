'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Bell, Check, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AlertasDinamicos({ orgId }: { orgId: string }) {
  const [alertas, setAlertas] = useState<any[]>([]);

  const carregarAlertas = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from('alertas_fabrica')
      .select('*')
      .eq('lido', false)
      .order('created_at', { ascending: false });
    setAlertas(data || []);
  };

  const marcarComoLido = async (id: string) => {
    await supabase.from('alertas_fabrica').update({ lido: true }).eq('id', id);
    setAlertas((prev) => prev.filter((a) => a.id !== id));
    toast.success('Alerta arquivado');
  };

  useEffect(() => {
    let mounted = true;

    const fetchAlertas = async () => {
      if (!orgId) return;
      const { data } = await supabase
        .from('alertas_fabrica')
        .select('*')
        .eq('lido', false)
        .order('created_at', { ascending: false });
      if (mounted) setAlertas(data || []);
    };

    fetchAlertas();
    const interval = setInterval(fetchAlertas, 60000);

    // Realtime subscription para updates/insert na tabela de alertas
    let channel: any = null;
    if (orgId) {
      channel = supabase
        .channel(`alertas_fabrica_org_${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'alertas_fabrica',
            filter: `organization_id=eq.${orgId}`,
          },
          (payload) => {
            setAlertas((prev) => {
              const exists = prev.some((a) => a.id === payload.new.id);
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'alertas_fabrica',
            filter: `organization_id=eq.${orgId}`,
          },
          (payload) => {
            setAlertas((prev) => {
              if (payload.new.lido) return prev.filter((a) => a.id !== payload.new.id);
              const exists = prev.some((a) => a.id === payload.new.id);
              if (exists) return prev.map((a) => (a.id === payload.new.id ? payload.new : a));
              return [payload.new, ...prev];
            });
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
          <Bell size={14} className="text-blue-600" /> Alertas em Tempo Real
        </h4>
        <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">
          {alertas.length} ATIVOS
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {alertas.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Check size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-xs font-bold text-slate-400">Tudo sob controlo!</p>
          </div>
        ) : (
          alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-4 rounded-2xl border-l-4 shadow-sm transition-all animate-in fade-in slide-in-from-right-4 ${
                alerta.severidade === 'critica'
                  ? 'bg-rose-50 border-rose-500 text-rose-900'
                  : 'bg-amber-50 border-amber-500 text-amber-900'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={18}
                    className={alerta.severidade === 'critica' ? 'text-rose-600' : 'text-amber-600'}
                  />
                  <div>
                    <p className="text-xs font-black uppercase opacity-60">
                      {(alerta.tipo || '').replace('_', ' ')}
                    </p>
                    <p className="text-sm font-bold leading-tight mt-1">{alerta.mensagem}</p>
                    <p className="text-[10px] mt-2 opacity-50 italic">
                      Há {new Date(alerta.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => marcarComoLido(alerta.id)}
                  className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
