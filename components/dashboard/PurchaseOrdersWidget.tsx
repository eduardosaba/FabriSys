'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/dashboard/Card';
import { Truck, Clock, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PedidoResumo {
  id: string;
  numero: number;
  fornecedor_nome: string;
  status: string;
  valor_total: number;
  data_prevista?: string;
}

export default function PurchaseOrdersWidget() {
  const { profile } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from('pedidos_compra')
          .select(`
            id,
            numero,
            status,
            data_prevista,
            fornecedores (nome),
            itens_pedido_compra (quantidade, valor_unitario, insumo:insumos (custo_por_ue))
          `)
          .in('status', ['pendente', 'aprovado'])
          .order('data_prevista', { ascending: true })
          .limit(5);

        if (error) throw error;

        const processados = (data || []).map((p: any) => {
          const total = (p.itens_pedido_compra || []).reduce((acc: number, item: any) => {
            const preco = item.valor_unitario ?? item.insumo?.custo_por_ue ?? 0;
            return acc + (item.quantidade * preco);
          }, 0);

          return {
            id: p.id,
            numero: p.numero,
            fornecedor_nome: p.fornecedores?.nome || 'Fornecedor Excluído',
            status: p.status,
            valor_total: total,
            data_prevista: p.data_prevista,
          };
        });

        setPedidos(processados);
      } catch (err) {
        console.error('Erro widget compras:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchOrders();
  }, [profile]);

  const getStatusStyle = (status: string, date?: string) => {
    try {
      if (date) {
        const parsed = parseISO(String(date));
        if (isPast(parsed) && !isToday(parsed)) {
          return { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle, label: 'Atrasado' };
        }
      }
    } catch (e) {
      // ignore parse errors and fallthrough to default styles
    }

    if (status === 'aprovado') return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Truck, label: 'Aprovado' };
    return { color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Clock, label: 'Pendente' };
  };

  const ActionButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push('/dashboard/insumos/pedidos-compra');
      }}
      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition-colors"
      title="Gerenciar Pedidos"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <Card title="Compras em Aberto" size="1x1" loading={loading} action={ActionButton}>
      <div className="flex flex-col h-full">
        {pedidos.length > 0 ? (
          <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {pedidos.map((pedido) => {
              const style = getStatusStyle(pedido.status, pedido.data_prevista as any);
              const Icon = style.icon as any;

              return (
                <div key={pedido.id} className="flex justify-between items-center p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors group">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono bg-slate-100 px-1 rounded text-slate-500">#{pedido.numero}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-bold flex items-center gap-1 ${style.color}`}>
                        <Icon size={8} /> {style.label}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-slate-700 truncate" title={pedido.fornecedor_nome}>{pedido.fornecedor_nome}</p>
                  </div>

                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(pedido.valor_total)}</span>
                    {pedido.data_prevista && (
                      <span className="text-[10px] text-slate-400">{format(parseISO(pedido.data_prevista), 'dd/MM', { locale: ptBR })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
            <CheckCircle2 size={32} className="mb-2 opacity-50 text-emerald-500" />
            <p className="text-xs">Tudo entregue!</p>
            <p className="text-[10px] text-slate-300">Nenhum pedido pendente.</p>
            <button onClick={() => router.push('/dashboard/insumos/pedidos-compra')} className="mt-3 text-xs text-blue-600 hover:underline">Novo Pedido</button>
          </div>
        )}
      </div>
    </Card>
  );
}
