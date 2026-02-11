'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { useAuth } from '@/lib/auth';
import { BarChart3, Filter, DollarSign, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Venda {
  id: string;
  created_at: string;
  valor_total: number;
  metodo_pagamento: string;
  local?: { nome: string };
}

export default function RelatorioVendasPage() {
  const { profile } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [localId, setLocalId] = useState<string>('');
  const [locais, setLocais] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    async function fetchLocais() {
      const { data } = await supabase.from('locais').select('id, nome').eq('tipo', 'pdv');
      setLocais((data as any) || []);
    }
    void fetchLocais();
  }, []);

  const carregarVendas = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('vendas')
        .select(
          `
            id,
            created_at,
            valor_total,
            metodo_pagamento,
            local:locais(nome)
          `
        )
        .gte('created_at', `${dataInicio}T00:00:00`)
        .lte('created_at', `${dataFim}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendas((data as any) || []);
    } catch (err: any) {
      console.error('Erro ao carregar vendas:', err);
      toast.error('Erro ao carregar relatório.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    void carregarVendas();
  }, [carregarVendas]);

  const totalPeriodo = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const totalPix = vendas
    .filter((v) => v.metodo_pagamento === 'pix')
    .reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const totalDinheiro = vendas
    .filter((v) => v.metodo_pagamento === 'dinheiro')
    .reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const totalCartao = vendas
    .filter((v) => v.metodo_pagamento === 'cartao')
    .reduce((acc, v) => acc + (v.valor_total || 0), 0);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Relatório de Vendas"
        description="Acompanhe o desempenho financeiro dos PDVs."
        icon={BarChart3}
      />

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Data Início
          </label>
          <input
            type="date"
            className="border p-2 rounded-lg text-sm"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
          <input
            type="date"
            className="border p-2 rounded-lg text-sm"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Loja / PDV
          </label>
          <select
            className="border p-2 rounded-lg text-sm min-w-[200px]"
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
          >
            <option value="">Todas as Lojas</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={carregarVendas}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"
        >
          <Filter size={16} /> Filtrar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Geral</p>
          <p className="text-2xl font-bold text-slate-800">R$ {totalPeriodo.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
          <p className="text-green-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <DollarSign size={14} /> Pix
          </p>
          <p className="text-2xl font-bold text-green-700">R$ {totalPix.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
          <p className="text-blue-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <CreditCard size={14} /> Cartão
          </p>
          <p className="text-2xl font-bold text-blue-700">R$ {totalCartao.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
          <p className="text-orange-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <DollarSign size={14} /> Dinheiro
          </p>
          <p className="text-2xl font-bold text-orange-700">R$ {totalDinheiro.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendas.map((venda) => (
                <tr key={venda.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(venda.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {venda.local?.nome || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">
                      {venda.metodo_pagamento}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    R$ {(venda.valor_total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              {vendas.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Nenhuma venda encontrada neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
