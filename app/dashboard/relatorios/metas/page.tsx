'use client';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { BarChart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KPIsMetas from '@/components/dashboard/KPIsMetas';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

function monthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { start, end };
}

export default function RelatorioMetasPage() {
  const { profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [metaMensal, setMetaMensal] = useState(0);
  const [realizadoMensal, setRealizadoMensal] = useState(0);
  const [porUnidade, setPorUnidade] = useState<any[]>([]);
  const [mes, setMes] = useState<number>(new Date().getMonth());
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [pdv, setPdv] = useState<string | 'all'>('all');
  const [listaPDVs, setListaPDVs] = useState<Array<{ id: string; nome: string }>>([]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const COLORS = ['#8884d8', '#82ca9d', '#ff8042', '#ffc658', '#a4de6c', '#d0ed57'];

  useEffect(() => {
    void carregarRelatorio(ano, mes, pdv);
  }, [ano, mes, pdv]);

  useEffect(() => {
    void carregarPDVs();
  }, []);

  const carregarPDVs = async () => {
    const { data: locais } = await supabase.from('locais').select('id, nome').order('nome');
    setListaPDVs((locais || []).map((l: any) => ({ id: l.id, nome: l.nome })));
  };

  const carregarRelatorio = async (
    yearParam = ano,
    monthIndexParam = mes,
    pdvFilter: string | 'all' = pdv
  ) => {
    setLoading(true);
    const { start, end } = monthRange(yearParam, monthIndexParam);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Buscar metas do mês
    let metasQuery = supabase
      .from('metas_vendas')
      .select('local_id, valor_meta, data_referencia')
      .gte('data_referencia', startISO.split('T')[0])
      .lt('data_referencia', endISO.split('T')[0]);
    if (pdvFilter !== 'all') metasQuery = metasQuery.eq('local_id', pdvFilter);
    const { data: metas } = await metasQuery;

    const totalMeta = (metas || []).reduce((s: number, m: any) => s + (m.valor_meta || 0), 0);

    // Buscar vendas do mês
    let vendasQuery = supabase
      .from('vendas')
      .select('local_id, total_venda, created_at')
      .gte('created_at', startISO)
      .lt('created_at', endISO);
    if (pdvFilter !== 'all') vendasQuery = vendasQuery.eq('local_id', pdvFilter);
    const { data: vendas } = await vendasQuery;

    const totalVendido = (vendas || []).reduce((s: number, v: any) => s + (v.total_venda || 0), 0);

    // Agrupar por local e buscar nomes amigáveis
    const mapUnidades: Record<string, { local_id: string; vendido: number; meta: number }> = {};

    (metas || []).forEach((m: any) => {
      const id = m.local_id || 'unknown';
      mapUnidades[id] = mapUnidades[id] || { local_id: id, vendido: 0, meta: 0 };
      mapUnidades[id].meta += Number(m.valor_meta || 0);
    });

    (vendas || []).forEach((v: any) => {
      const id = v.local_id || 'unknown';
      mapUnidades[id] = mapUnidades[id] || { local_id: id, vendido: 0, meta: 0 };
      mapUnidades[id].vendido += Number(v.total_venda || 0);
    });

    // Buscar nomes dos locais envolvidos
    const locaisIds = Object.keys(mapUnidades).filter((id) => id && id !== 'unknown');
    let nomesMap: Record<string, string> = {};
    if (locaisIds.length > 0) {
      const { data: locais } = await supabase.from('locais').select('id, nome').in('id', locaisIds);
      nomesMap = (locais || []).reduce(
        (acc: Record<string, string>, l: any) => ({ ...acc, [l.id]: l.nome }),
        {}
      );
    }

    const lista = Object.values(mapUnidades).map((u) => ({
      ...u,
      local_nome: nomesMap[u.local_id] || u.local_id,
      percentual: u.meta > 0 ? (u.vendido / u.meta) * 100 : 0,
    }));

    setMetaMensal(totalMeta);
    setRealizadoMensal(totalVendido);
    setPorUnidade(lista);
    setLoading(false);
  };

  return (
    <div className="p-6 animate-fade-up flex flex-col gap-6">
      <PageHeader
        title="Acompanhamento de Metas"
        description="Relatório com KPIs e acompanhamento diário/mensal das metas"
        icon={BarChart}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="text-sm text-slate-500">Meta Mensal</h4>
          <div className="text-2xl font-bold">R$ {metaMensal.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="text-sm text-slate-500">Realizado</h4>
          <div className="text-2xl font-bold text-green-600">R$ {realizadoMensal.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="text-sm text-slate-500">Progresso</h4>
          <div className="text-2xl font-bold">
            {metaMensal > 0 ? Math.round((realizadoMensal / metaMensal) * 100) : 0}%
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-xs text-slate-500">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="block mt-1"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Ano</label>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="block mt-1"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500">PDV</label>
            <select
              value={pdv}
              onChange={(e) => setPdv(e.target.value as any)}
              className="block mt-1 w-full"
            >
              <option value="all">Todos</option>
              {listaPDVs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Tipo de gráfico</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="block mt-1"
            >
              <option value="bar">Barra</option>
              <option value="line">Linha</option>
              <option value="pie">Pizza</option>
            </select>
          </div>
        </div>
      </div>

      <KPIsMetas />

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-bold mb-2">Gráfico: Meta vs Realizado por Unidade</h4>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' && (
              <ReBarChart data={porUnidade} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="local_nome" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="meta" name="Meta" fill="#8884d8" />
                <Bar dataKey="vendido" name="Realizado" fill="#82ca9d" />
              </ReBarChart>
            )}

            {chartType === 'line' && (
              <ReLineChart data={porUnidade} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="local_nome" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#8884d8" />
                <Line type="monotone" dataKey="vendido" name="Realizado" stroke="#82ca9d" />
              </ReLineChart>
            )}

            {chartType === 'pie' && (
              <PieChart>
                <Pie
                  data={porUnidade}
                  dataKey="vendido"
                  nameKey="local_nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {porUnidade.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <h4 className="font-bold mb-2">Detalhamento por unidade</h4>
        {loading ? (
          <div>Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-2">Unidade</th>
                <th className="p-2 text-right">Meta</th>
                <th className="p-2 text-right">Realizado</th>
                <th className="p-2 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {porUnidade.map((u) => (
                <tr key={u.local_id}>
                  <td className="p-2">{u.local_nome || u.local_id}</td>
                  <td className="p-2 text-right">R$ {u.meta.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {u.vendido.toFixed(2)}</td>
                  <td className="p-2 text-right">{Math.round(u.percentual)}%</td>
                </tr>
              ))}
              {porUnidade.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    Nenhum dado disponível para o mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
