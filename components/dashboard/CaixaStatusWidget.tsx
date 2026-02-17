'use client';

import { useEffect, useState, useCallback } from 'react';
import { getActiveLocal } from '@/lib/activeLocal';
import { getOperationalContext } from '@/lib/operationalLocal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/dashboard/Card'; // Seu novo Card
import { Lock, Unlock, AlertCircle, User, MapPin, ExternalLink } from 'lucide-react';

interface SessaoAberta {
  id: string;
  usuario?: { nome_completo: string; email: string }; 
  local?: { nome: string };
}

export default function CaixaStatusWidget() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listaAbertos, setListaAbertos] = useState<SessaoAberta[]>([]);
  const [fechadosHoje, setFechadosHoje] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      if (!profile?.organization_id) return;
      const hoje = new Date();
      const inicio = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
      const fim = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

      // 1. Caixas Abertos (respeita contexto operacional)
      const ctx = await getOperationalContext(profile);
      const activeLocal = ctx.caixa?.local_id ?? ctx.localId ?? (profile as any)?.local_id ?? getActiveLocal();

      let queryAbertos = supabase
        .from('caixa_sessao')
        .select(`id, usuario:profiles(nome_completo, email), local:locais(nome)`)
        .eq('organization_id', profile.organization_id)
        .is('data_fechamento', null)
        .eq('status', 'aberto');
      if (activeLocal) {
        queryAbertos = queryAbertos.eq('local_id', activeLocal);
      }

      const { data: dadosAbertos } = await queryAbertos;
      if (dadosAbertos) setListaAbertos(dadosAbertos as any);

      // 2. Fechados Hoje
      let queryFechados = supabase
        .from('caixa_sessao')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .gte('data_fechamento', inicio)
        .lte('data_fechamento', fim);
      if (activeLocal) {
        queryFechados = queryFechados.eq('local_id', activeLocal);
      }
      const { count } = await queryFechados;
      setFechadosHoje(count || 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void fetchStatus();
    const channel = supabase.channel('widget_caixa_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'caixa_sessao', filter: profile?.organization_id ? `organization_id=eq.${profile.organization_id}` : undefined },
        () => setTimeout(() => void fetchStatus(), 500)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStatus, profile]);

  const isAtivo = listaAbertos.length > 0;

  // Ação de cabeçalho do Card
  const ActionButton = (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        router.push('/dashboard/pdv/controle-caixa');
      }}
      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
      title="Ir para Controle de Caixa"
    >
      <ExternalLink size={16} />
    </button>
  );

  return (
    <Card 
      title="Status do Caixa" 
      size="1x1" 
      loading={loading} 
      action={ActionButton}
      className="cursor-pointer" // O card inteiro é clicável se quiser manter o comportamento antigo
    >
      <div 
        className="flex flex-col h-full justify-between"
        onClick={() => router.push('/dashboard/pdv/controle-caixa')}
      >
        {/* Status Principal */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${isAtivo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {isAtivo ? <Unlock size={24} /> : <Lock size={24} />}
            </div>
            
            {isAtivo ? (
              <div>
                <span className="flex h-3 w-3 relative mb-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xl font-bold text-slate-800">{listaAbertos.length} Abertos</span>
              </div>
            ) : (
              <span className="text-slate-500 font-medium text-sm">Nenhum caixa aberto</span>
            )}
          </div>

          {/* Lista de Operadores (Scrollável) */}
          {isAtivo && (
            <div className="space-y-2 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
              {listaAbertos.map((sessao) => (
                <div key={sessao.id} className="text-xs bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-slate-400"/>
                    <span className="font-medium text-slate-700 truncate max-w-[90px]">
                      {sessao.usuario?.nome_completo || 'Operador'}
                    </span>
                  </div>
                  {sessao.local?.nome && (
                    <div className="flex items-center gap-0.5 text-slate-400" title={sessao.local.nome}>
                       <MapPin size={10} />
                       <span className="truncate max-w-[50px]">{sessao.local.nome}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
           <span>Encerrados hoje:</span>
           <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{fechadosHoje}</span>
        </div>
      </div>
    </Card>
  );
}