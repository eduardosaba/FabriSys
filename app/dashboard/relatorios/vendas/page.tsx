'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { useAuth } from '@/lib/auth';
import { BarChart3, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalDetalhesCaixa from '@/components/ModalDetalhesCaixa';

interface Caixa {
  id: string;
  data_fechamento: string;
  total_vendas_sistema: number;
  diferenca: number;
  loja?: { nome: string };
}

export default function RelatorioVendasPage() {
  const { profile, loading: authLoading } = useAuth();
  const [caixasConfirmados, setCaixasConfirmados] = useState<Caixa[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [localId, setLocalId] = useState<string>('');
  const [locais, setLocais] = useState<{ id: string; nome: string }[]>([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.organization_id) return;

    async function fetchLocais() {
      const { data } = await supabase.from('locais').select('id, nome').eq('tipo', 'pdv');
      setLocais((data as any) || []);
    }
    void fetchLocais();
  }, []);

  const carregarRelatorioConsolidado = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('caixa_sessao')
        .select('*, loja:locais(nome)')
        .eq('status_conferencia', 'confirmado')
        .gte('data_fechamento', `${dataInicio}T00:00:00`)
        .lte('data_fechamento', `${dataFim}T23:59:59`)
        .order('data_fechamento', { ascending: false });

      if (localId) query = (query as any).eq('loja', localId);

      const { data, error } = await query;

      if (error) throw error;
      setCaixasConfirmados((data as any) || []);
    } catch (err: any) {
      console.error('Erro ao carregar relatório consolidado:', err);
      toast.error('Erro ao carregar relatório.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, localId]);

  useEffect(() => {
    void carregarRelatorioConsolidado();
  }, [carregarRelatorioConsolidado]);

  const faturamentoTotal = caixasConfirmados.reduce(
    (acc, c) => acc + (c.total_vendas_sistema || 0),
    0
  );
  const diferencaTotal = caixasConfirmados.reduce((acc, c) => acc + (c.diferenca || 0), 0);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Relatório de Vendas"
        description="Relatório consolidado por fechamento de caixa (apenas conferidos)."
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
          onClick={carregarRelatorioConsolidado}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"
        >
          <Filter size={16} /> Filtrar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">
            Faturamento (confirmado)
          </p>
          <p className="text-2xl font-bold text-slate-800">R$ {faturamentoTotal.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
          <p className="text-blue-600 text-xs font-bold uppercase mb-1">Caixas Confirmados</p>
          <p className="text-2xl font-bold text-blue-700">{caixasConfirmados.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Diferença Total</p>
          <p
            className={`text-2xl font-bold ${diferencaTotal < 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            R$ {diferencaTotal.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Visão</p>
          <p className="text-2xl font-bold text-slate-800">Por PDV / Geral</p>
        </div>
      </div>

      {/* Tabela de Fechamentos */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Diferença</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {caixasConfirmados.map((caixa) => (
                <tr key={caixa.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(caixa.data_fechamento).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {caixa.loja?.nome || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    R$ {(caixa.total_vendas_sistema || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        (caixa.diferenca || 0) < 0
                          ? 'text-red-600 font-bold'
                          : 'text-green-600 font-bold'
                      }
                    >
                      R$ {(caixa.diferenca || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setCaixaSelecionado(caixa.id)}
                      className="text-xs bg-slate-100 p-1 rounded px-2 hover:bg-slate-200"
                    >
                      Ver Detalhes do Dia
                    </button>
                  </td>
                </tr>
              ))}
              {caixasConfirmados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhum fechamento encontrado neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes */}
      {caixaSelecionado && (
        <ModalDetalhesCaixa caixaId={caixaSelecionado} onClose={() => setCaixaSelecionado(null)} />
      )}
    </div>
  );
}
