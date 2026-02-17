'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface ChartData {
  date: string;     // Data legível '15/02'
  fullDate: string; // Data completa para tooltip
  value: number;    // Valor total venda
  count: number;    // Quantidade de vendas
}

export default function SalesChartWidget() {
  const { profile } = useAuth();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPeriodo, setTotalPeriodo] = useState(0);

  // Configuração: Últimos 7 dias (Padrão Executivo)
  const DAYS_TO_SHOW = 7;

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!profile?.organization_id) return;

      const hoje = new Date();
      const dataInicio = subDays(hoje, DAYS_TO_SHOW - 1); // -1 para incluir hoje

      // 1. Buscar vendas do período
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select('created_at, total_venda')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'concluida')
        .gte('created_at', startOfDay(dataInicio).toISOString())
        .lte('created_at', endOfDay(hoje).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // 2. Processar dados (Preencher dias vazios com 0)
      const processedData: ChartData[] = [];
      let acumuladoTotal = 0;

      for (let i = 0; i < DAYS_TO_SHOW; i++) {
        const diaAtual = subDays(hoje, (DAYS_TO_SHOW - 1) - i);
        
        // Filtra vendas deste dia específico (protegendo created_at nulo/inválido)
        const vendasDoDia = (vendas || []).filter(v => {
          try {
            if (!v?.created_at) return false;
            return isSameDay(parseISO(String(v.created_at)), diaAtual);
          } catch (e) {
            return false;
          }
        });

        const totalDia = vendasDoDia.reduce((acc, curr) => acc + (curr.total_venda || 0), 0);
        acumuladoTotal += totalDia;

        processedData.push({
          date: format(diaAtual, 'dd/MM'),
          fullDate: format(diaAtual, "d 'de' MMMM", { locale: ptBR }),
          value: totalDia,
          count: vendasDoDia.length
        });
      }

      setData(processedData);
      setTotalPeriodo(acumuladoTotal);

    } catch (err) {
      console.error('Erro gráfico vendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [profile]);

  // Ação de Atualizar
  const ActionButton = (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        void fetchData();
      }}
      className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
      title="Atualizar dados"
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
    </button>
  );

  return (
    <Card 
      title="Evolução de Vendas (7 Dias)" 
      size="2x1" 
      loading={loading}
      action={ActionButton}
      className="flex flex-col"
    >
      <div className="flex flex-col h-full">
        
        {/* Cabeçalho com Totalizador */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="p-2 bg-emerald-50 rounded-full text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase">Total no Período</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPeriodo)}
            </h3>
          </div>
        </div>

        {/* Área do Gráfico */}
        <div className="flex-1 w-full min-h-[200px]" style={{ minWidth: 0, minHeight: 200 }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(value) => 
                  new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
                }
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVendas)" 
                activeDot={{ r: 6, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

// Tooltip Personalizado (Estilo "Glass")
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg text-sm z-50">
        <p className="font-semibold text-slate-700 mb-1">{data.fullDate}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-slate-500">Vendas:</span>
          <span className="font-bold text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          <span className="text-slate-500">Pedidos:</span>
          <span className="font-medium text-slate-700">{data.count}</span>
        </div>
      </div>
    );
  }
  return null;
};