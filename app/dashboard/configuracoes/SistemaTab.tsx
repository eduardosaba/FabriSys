'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Save, AlertTriangle, DollarSign, Package, Store } from 'lucide-react';
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

        // Define valor padrão se não existir
        if (!configMap['modo_pdv']) configMap['modo_pdv'] = 'padrao';

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
      // Usamos UPSERT para criar a configuração caso ela não exista ainda no banco
      const updates = Object.entries(configs).map(([chave, valor]) =>
        supabase.from('configuracoes_sistema').upsert({
          chave,
          valor,
          updated_at: new Date().toISOString(),
        })
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
      {/* --- SEÇÃO 1: MODO DE OPERAÇÃO DO PDV (NOVA) --- */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Store className="text-blue-600" size={20} />
          Modo de Operação do PDV (Escalabilidade)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opção 1: Padrão */}
          <div
            onClick={() => handleChange('modo_pdv', 'padrao')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-all relative ${
              configs['modo_pdv'] === 'padrao'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  configs['modo_pdv'] === 'padrao' ? 'border-blue-600' : 'border-slate-400'
                }`}
              >
                {configs['modo_pdv'] === 'padrao' && (
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                )}
              </div>
              <span
                className={`font-bold ${configs['modo_pdv'] === 'padrao' ? 'text-blue-700' : 'text-slate-700'}`}
              >
                Padrão (Registro Unitário)
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-7">
              O caixa deve registrar cada venda individualmente (bipa ou seleciona o produto). O
              estoque baixa em tempo real a cada venda.
            </p>
            <p className="text-[10px] text-slate-400 pl-7 mt-2 font-medium uppercase">
              Ideal para: Mercados, Lojas de Roupa, Varejo Geral.
            </p>
          </div>

          {/* Opção 2: Ágil / Inventário */}
          <div
            onClick={() => handleChange('modo_pdv', 'inventario')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-all relative ${
              configs['modo_pdv'] === 'inventario'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  configs['modo_pdv'] === 'inventario' ? 'border-green-600' : 'border-slate-400'
                }`}
              >
                {configs['modo_pdv'] === 'inventario' && (
                  <div className="w-2.5 h-2.5 bg-green-600 rounded-full" />
                )}
              </div>
              <span
                className={`font-bold ${configs['modo_pdv'] === 'inventario' ? 'text-green-700' : 'text-slate-700'}`}
              >
                Ágil (Por Inventário/Sobra)
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-7">
              O caixa apenas cobra. No fechamento, conta-se o que sobrou na vitrine e o sistema
              calcula a venda pela diferença do estoque inicial.
            </p>
            <p className="text-[10px] text-slate-400 pl-7 mt-2 font-medium uppercase">
              Ideal para: Padarias, Eventos, Quiosques Rápidos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- SEÇÃO 2: ALERTAS E RISCOS --- */}
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
                  className="w-24 p-2 border rounded-lg text-right outline-none focus:border-blue-500"
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
                  className="w-24 p-2 border rounded-lg text-right outline-none focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">unidades</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Valor sugerido ao cadastrar um novo insumo.
              </p>
            </div>
          </div>
        </div>

        {/* --- SEÇÃO 3: FINANCEIRO --- */}
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
                  className="w-24 p-2 border rounded-lg text-right outline-none focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Usado para calcular o preço de venda sugerido nas Fichas Técnicas.
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
              <p className="text-xs text-blue-800 flex gap-2">
                <Package size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Dica:</strong> Essas configurações afetam os cálculos automáticos em todo
                  o sistema Confectio.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          onClick={handleSave}
          loading={saving}
          icon={Save}
          className="px-8 py-3 text-lg shadow-lg shadow-blue-200"
        >
          Salvar Regras
        </Button>
      </div>
    </div>
  );
}
