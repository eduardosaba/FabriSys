'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Building2, MapPin, Palette, Upload, ArrowRight, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InputField } from '@/components/ui/shared';
import Button from '@/components/Button';
import { useTheme } from '@/lib/theme';
// Importando as predefinições existentes
import { THEME_PRESETS, ThemePreset } from '@/components/configuracao/theme-config';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { updateTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Estado para o preset selecionado (Inicia com o primeiro ou padrão)
  const [selectedPreset, setSelectedPreset] = useState<ThemePreset>(THEME_PRESETS[0]);

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    logo_url: '',
  });

  // 1. Carregar dados atuais da organização
  useEffect(() => {
    async function loadOrg() {
      if (authLoading) return;
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('organization_id')
        .eq('id', profile.id)
        .single();

      if (colab?.organization_id) {
        setOrgId(colab.organization_id);

        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', colab.organization_id)
          .single();

        if (org) {
          setFormData({
            nome: org.nome || '',
            cnpj: org.cnpj || '',
            telefone: org.telefone || '',
            endereco: org.endereco || '',
            logo_url: org.logo_url || '',
          });

          // Tentar encontrar o preset pela cor primária salva (opcional)
          if (org.cor_primaria) {
            const found = THEME_PRESETS.find((p) => p.colors.light.primary === org.cor_primaria);
            if (found) setSelectedPreset(found);
          }

          if (org.setup_concluido) {
            toast.success('Sua empresa já está configurada!');
            router.push('/dashboard');
          }
        }
      }
    }
    void loadOrg();
  }, [authLoading, profile, router]);

  // 2. Navegação
  const handleNext = async () => {
    if (step === 1 && !formData.nome) return toast.error('Nome da empresa é obrigatório');

    if (step === 3) {
      await finalizarSetup();
    } else {
      setStep(step + 1);
    }
  };

  // 3. Finalizar e Salvar Tudo
  const finalizarSetup = async () => {
    setLoading(true);
    try {
      // A. Atualizar Organização (Dados Cadastrais + Tema Completo)
      const { error } = await supabase
        .from('organizations')
        .update({
          ...formData,
          // Mantemos a cor_primaria para consultas rápidas
          cor_primaria: selectedPreset.colors.light.primary,
          // NOVO: Salvamos o preset inteiro para replicar identidade visual completa
          tema_config: selectedPreset,
          setup_concluido: true,
        })
        .eq('id', orgId);

      if (error) throw error;

      // B. Aplicar o Tema Completo ao Usuário atual (light e dark)
      if (profile?.id) {
        await updateTheme(
          {
            company_logo_url: formData.logo_url,
            // Passamos o objeto completo de cores do preset
            sidebar_bg: selectedPreset.sidebar_bg,
            sidebar_hover_bg: selectedPreset.sidebar_hover_bg,
            header_bg: selectedPreset.header_bg,
            // Cast para ThemeColors (seleção de preset é parcial)
            colors: {
              light: selectedPreset.colors.light as unknown as any,
              dark: selectedPreset.colors.dark as unknown as any,
            },
          },
          false,
          profile.id
        );
      }

      toast.success('Tudo pronto! Bem-vindo ao Confectio.');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  // Upload de Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    const toastId = toast.loading('Enviando logo...');
    try {
      const path = `logos/${orgId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('company-assets').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo enviada!', { id: toastId });
    } catch {
      toast.error('Erro no upload.', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-up">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">Bem-vindo ao Confectio</h2>
        <p className="mt-2 text-sm text-slate-600">
          Configuração inicial da sua fábrica em 3 passos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          {/* Barra de Progresso */}
          <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${step >= i ? 'text-blue-600 font-bold' : 'text-slate-300'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 
                            ${step >= i ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  {i}
                </div>
                {i < 3 && (
                  <div
                    className={`w-10 h-1 rounded ${step > i ? 'bg-blue-600' : 'bg-slate-100'}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* PASSO 1: DADOS BÁSICOS */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 max-w-md mx-auto">
              <div className="text-center mb-6">
                <Building2 className="mx-auto h-12 w-12 text-blue-500 mb-2" />
                <h3 className="font-medium text-lg">Sobre a Empresa</h3>
              </div>

              <InputField
                label="Nome da Confeitaria / Fábrica"
                value={formData.nome}
                onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Doces da Maria"
              />
              <InputField
                label="CNPJ (Opcional)"
                value={formData.cnpj}
                onChange={(e: any) => setFormData({ ...formData, cnpj: e.target.value })}
              />
              <InputField
                label="Telefone / WhatsApp"
                value={formData.telefone}
                onChange={(e: any) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>
          )}

          {/* PASSO 2: ENDEREÇO */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 max-w-md mx-auto">
              <div className="text-center mb-6">
                <MapPin className="mx-auto h-12 w-12 text-blue-500 mb-2" />
                <h3 className="font-medium text-lg">Localização</h3>
                <p className="text-xs text-slate-400">Usado para romaneios e notas.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Endereço Completo</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua das Flores, 123 - Centro, Cidade - UF"
                />
              </div>
            </div>
          )}

          {/* PASSO 3: IDENTIDADE VISUAL (PRESETS) */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <Palette className="mx-auto h-12 w-12 text-blue-500 mb-2" />
                <h3 className="font-medium text-lg">Identidade Visual</h3>
                <p className="text-slate-500 text-sm">Escolha um tema e adicione sua logo.</p>
              </div>

              {/* SELEÇÃO DE TEMA (PRESETS) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Escolha o Tema do Sistema
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = selectedPreset.name === preset.name;
                    const primaryColor = preset.colors.light.primary; // Assume que existe

                    return (
                      <div
                        key={preset.name}
                        onClick={() => setSelectedPreset(preset)}
                        className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-all
                                            ${isSelected ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'}`}
                      >
                        <div
                          className="w-8 h-8 rounded-full border shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{preset.name}</p>
                          {/* Mini preview do Sidebar BG se houver */}
                          {preset.sidebar_bg && (
                            <div className="flex gap-1 mt-1">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{ background: preset.sidebar_bg }}
                                title="Sidebar"
                              />
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{ background: preset.header_bg }}
                                title="Header"
                              />
                            </div>
                          )}
                        </div>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* UPLOAD DE LOGO */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo da Marca
                </label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors relative group">
                  {formData.logo_url ? (
                    <div className="text-center">
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="h-16 object-contain mx-auto mb-2"
                      />
                      <span className="text-xs text-blue-600 font-medium">Clique para alterar</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">Clique para enviar sua logo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm text-slate-500 hover:text-slate-800 font-medium px-4 py-2"
              >
                Voltar
              </button>
            ) : (
              <div></div>
            )}

            <Button onClick={handleNext} loading={loading} className="px-8">
              {step === 3 ? 'Concluir Setup' : 'Próximo'} <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
