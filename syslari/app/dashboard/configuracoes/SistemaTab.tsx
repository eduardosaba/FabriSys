'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(1);
  const { profile } = useAuth();
  const { updateTheme } = useTheme();

  // Carregar configurações do banco
  async function loadConfigs() {
    setLoading(true);
    try {
      const configMap: Record<string, string> = {};

      if (profile?.organization_id) {
        const { data: globalData } = await supabase
          .from('configuracoes_sistema')
          .select('chave, valor, organization_id, created_at, updated_at')
          .is('organization_id', null);

        const { data: orgData } = await supabase
          .from('configuracoes_sistema')
          .select('chave, valor, organization_id, created_at, updated_at')
          .eq('organization_id', profile.organization_id);

        globalData?.forEach((item: any) => {
          configMap[item.chave] = item.valor;
        });
        orgData?.forEach((item: any) => {
          configMap[item.chave] = item.valor;
        });
      } else {
        const { data, error } = await supabase
          .from('configuracoes_sistema')
          .select('chave, valor, organization_id, created_at, updated_at')
          .is('organization_id', null);
        if (error) throw error;
        data?.forEach((item: any) => {
          configMap[item.chave] = item.valor;
        });
      }

      if (!configMap['modo_pdv']) configMap['modo_pdv'] = 'padrao';

      setConfigs(configMap);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfigs();
  }, [profile?.organization_id]);

  useEffect(() => {
    // initialize scale from configs if present
    const scaleVal = configs['logo_scale'];
    if (scaleVal) {
      const parsed = Number(scaleVal);
      if (!Number.isNaN(parsed)) setLogoScale(parsed);
    }
  }, [configs]);

  // Salvar alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = (sessionData as any)?.session;
      if (!session?.user) {
        toast.error('Você precisa estar logado para salvar as configurações');
        setSaving(false);
        return;
      }
      // Usamos um único UPSERT com onConflict para evitar múltiplos POST/403 e garantir atomicidade
      const updates = Object.entries(configs).map(([chave, valor]) => ({
        chave,
        valor,
        updated_at: new Date().toISOString(),
        organization_id: profile?.organization_id ?? null,
      }));

      const onConflict = profile?.organization_id ? 'chave,organization_id' : 'chave';

      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert(updates, { onConflict });

      if (error) throw error;
      // Recarrega as configurações para garantir que a UI reflita os valores persistidos
      await loadConfigs();

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

  // Upload handler that sends the file to our server API which will resize and persist
  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }
    setSaving(true);
    try {
      // 1) Upload direto para bucket `company_assets` (bucket público para leitura)
      const fileExt = logoFile.name.split('.').pop() || 'png';
      const fileName = `settings/logo_sistema_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 2) Pegar URL pública
      const { data: publicData } = supabase.storage.from('company_assets').getPublicUrl(fileName);
      const urlPublica = publicData?.publicUrl ?? '';

      // 3) Persistir na tabela de configuracoes_sistema com upsert atômico
      const payload = {
        chave: 'visual_identity',
        valor: urlPublica,
        logo_scale: logoScale,
        primary_color: configs['primary_color'] ?? configs['primary'] ?? '#88544c',
        organization_id: profile?.organization_id ?? null,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>;

      const { error: upsertErr } = await supabase
        .from('configuracoes_sistema')
        .upsert(payload, { onConflict: 'chave,organization_id' });

      if (upsertErr) throw upsertErr;

      toast.success('Configurações visuais salvas com sucesso');
      // Atualiza o ThemeContext para aplicar a nova logo/escala imediatamente
      try {
        await updateTheme({ logo_url: urlPublica, logo_scale: logoScale });
      } catch (e) {
        // non-blocking
      }
      await loadConfigs();
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      console.error('Erro upload logo', err);
      toast.error('Erro ao enviar logo: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando regras...</div>;

  return (
    <div className="space-y-6 animate-fade-up pb-20 md:pb-0">
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
        {/* --- SEÇÃO: LOGO E IDENTIDADE --- */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Identidade Visual</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Logo do Sistema
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setLogoFile(f);
                  if (f) setLogoPreview(URL.createObjectURL(f));
                }}
              />
              {logoPreview && (
                <div className="mt-2">
                  <img src={logoPreview} alt="preview" className="h-16 object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Escala da Logo
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={logoScale}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setLogoScale(v);
                    handleChange('logo_scale', String(v));
                  }}
                />
                <span className="text-sm text-slate-500">{logoScale.toFixed(2)}x</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUploadLogo} loading={saving} variant="primary">
                Salvar Logo
              </Button>
            </div>
          </div>
        </div>
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

      <div className="pt-4 border-t border-slate-200">
        <div className="md:flex md:justify-end">
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-slate-200 shadow-lg z-40 md:static md:bg-transparent md:backdrop-blur-0 md:p-0 md:border-t-0 md:shadow-none">
            <div className="flex justify-center md:justify-end">
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
        </div>
      </div>
    </div>
  );
}
