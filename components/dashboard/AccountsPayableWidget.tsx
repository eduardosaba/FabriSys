'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/dashboard/Card';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function AccountsPayableWidget({
  filtros,
  auxFiltro,
  organizationId,
  profile,
}: WidgetProps) {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ totalPendente: 0, totalAtrasado: 0 });

  useEffect(() => {
    async function fetchBills() {
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('fin_contas_pagar')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true })
        .limit(10);

      if (!error && data) {
        let pendente = 0;
        let atrasado = 0;

        data.forEach((conta: any) => {
          try {
            if (!conta?.data_vencimento) {
              pendente += Number(conta.valor_total || 0);
              return;
            }
            const vencimento = parseISO(String(conta.data_vencimento));
            if (isPast(vencimento) && !isToday(vencimento)) {
              atrasado += Number(conta.valor_total || 0);
            } else {
              pendente += Number(conta.valor_total || 0);
            }
          } catch (e) {
            pendente += Number(conta.valor_total || 0);
          }
        });

        setContas(data);
        setResumo({ totalPendente: pendente, totalAtrasado: atrasado });
      }
      setLoading(false);
    }

    void fetchBills();
  }, [organizationId, filtros, auxFiltro, profile]);

  return (
    <Card title="Próximos Compromissos" size="1x2" loading={loading}>
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-red-50 p-2 rounded-lg border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase">Atrasado</p>
            <p className="text-sm font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                resumo.totalAtrasado
              )}
            </p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase">A Vencer</p>
            <p className="text-sm font-bold text-slate-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                resumo.totalPendente
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {contas.length > 0 ? (
            contas.map((conta: any) => {
              let vencimento: Date | null = null;
              let isAtrasado = false;
              try {
                if (conta?.data_vencimento) {
                  vencimento = parseISO(String(conta.data_vencimento));
                  isAtrasado = isPast(vencimento) && !isToday(vencimento);
                }
              } catch (e) {
                vencimento = null;
                isAtrasado = false;
              }

              return (
                <div
                  key={conta.id}
                  className="p-2 border-b border-slate-50 flex justify-between items-center group hover:bg-slate-50 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {conta.descricao}
                    </p>
                    <p
                      className={`text-[10px] flex items-center gap-1 ${isAtrasado ? 'text-red-500 font-bold' : 'text-slate-400'}`}
                    >
                      <Calendar size={10} />
                      Vence{' '}
                      {vencimento
                        ? isToday(vencimento)
                          ? 'Hoje'
                          : format(vencimento, 'dd/MM', { locale: ptBR })
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-bold text-slate-800">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(conta.valor_total)}
                    </p>
                    <button className="text-[9px] text-blue-600 opacity-0 group-hover:opacity-100 font-bold uppercase transition-opacity">
                      Pagar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
              <p className="text-xs text-slate-500">Nenhum pagamento pendente!</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
