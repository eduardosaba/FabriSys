'use client';
import { TrendingUp, Tag, AlertOctagon, DollarSign } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatBRL(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardFinanceiro() {
  const { data: kpis, error } = useSWR('/api/dashboard/kpis-financeiros', fetcher, {
    refreshInterval: 60000,
  });

  if (error)
    return (
      <div className="text-red-500 p-4 text-center font-bold">Erro ao carregar indicadores.</div>
    );
  if (!kpis)
    return <div className="animate-pulse flex space-x-4 p-4">Carregando indicadores...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Faturamento Líquido</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono">
              R$ {formatBRL(kpis.total_faturado)}
            </h3>
          </div>
          <div className="bg-emerald-100 p-3 rounded-full">
            <TrendingUp className="text-emerald-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Descontos/Combos</p>
            <h3 className="text-2xl font-black text-orange-700 font-mono">
              R$ {formatBRL(kpis.total_descontos)}
            </h3>
          </div>
          <div className="bg-orange-100 p-3 rounded-full">
            <Tag className="text-orange-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-rose-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Quebra/Diferença</p>
            <h3 className="text-2xl font-black text-rose-700 font-mono">
              R$ {formatBRL(kpis.total_quebras)}
            </h3>
          </div>
          <div className="bg-rose-100 p-3 rounded-full">
            <AlertOctagon className="text-rose-600" size={24} />
          </div>
        </div>
        <p className="text-[10px] text-rose-400 mt-2 italic font-medium">
          * Diferença não explicada por promoções.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Eficiência</p>
            <h3 className="text-2xl font-black text-blue-700 font-mono">
              {(
                (Number(kpis.total_faturado || 0) /
                  (Number(kpis.total_faturado || 0) + Number(kpis.total_quebras || 0))) *
                  100 || 0
              ).toFixed(1)}
              %
            </h3>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <DollarSign className="text-blue-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
