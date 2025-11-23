'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import Button from '@/components/Button';
import { Save, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ConfigItem {
  chave: string;
  valor: string;
  descricao: string;
}

export default function SistemaTab() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar configurações do banco
  useEffect(() => {
    async function loadConfigs() {
      try {
        const { data, error } = await supabase.from('configuracoes_sistema').select('*');
        if (error) throw error;

        const configMap: Record<string, string> = {};
        data?.forEach((item: ConfigItem) => {
          configMap[item.chave] = item.valor;
        });
        setConfigs(configMap);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    }
    void loadConfigs();
  }, []);

  // Salvar alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      // Atualiza cada chave alterada
      const updates = Object.entries(configs).map(([chave, valor]) =>
        supabase
          .from('configuracoes_sistema')
          .update({ valor, updated_at: new Date().toISOString() })
          .eq('chave', chave)
      );

      await Promise.all(updates);
      toast.success('Regras do sistema atualizadas!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (chave: string, valor: string) => {
    setConfigs((prev) => ({ ...prev, [chave]: valor }));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando regras...</div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Regras de Estoque e Validade */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            Alertas & Riscos
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alerta de Validade (Dias antes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={configs['dias_alerta_validade'] || ''}
                  onChange={(e) => handleChange('dias_alerta_validade', e.target.value)}
                  className="w-24 p-2 border rounded-lg text-right"
                />
                <span className="text-sm text-slate-500">dias</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                O sistema marcará como "Crítico" lotes que vencem neste prazo.
              </p>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estoque Mínimo Padrão
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={configs['estoque_minimo_padrao'] || ''}
                  onChange={(e) => handleChange('estoque_minimo_padrao', e.target.value)}
                  className="w-24 p-2 border rounded-lg text-right"
                />
                <span className="text-sm text-slate-500">unidades</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Valor sugerido ao cadastrar um novo insumo.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Financeiro e Produção */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="text-green-600" size={20} />
            Financeiro da Fábrica
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Margem de Lucro Alvo (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={configs['margem_padrao'] || ''}
                  onChange={(e) => handleChange('margem_padrao', e.target.value)}
                  className="w-24 p-2 border rounded-lg text-right"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Usado para calcular o preço de venda sugerido nas Fichas Técnicas.
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
              <p className="text-xs text-blue-800 flex gap-2">
                <Package size={14} className="mt-0.5" />
                <strong>Dica:</strong> Essas configurações afetam os cálculos automáticos do sistema
                Confectio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="px-6">
          <Save className="-ml-1 mr-2" />
          Salvar Regras
        </Button>
      </div>
    </div>
  );
}
