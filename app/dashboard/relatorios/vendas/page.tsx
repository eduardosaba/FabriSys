'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { FileText, Printer, Filter, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Venda {
  id: string;
  created_at: string;
  total_venda: number;
  metodo_pagamento: string;
  local: { nome: string };
  usuario?: { email: string }; // Se tiver join com auth
}

export default function RelatorioVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [lojas, setLojas] = useState<string[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vendas')
          .select(
            `
            id, created_at, total_venda, metodo_pagamento,
            local:locais(nome)
          `
          )
          .order('created_at', { ascending: false })
          .limit(100); // Limite inicial para performance

        if (error) throw error;

        // Normaliza o relacionamento `local:locais(nome)` que vem como array
        const normalizado = (data || []).map((d: any) => ({
          ...d,
          local: Array.isArray(d.local) ? (d.local[0] ?? null) : (d.local ?? null),
        }));

        setVendas(normalizado);

        // Extrair lojas únicas
        const nomesLojas = Array.from(
          new Set(normalizado.map((v: any) => v.local?.nome).filter(Boolean))
        );
        setLojas(nomesLojas as string[]);
      } catch {
        toast.error('Erro ao carregar relatório');
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, []);

  const vendasFiltradas =
    filtroLoja === 'todas' ? vendas : vendas.filter((v) => v.local?.nome === filtroLoja);

  const totalGeral = vendasFiltradas.reduce((acc, v) => acc + v.total_venda, 0);

  // Agrupamento por Pagamento
  const porPagamento = vendasFiltradas.reduce(
    (acc, v) => {
      acc[v.metodo_pagamento] = (acc[v.metodo_pagamento] || 0) + v.total_venda;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Relatório Detalhado de Vendas"
          description="Histórico de transações dos PDVs."
          icon={FileText}
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <Printer size={18} /> Imprimir
          </button>
        </PageHeader>

        <div className="flex gap-4 items-center bg-white p-4 rounded-xl border mb-4">
          <Filter size={18} className="text-slate-400" />
          <select
            value={filtroLoja}
            onChange={(e) => setFiltroLoja(e.target.value)}
            className="bg-transparent outline-none w-full font-medium text-slate-700"
          >
            <option value="todas">Todas as Lojas</option>
            {lojas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cabeçalho Impressão */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-black">Relatório de Vendas</h1>
        <p className="text-sm text-gray-500">Extraído em {new Date().toLocaleString()}</p>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 text-white p-4 rounded-xl print:bg-gray-200 print:text-black">
          <p className="text-xs opacity-70 uppercase">Total Período</p>
          <p className="text-2xl font-bold">
            {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        {Object.entries(porPagamento).map(([metodo, valor]) => (
          <div key={metodo} className="bg-white border p-4 rounded-xl">
            <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
              <CreditCard size={12} /> {metodo.replace('_', ' ')}
            </p>
            <p className="text-lg font-bold text-slate-800">
              {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border overflow-hidden print:border-0">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 border-b print:bg-gray-100 print:text-black">
            <tr>
              <th className="px-6 py-3">Data/Hora</th>
              <th className="px-6 py-3">Loja</th>
              <th className="px-6 py-3">Pagamento</th>
              <th className="px-6 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vendasFiltradas.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-slate-600">
                  {new Date(v.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-3 font-medium text-slate-800">{v.local?.nome}</td>
                <td className="px-6 py-3 capitalize">
                  <span className="px-2 py-1 rounded bg-slate-100 text-xs border text-slate-600">
                    {v.metodo_pagamento.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-bold text-green-700">
                  {v.total_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
