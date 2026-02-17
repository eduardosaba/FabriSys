'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import { 
  TrendingDown, 
  Target, 
  Zap, 
  AlertCircle,
  BarChart3,
  Search
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function RelatorioPerdasProducao() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ planejado: 0, realizado: 0, perdaTotal: 0, eficiencia: 0 });

  useEffect(() => {
    fetchRelatorio();
  }, [profile]);

  async function fetchRelatorio() {
    if (!profile?.organization_id) return;
    
    try {
      const inicio = startOfMonth(new Date()).toISOString();
      const fim = endOfMonth(new Date()).toISOString();

      const { data, error } = await supabase
        .from('ordens_producao')
        .select(`
          numero_op,
          quantidade_prevista,
          quantidade_produzida,
          data_expedicao,
          produtos_finais(nome)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('status', 'finalizada') // Apenas o que já passou pela expedição
        .gte('data_expedicao', inicio)
        .lte('data_expedicao', fim);

      if (error) throw error;

      let tPlanejado = 0;
      let tRealizado = 0;

      const formatados = (data || []).map(op => {
        const qPlanejada = Number(op.quantidade_prevista || 0);
        const qRealizada = Number(op.quantidade_produzida || 0);
        const diff = qPlanejada - qRealizada;
        const percPerda = qPlanejada > 0 ? (diff / qPlanejada) * 100 : 0;

        tPlanejado += qPlanejada;
        tRealizado += qRealizada;

        return {
          ...op,
          perda: diff > 0 ? diff : 0,
          perc: percPerda.toFixed(1)
        };
      });

      setItens(formatados);
      
      const totalPerda = tPlanejado - tRealizado;
      setResumo({
        planejado: tPlanejado,
        realizado: tRealizado,
        perdaTotal: totalPerda,
        eficiencia: tPlanejado > 0 ? (tRealizado / tPlanejado) * 100 : 100
      });

    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <PageHeader 
        title="Rendimento da Produção" 
        description="Analise a diferença entre o planejado no Kanban e o entregue na Expedição."
        icon={BarChart3}
      />

      {/* CARDS DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Planejado" value={resumo.planejado} icon={Target} color="text-slate-600" />
        <MetricCard title="Total Realizado" value={resumo.realizado} icon={Zap} color="text-blue-600" />
        <MetricCard title="Quebra (Perda)" value={resumo.perdaTotal} icon={TrendingDown} color="text-red-600" />
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Eficiência Geral</span>
            <span className={`text-2xl font-black ${resumo.eficiencia > 95 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {resumo.eficiencia.toFixed(1)}%
            </span>
        </div>
      </div>

      {/* LISTAGEM DETALHADA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-4">Data Exp.</th>
              <th className="px-6 py-4">Produto / OP</th>
              <th className="px-6 py-4 text-right">Planejado</th>
              <th className="px-6 py-4 text-right">Realizado</th>
              <th className="px-6 py-4 text-right">Perda (Un)</th>
              <th className="px-6 py-4 text-right">Perda (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itens.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500">
                  {item.data_expedicao ? format(new Date(item.data_expedicao), 'dd/MM/yy') : '-'}
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800">{item.produtos_finais?.nome}</p>
                  <p className="text-[10px] text-slate-400">OP #{item.numero_op}</p>
                </td>
                <td className="px-6 py-4 text-right font-medium">{item.quantidade_prevista}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">{item.quantidade_produzida}</td>
                <td className="px-6 py-4 text-right text-red-500 font-bold">
                  {item.perda > 0 ? `-${item.perda}` : '0'}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Number(item.perc) > 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.perc}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{title}</span>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
      </div>
      <Icon className="text-slate-200" size={32} />
    </div>
  );
}
