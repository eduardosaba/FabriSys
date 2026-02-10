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
  const [editingLocal, setEditingLocal] = useState<string | null>(null);
  const [editingValor, setEditingValor] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

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

  const abrirEdicao = (localId: string, currentMeta: number) => {
    setEditingLocal(localId);
    setEditingValor(currentMeta || 0);
  };

  const fecharEdicao = () => {
    setEditingLocal(null);
    setEditingValor('');
  };

  const salvarMetaMensal = async () => {
    if (!editingLocal) return;
    setSaving(true);
    try {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const payload = {
        local_id: editingLocal,
        data_referencia: primeiroDia,
        valor_meta: Number(editingValor) || 0,
      };

      const { error } = await supabase
        .from('metas_vendas')
        .upsert([payload], { onConflict: 'local_id,data_referencia' });

      if (error) throw error;
      await carregarMetas();
      fecharEdicao();
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
      alert('Erro ao salvar meta. Veja o console para detalhes.');
    } finally {
      setSaving(false);
    }
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
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => abrirEdicao(meta.local_id, meta.meta)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
                  >
                    Editar Meta
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editingLocal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h4 className="text-lg font-bold mb-3">Editar Meta Mensal</h4>
            <div className="mb-3">
              <label className="text-sm text-slate-600">Valor da Meta (mensal)</label>
              <input
                type="number"
                value={editingValor as any}
                onChange={(e) =>
                  setEditingValor(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full mt-2 p-2 border rounded"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={fecharEdicao} className="px-3 py-2 rounded border">
                Cancelar
              </button>
              <button
                onClick={salvarMetaMensal}
                disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                {saving ? 'Salvando...' : 'Salvar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
