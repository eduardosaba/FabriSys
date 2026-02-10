'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { TrendingUp, Target, DollarSign, Percent } from 'lucide-react';

export default function PerformancePage() {
  const [locais, setLocais] = useState<any[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase
      .from('locais')
      .select('id, nome')
      .eq('tipo', 'pdv')
      .then(({ data }) => {
        setLocais(data || []);
        if (data?.[0]) setLocalSelecionado(data[0].id);
      });
  }, []);

  const carregarDados = useCallback(async () => {
    if (!localSelecionado) return;
    setLoading(true);

    const [ano, mesNum] = mes.split('-');
    const diasNoMes = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();

    // Buscar metas
    const { data: metas } = await supabase
      .from('metas_vendas')
      .select('*')
      .eq('local_id', localSelecionado)
      .gte('data_referencia', `${mes}-01`)
      .lte('data_referencia', `${mes}-${diasNoMes}`);

    // Buscar vendas realizadas
    const { data: vendas } = await supabase
      .from('vendas')
      .select('created_at, total_venda')
      .eq('local_id', localSelecionado)
      .gte('created_at', `${mes}-01T00:00:00`)
      .lt('created_at', `${mes}-${diasNoMes}T23:59:59`);

    // Agrupar vendas por dia
    const vendasPorDia: Record<string, number> = {};
    vendas?.forEach((v) => {
      const dia = v.created_at.split('T')[0];
      vendasPorDia[dia] = (vendasPorDia[dia] || 0) + v.total_venda;
    });

    // Montar dataset
    const lista = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const dataStr = `${mes}-${String(d).padStart(2, '0')}`;
      const meta = metas?.find((m) => m.data_referencia === dataStr);
      const vendido = vendasPorDia[dataStr] || 0;

      lista.push({
        data: dataStr,
        meta: meta?.valor_meta || 0,
        vendido,
        percentual: meta?.valor_meta > 0 ? (vendido / meta.valor_meta) * 100 : 0,
      });
    }

    setDados(lista);
    setLoading(false);
  }, [localSelecionado, mes]);

  useEffect(() => {
    void carregarDados();
  }, [localSelecionado, mes, carregarDados]);

  const totalVendido = dados.reduce((acc, d) => acc + d.vendido, 0);
  const totalMeta = dados.reduce((acc, d) => acc + d.meta, 0);
  const percentualGeral = totalMeta > 0 ? (totalVendido / totalMeta) * 100 : 0;
  const diasComMeta = dados.filter((d) => d.percentual >= 100).length;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Relatório de Performance"
        description="Compare as vendas realizadas com as metas estabelecidas."
        icon={TrendingUp}
      />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-center">
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">Loja / PDV</label>
          <select
            className="p-2 border rounded-lg bg-slate-50 min-w-[200px]"
            value={localSelecionado}
            onChange={(e) => setLocalSelecionado(e.target.value)}
          >
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">Mês</label>
          <input
            type="month"
            className="p-2 border rounded-lg bg-slate-50"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </div>
      </div>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-medium opacity-90">Total Vendido</span>
          </div>
          <p className="text-3xl font-bold">R$ {totalVendido.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Target size={20} />
            <span className="text-sm font-medium opacity-90">Meta do Período</span>
          </div>
          <p className="text-3xl font-bold">R$ {totalMeta.toFixed(2)}</p>
        </div>

        <div
          className={`bg-gradient-to-br ${percentualGeral >= 100 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'} p-6 rounded-xl text-white`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Percent size={20} />
            <span className="text-sm font-medium opacity-90">Atingimento</span>
          </div>
          <p className="text-3xl font-bold">{percentualGeral.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} />
            <span className="text-sm font-medium opacity-90">Dias com Meta</span>
          </div>
          <p className="text-3xl font-bold">
            {diasComMeta} / {dados.length}
          </p>
        </div>
      </div>

      {/* Tabela Detalhada */}
      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">Data</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Meta</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Vendido</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Diferença</th>
                  <th className="p-3 text-right font-semibold text-slate-700">%</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.map((d) => {
                  const diferenca = d.vendido - d.meta;
                  const atingiu = d.percentual >= 100;
                  return (
                    <tr key={d.data} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">
                        {new Date(d.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          weekday: 'short',
                        })}
                      </td>
                      <td className="p-3 text-right font-mono">R$ {d.meta.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        R$ {d.vendido.toFixed(2)}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {diferenca >= 0 ? '+' : ''}
                        {diferenca.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold">{d.percentual.toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        {atingiu ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            ✓ Atingiu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            ✗ Abaixo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
