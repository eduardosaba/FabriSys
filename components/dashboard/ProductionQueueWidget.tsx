'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/dashboard/Card';
import { 
  Hammer, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  CalendarDays
} from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdemProducao {
  id: string;
  codigo: string; // ex: OP-102
  status: 'pendente' | 'em_producao' | 'concluida' | 'cancelada';
  data_entrega: string;
  quantidade: number;
  produto?: { nome: string }; // Join
}

export default function ProductionQueueWidget() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);

  const fetchQueue = useCallback(async () => {
    try {
      if (!profile?.organization_id) return;

      // Busca ordens que NÃO estão concluídas nem canceladas
      // Selecionar possíveis campos de data (compatibilidade com alterações de schema)
      // Primeiro tenta com filtro por organization_id (comum em deployments SaaS)
      let rows: any[] = [];
      try {
        const { data, error } = await safeSelect(
          supabase,
          'ordens_producao',
          // Evita selecionar colunas de data que podem ter sido removidas no schema
          'id, numero_op, status, quantidade_prevista, produto_final_id',
          (b) => b.eq('organization_id', profile.organization_id).in('status', ['pendente', 'em_producao']).limit(50)
        );

        if (error) throw error;
        rows = data || [];
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        // Se a coluna organization_id não existir no banco, refaz a consulta sem o filtro
        if (/organization_id/i.test(msg) || /column \"organization_id\" does not exist/i.test(msg)) {
          const { data, error } = await safeSelect(
            supabase,
            'ordens_producao',
            'id, numero_op, status, quantidade_prevista, produto_final_id',
            (b) => b.in('status', ['pendente', 'em_producao']).limit(50)
          );
          if (error) throw error;
          rows = data || [];
        } else {
          throw err;
        }
      }

      const produtoIds = Array.from(new Set(rows.map((r: any) => String(r.produto_final_id)).filter(Boolean)));
      const produtoMap: Record<string, { nome?: string }> = {};
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase.from('produtos_finais').select('id, nome').in('id', produtoIds);
        (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome }));
      }

      // Tentativa adicional: buscar campos de data separadamente (compatibilidade)
      const dateMap: Record<string, { data_entrega?: string | null; data_entrega_prevista?: string | null }> = {};
      try {
        const ordIds = Array.from(new Set(rows.map((r: any) => String(r.id)).filter(Boolean)));
        if (ordIds.length > 0) {
          const { data: datesData, error: datesErr } = await safeSelect(supabase, 'ordens_producao', 'id, data_entrega, data_entrega_prevista', (b: any) => b.in('id', ordIds));
          if (!datesErr && datesData) {
            (datesData || []).forEach((d: any) => {
              dateMap[String(d.id)] = { data_entrega: d.data_entrega ?? null, data_entrega_prevista: d.data_entrega_prevista ?? null };
            });
          }
        }
      } catch (e) {
        // ignore errors fetching optional date fields
      }

      // ordenar no cliente por primeiro campo de data disponível
      const pickDate = (r: any) => r.data_entrega || r.data_entrega_prevista || dateMap[String(r.id)]?.data_entrega || dateMap[String(r.id)]?.data_entrega_prevista || null;
      rows.sort((a: any, b: any) => {
        const da = pickDate(a) ? new Date(pickDate(a)).getTime() : Infinity;
        const db = pickDate(b) ? new Date(pickDate(b)).getTime() : Infinity;
        return da - db;
      });

      const mappedAll = rows.map((r: any) => ({
        id: r.id,
        codigo: r.numero_op || r.codigo || '',
        status: r.status,
        data_entrega: r.data_entrega || r.data_entrega_prevista || dateMap[String(r.id)]?.data_entrega || dateMap[String(r.id)]?.data_entrega_prevista || null,
        quantidade: r.quantidade_prevista ?? r.quantidade,
        produto: { nome: produtoMap[String(r.produto_final_id)]?.nome },
      }));

      // Filtra ordens já concluídas ou canceladas — normaliza acentos/variações
      const normalize = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s|-/g, '_');
      const filtered = mappedAll.filter((m: any) => {
        const s = normalize(m.status);
        // Rejeita statuses que indiquem concluído/cancelado/finalizado
        if (/concl|cancel|finaliz|done|completed/.test(s)) return false;
        // Aceita explicitamente pendente e em_producao
        if (/^pendente/.test(s) || s.includes('em_produc')) return true;
        // Caso ambíguo, incluir por padrão (para não esconder itens inesperados)
        return true;
      });

      const mapped = filtered.slice(0, 6);

      setOrdens(mapped as any);

    } catch (err) {
      console.error('Erro fila produção:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    void fetchQueue();

    const channel = supabase
      .channel('widget_production_queue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ordens_producao', filter: profile?.organization_id ? `organization_id=eq.${profile.organization_id}` : undefined },
        () => void fetchQueue()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue, profile?.organization_id]);

  // Helper para renderizar o badge de status
  const getStatusBadge = (status: string, dateStr: string | null) => {
    if (!dateStr) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          <Clock size={10} /> Fila
        </span>
      );
    }

    let isLate = false;
    try {
      const parsed = parseISO(String(dateStr));
      isLate = isPast(parsed) && status !== 'concluida';
    } catch (e) {
      isLate = false;
    }

    if (isLate) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          <AlertCircle size={10} /> Atrasado
        </span>
      );
    }

    if (status === 'em_producao') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Produzindo
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
        <Clock size={10} /> Fila
      </span>
    );
  };

  const ActionButton = (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        router.push('/dashboard/producao/kanban');
      }}
      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
      title="Ver Quadro Kanban Completo"
    >
      <ArrowRight size={16} />
    </button>
  );

  return (
    <Card 
      title="Fila de Produção" 
      size="1x1" 
      loading={loading}
      action={ActionButton}
    >
      <div className="flex flex-col h-full">
        {ordens.length > 0 ? (
          <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {ordens.map((ordem) => (
              <div key={ordem.id} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                
                {/* Esquerda: Ícone + Infos */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg shrink-0 ${ordem.status === 'em_producao' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Hammer size={16} />
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-400 font-medium">#{ordem.codigo}</span>
                      {getStatusBadge(ordem.status, ordem.data_entrega)}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700 truncate" title={ordem.produto?.nome}>
                      {ordem.produto?.nome || 'Produto Indefinido'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                       <span className="font-medium bg-slate-100 px-1.5 rounded text-slate-600">Qtd: {ordem.quantidade}</span>
                       <span className="flex items-center gap-1">
                          <CalendarDays size={10} />
                          {(() => {
                            try {
                              return ordem.data_entrega ? formatDistanceToNow(parseISO(String(ordem.data_entrega)), { addSuffix: true, locale: ptBR }) : 'Sem data';
                            } catch (e) {
                              return 'Sem data';
                            }
                          })()}
                       </span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mb-3 relative">
                <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-yellow-300 opacity-30"></span>
                <Hammer size={24} className="text-yellow-600" />
              </div>
              <p className="text-sm font-medium text-slate-600">Produção parada</p>
              <p className="text-xs">Nenhuma ordem em fila no momento.</p>
            <button 
              onClick={() => router.push('/dashboard/producao/ordens/nova')}
              className="mt-4 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium hover:bg-blue-100 transition-colors"
            >
              + Criar Ordem
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}