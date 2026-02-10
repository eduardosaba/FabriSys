'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { FileText, Calendar, User, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RelatorioFechamentosPage() {
  const [caixas, setCaixas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    async function carregarRelatorio() {
      setLoading(true);
      // Pega primeiro e ultimo dia do mês selecionado
      const inicio = `${mes}-01T00:00:00`;
      const fim = `${mes}-31T23:59:59`;

      const { data, error } = await supabase
        .from('caixa_sessao')
        .select(
          `
          *,
          local:locais(nome)
        `
        )
        .gte('data_abertura', inicio)
        .lte('data_abertura', fim)
        .order('data_abertura', { ascending: false });

      if (!error) {
        setCaixas(data || []);
      }
      setLoading(false);
    }

    carregarRelatorio();
  }, [mes]);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Histórico de Caixas"
        description="Auditoria de aberturas, fechamentos e quebras de caixa."
        icon={FileText}
      />

      {/* Filtro de Mês */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <label className="font-bold text-slate-700 flex items-center gap-2">
          <Calendar size={20} /> Mês de Referência:
        </label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border p-2 rounded-lg bg-slate-50"
        />
      </div>

      {/* Tabela de Relatório */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data / Status</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3 text-right">Saldo Inicial</th>
                <th className="px-4 py-3 text-right">Vendas (Sist.)</th>
                <th className="px-4 py-3 text-right">Informado</th>
                <th className="px-4 py-3 text-center">Diferença (Quebra)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {caixas.map((caixa) => {
                const dataAbertura = new Date(caixa.data_abertura).toLocaleDateString('pt-BR');
                const horaAbertura = new Date(caixa.data_abertura).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isFechado = caixa.status === 'fechado';
                const temQuebra = caixa.diferenca < 0;
                const temSobra = caixa.diferenca > 0;

                return (
                  <tr key={caixa.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{dataAbertura}</div>
                      <div className="text-xs text-slate-500 mb-1">Às {horaAbertura}</div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          isFechado
                            ? 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'bg-green-100 border-green-300 text-green-700 font-bold'
                        }`}
                      >
                        {caixa.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{caixa.local?.nome || 'Loja Principal'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      R$ {Number(caixa.saldo_inicial || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600">
                      R$ {Number(caixa.total_vendas_sistema || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {caixa.saldo_final_informado != null
                        ? `R$ ${Number(caixa.saldo_final_informado).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isFechado ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div
                          className={`flex items-center justify-center gap-1 font-bold ${
                            temQuebra
                              ? 'text-red-600'
                              : temSobra
                                ? 'text-green-600'
                                : 'text-slate-400'
                          }`}
                        >
                          {temQuebra && <AlertTriangle size={14} />}
                          {temSobra && <CheckCircle size={14} />}
                          R$ {Number(caixa.diferenca || 0).toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {caixas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum fechamento encontrado neste mês.
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
