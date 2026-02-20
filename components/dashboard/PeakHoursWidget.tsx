'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { Clock } from 'lucide-react';

interface WidgetProps {
  filtros?: any;
  auxFiltro?: any;
  organizationId?: string;
  profile?: any;
}

export default function PeakHoursWidget({
  filtros,
  auxFiltro,
  organizationId,
  profile,
}: WidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeakHours() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - 7);
        inicio.setHours(0, 0, 0, 0);

        const { data: vendas, error } = await supabase
          .from('vendas')
          .select('created_at, total_venda')
          .eq('organization_id', organizationId)
          .eq('status', 'concluida')
          .gte('created_at', inicio.toISOString());

        if (error) throw error;

        const horasMap = new Array(24).fill(0);
        const contagemMap = new Array(24).fill(0);

        vendas?.forEach((v: any) => {
          const dataVenda = new Date(v.created_at);
          const hora = dataVenda.getHours();
          horasMap[hora] += v.total_venda ?? 0;
          contagemMap[hora] += 1;
        });

        const chartData = horasMap
          .map((total, hora) => ({
            hora: `${hora}h`,
            horaInt: hora,
            total: total,
            pedidos: contagemMap[hora],
          }))
          .filter((d) => d.horaInt >= 8 && d.horaInt <= 22);

        setData(chartData);
      } catch (err) {
        console.error('Erro pico:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchPeakHours();
  }, [organizationId, filtros, auxFiltro, profile]);

  const maxVal = Math.max(...data.map((d) => d.total), 0);

  return (
    <Card title="Horários de Pico (7d)" size="2x1" loading={loading}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
          <Clock size={12} />
          <span>Média de vendas por hora nos últimos 7 dias</span>
        </div>

        <div className="flex-1 min-h-[150px]" style={{ minWidth: 0, minHeight: 150 }}>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="hora"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-slate-100 shadow-lg rounded text-xs z-50">
                        <p className="font-bold mb-1">{d.hora}</p>
                        <p>
                          Vendas:{' '}
                          <strong>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(d.total)}
                          </strong>
                        </p>
                        <p className="text-slate-500">{d.pedidos} pedidos</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.total === maxVal ? '#3b82f6' : '#cbd5e1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
