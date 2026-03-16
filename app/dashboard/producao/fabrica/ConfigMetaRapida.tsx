'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '@/components/ui/Card';

export default function ConfigMetaRapida({ orgId }: { orgId?: string }) {
  const [meta, setMeta] = useState<string>('1000');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMeta() {
      if (!orgId) return;
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .match({ chave: 'meta_producao_diaria', organization_id: orgId })
        .single();
      if (error) {
        console.debug('ConfigMetaRapida fetch error', error.message);
      }
      if (data && data.valor) setMeta(String(data.valor));
    }
    fetchMeta();
  }, [orgId]);

  const salvarMeta = async () => {
    if (!orgId) return toast.error('Organization missing');
    setLoading(true);
    const { error } = await supabase.from('configuracoes_sistema').upsert(
      {
        organization_id: orgId,
        chave: 'meta_producao_diaria',
        valor: String(meta),
        descricao: 'Meta diária de produção',
      },
      { onConflict: 'organization_id,chave' }
    );

    setLoading(false);
    if (error) {
      toast.error('Erro ao salvar meta');
    } else {
      toast.success('Meta atualizada! Atualizando painel...');
      // dispatch event so dashboard can react without full reload
      try {
        window.dispatchEvent(new CustomEvent('metaUpdated', { detail: { meta: Number(meta) } }));
      } catch (e) {
        /* ignore for non-browser environments */
      }
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white border-blue-100">
      <div className="flex items-center gap-2 mb-3 text-blue-700">
        <Settings size={16} />
        <h4 className="font-black text-xs uppercase tracking-widest">Ajuste de Operação</h4>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
          <Target size={12} /> Meta de Produção (Dia)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ex: 1000"
          />
          <button
            onClick={salvarMeta}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all disabled:opacity-50"
          >
            <Save size={16} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 italic">
          * A alteração da meta reflete no painel de Eficiência.
        </p>
      </div>
    </Card>
  );
}
