import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

type Row = { local_nome: string; local_tipo: string; total_unidades: number; mix_produtos: number };

export default function WidgetDistribuicaoEstoque() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase.from('vista_distribuicao_estoque').select('*');
        if (error) throw error;
        if (mounted) setData((rows as any) || []);
      } catch (err) {
        console.warn('Erro ao carregar vista_distribuicao_estoque:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalGeral = data.reduce((acc, r) => acc + Number(r.total_unidades || 0), 0) || 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
        Distribuição de Inventário
      </h3>
      {loading ? (
        <div className="text-sm text-slate-400">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const total = Number(item.total_unidades || 0);
            const percentual = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : '0.0';
            return (
              <div key={item.local_nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">
                    {item.local_tipo === 'fabrica' ? '🏭 Fábrica' : '🏪 Lojas / PDVs'} —{' '}
                    {item.local_nome}
                  </span>
                  <span className="font-bold text-slate-800">{percentual}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.local_tipo === 'fabrica' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percentual}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {total} unidades totais — {item.mix_produtos} SKUs
                </p>
              </div>
            );
          })}

          <div className="mt-6 pt-4 border-t border-dashed flex justify-between items-center text-[10px] text-slate-500">
            <span>Total geral</span>
            <span className="font-bold text-slate-700">{totalGeral} unidades</span>
          </div>
        </div>
      )}
    </div>
  );
}
