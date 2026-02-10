'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, TrendingUp } from 'lucide-react';

interface MetaPDV {
  local_id: string;
  local_nome: string;
  meta: number;
  vendido: number;
  percentual: number;
}

export default function KPIsMetas() {
  const [metas, setMetas] = useState<MetaPDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'dia' | 'mes'>('dia');

  useEffect(() => {
    void carregarMetas();
  }, []);

  const carregarMetas = async () => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    // Buscar todos os PDVs
    const { data: locais } = await supabase.from('locais').select('id, nome').eq('tipo', 'pdv');

    if (!locais) {
      setLoading(false);
      return;
    }

    // Para cada PDV, buscar meta do dia e vendas do dia
    const resultado: MetaPDV[] = [];

    for (const local of locais) {
      let meta = 1000;
      let totalVendido = 0;
      if (mode === 'dia') {
        // Buscar meta do dia
        const { data: metaDia } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .eq('local_id', local.id)
          .eq('data_referencia', hojeStr)
          .single();

        // Buscar vendas do dia
        const { data: vendas } = await supabase
          .from('vendas')
          .select('total_venda')
          .eq('local_id', local.id)
          .gte('created_at', `${hojeStr}T00:00:00`)
          .lt('created_at', `${hojeStr}T23:59:59`);

        totalVendido = vendas?.reduce((acc, v) => acc + (v.total_venda || 0), 0) || 0;
        meta = metaDia?.valor_meta || 1000;
      } else {
        // mês atual
        const start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const { data: metasMes } = await supabase
          .from('metas_vendas')
          .select('valor_meta')
          .eq('local_id', local.id)
          .gte('data_referencia', startStr)
          .lt('data_referencia', endStr);

        const { data: vendas } = await supabase
          .from('vendas')
          .select('total_venda')
          .eq('local_id', local.id)
          .gte('created_at', `${startStr}T00:00:00`)
          .lt('created_at', `${endStr}T00:00:00`);

        const somaMetas = (metasMes || []).reduce(
          (s: number, m: any) => s + Number(m.valor_meta || 0),
          0
        );
        meta = somaMetas || 1000;
        totalVendido = (vendas || []).reduce((acc, v) => acc + (v.total_venda || 0), 0) || 0;
      }

      const percentual = meta > 0 ? (totalVendido / meta) * 100 : 0;

      resultado.push({
        local_id: local.id,
        local_nome: local.nome,
        meta,
        vendido: totalVendido,
        percentual,
      });
    }

    setMetas(resultado);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="animate-pulse flex gap-4">
          <div className="h-20 bg-slate-200 rounded flex-1"></div>
          <div className="h-20 bg-slate-200 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4 justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-slate-800">Metas - PDVs</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Período</label>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as any);
              setLoading(true);
              void carregarMetas();
            }}
            className="bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none"
          >
            <option value="dia">Dia</option>
            <option value="mes">Mês</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metas.map((meta) => {
          const atingiu = meta.percentual >= 100;
          return (
            <div
              key={meta.local_id}
              className={`p-4 rounded-lg border-2 ${atingiu ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50'} transition-all hover:shadow-md`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700">{meta.local_nome}</span>
                {atingiu && <span className="text-green-600 text-xs font-bold">✓ ATINGIU</span>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Vendido</span>
                  <span className="font-mono font-bold text-slate-700">
                    R$ {meta.vendido.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Meta</span>
                  <span className="font-mono text-slate-600">R$ {meta.meta.toFixed(2)}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${atingiu ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
                    style={{ width: `${Math.min(meta.percentual, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${atingiu ? 'text-green-600' : 'text-blue-600'}`}
                  >
                    {meta.percentual.toFixed(1)}%
                  </span>
                  {meta.percentual > 100 && (
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <TrendingUp size={12} />+{(meta.percentual - 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
