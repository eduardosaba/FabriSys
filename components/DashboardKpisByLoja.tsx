'use client';
import useSWR from 'swr';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function currencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function DashboardKpisByLoja() {
  const { data, error } = useSWR('/api/dashboard/kpis-financeiros?group_by=loja', fetcher, {
    refreshInterval: 60000,
  });

  if (error)
    return (
      <div className="text-red-500 p-4 text-center font-bold">Erro ao carregar dados por loja.</div>
    );
  if (!data) return <div className="animate-pulse p-4">Carregando dados por loja...</div>;

  const lista = data.by_loja || data.byStore || data; // compatibilidade com diferentes formatos

  if (!Array.isArray(lista) || lista.length === 0) {
    return <div className="p-4 text-sm text-gray-600">Nenhuma informação por loja disponível.</div>;
  }

  const chartData = lista.map((item: any) => ({
    name: item.loja_nome || item.loja_id || item.name || '—',
    faturado: Number(item.total_faturado ?? item.total_faturamento ?? 0),
    quebras: Number(item.total_quebras ?? 0),
  }));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase">Comparativo por PDV</p>
          <h3 className="text-lg font-black text-gray-800">Faturamento vs Quebra por Loja</h3>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => currencyBRL(Number(v))} />
            <Tooltip formatter={(val: number) => currencyBRL(Number(val))} />
            <Legend />
            <Bar dataKey="faturado" name="Faturado" fill="#16a34a" />
            <Bar dataKey="quebras" name="Quebras" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Valores em reais. Use isto para comparar performance entre unidades e identificar hotspots
        de quebra.
      </p>
    </div>
  );
}
