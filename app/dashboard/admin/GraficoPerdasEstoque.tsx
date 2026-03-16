'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
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
import { AlertCircle, TrendingDown, PackageCheck } from 'lucide-react';

export default function GraficoPerdasEstoque() {
  const [dados, setDados] = useState<any[]>([]);
  const [totalPrejuizo, setTotalPrejuizo] = useState(0);

  useEffect(() => {
    async function carregarRelatorio() {
      const { data } = await supabase.from('v_relatorio_perdas_estoque').select('*').limit(50);

      if (data) {
        const resumo = data.reduce((acc: any, curr: any) => {
          const nome = curr.produto;
          acc[nome] = (acc[nome] || 0) + Math.abs(curr.quantidade_ajuste || 0);
          return acc;
        }, {});

        const formatado = Object.keys(resumo).map((key) => ({
          name: key,
          quantidade: resumo[key],
        }));

        setDados(formatado);
        setTotalPrejuizo(data.reduce((acc, curr) => acc + (curr.valor_prejuizo || 0), 0));
      }
    }
    carregarRelatorio();
  }, []);

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Auditoria de Perdas</h3>
          <p className="text-sm text-slate-400">Divergências detectadas no Inventário PDV</p>
        </div>
        <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl flex items-center gap-2">
          <TrendingDown size={20} />
          <span className="font-black text-lg">R$ {Math.abs(totalPrejuizo).toFixed(2)}</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="quantidade" fill="#ef4444" radius={[6, 6, 0, 0]}>
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.quantidade > 10 ? '#ef4444' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm text-amber-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Maior Quebra</p>
            <p className="text-sm font-black text-slate-700">{dados[0]?.name || '--'}</p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-500">
            <PackageCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Eficiência</p>
            <p className="text-sm font-black text-slate-700">98.4%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
