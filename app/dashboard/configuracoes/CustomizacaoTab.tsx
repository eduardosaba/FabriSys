import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import Tabs from '@/components/ui/Tabs';
import { toast } from 'react-hot-toast';
import SavePresetModal from '@/components/configuracao/SavePresetModal';
import { supabase } from '@/lib/supabase';

// Importações dos componentes refatorados
import {
  ADMIN_FIELDS,
  MASTER_FIELDS,
  THEME_PRESETS,
  ThemePreset,
} from '@/components/configuracao/theme-config';
import { ColorFieldsSection } from '@/components/configuracao/ColorFieldsSection';
import { LogoUploadSection } from '@/components/configuracao/LogoUploadSection';
import { ThemePresetsSection } from '@/components/configuracao/ThemePresetsSection';
import { FooterSettingsSection } from '@/components/configuracao/FooterSettingsSection';
import { FontSettingsSection } from '@/components/configuracao/FontSettingsSection';
import { SystemNameSection } from '@/components/configuracao/SystemNameSection';

export default function CustomizacaoTab() {
  const { theme, updateTheme, loading } = useTheme();
  // Aplica as variáveis CSS do tema customizado (dark ou light)
  useEffect(() => {
    if (!theme) return;
    const themeMode = theme.theme_mode === 'system' ? 'light' : theme.theme_mode || 'light';
    const themeColors = theme.colors?.[themeMode] as import('@/lib/types').ThemeColors | undefined;
    if (themeColors && typeof themeColors === 'object') {
      Object.entries(themeColors).forEach(([key, value]) => {
        const colorValue = typeof value === 'string' ? value : String(value);
        document.documentElement.style.setProperty(`--${themeMode}-${key}`, colorValue);
        if (themeMode === 'dark') {
          document.documentElement.style.setProperty(`--${key}`, colorValue);
        }
        if (themeMode === 'light') {
          document.documentElement.style.setProperty(`--${key}`, colorValue);
        }
      });
    }
  }, [theme]);
  const { profile, loading: authLoading } = useAuth();
  const isMasterAdmin = profile?.role === 'master';

  // Estado local para configurações
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [appliedPreset, setAppliedPreset] = useState<(typeof THEME_PRESETS)[0] | null>(null);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  // Predefinições criadas pelo usuário (carregadas do banco)
  const [userPresets, setUserPresets] = useState<ThemePreset[]>([]);

  type UserThemeRow = { id: number; colors_json?: string | null };

  // Determinar quais campos mostrar baseado no tipo de usuário
  const availableFields = isMasterAdmin ? MASTER_FIELDS : ADMIN_FIELDS;

  // Inicializar configurações com valores atuais do tema
  useEffect(() => {
    const themeMode = theme.theme_mode;
    const themeColors = theme.colors;
    if (themeColors && typeof themeColors === 'object' && themeMode in themeColors) {
      const currentColors = themeColors[themeMode as keyof typeof themeColors];
      if (currentColors && typeof currentColors === 'object') {
        const initialSettings: Record<string, string | number> = {
          logo_url: theme.logo_url || '/logo.png',
          logo_scale: theme.logo_scale || 1,
          company_logo_url: theme.company_logo_url || '',
          company_logo_scale: theme.company_logo_scale || 1,
          font_family: theme.font_family || 'Inter',
          name: theme.name || 'Confectio',
          footer_company_name: theme.footer_company_name || 'Eduardo Saba',
          footer_system_version: theme.footer_system_version || '1.0.0',
          sidebar_bg: '#e8e8e8',
          sidebar_hover_bg: '#88544c',
          header_bg: '#e9c4c2',
        };

        // Adicionar todas as cores disponíveis baseado no tipo de usuário
        availableFields.forEach(({ key }) => {
          if (key in currentColors) {
            const colorValue = currentColors[key as keyof typeof currentColors];
            initialSettings[key] = typeof colorValue === 'string' ? colorValue : '#000000';
          }
        });

        setSettings(initialSettings);
      }
    }
  }, [theme, availableFields]);

  // Handler para mudanças nos campos
  const handleFieldChange = (key: string, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Atualizar variáveis CSS em tempo real para preview
    if (key === 'logo_scale' && typeof value === 'number') {
      document.documentElement.style.setProperty('--logo-scale', value.toString());
    } else if (key === 'company_logo_scale' && typeof value === 'number') {
      document.documentElement.style.setProperty('--company-logo-scale', value.toString());
    }

    // Se uma predefinição foi aplicada, atualizar a predefinição em memória
    // para que alterações feitas pelo usuário substituam as cores da predefinição
    if (appliedPreset) {
      try {
        const mode = theme.theme_mode as keyof typeof appliedPreset.colors;
        const presetColorsForMode = {
          ...(appliedPreset.colors?.[mode] || {}),
        } as Record<string, string>;

        // atualizar cor específica no modo atual
        if (typeof value === 'string') {
          presetColorsForMode[key] = value;
        } else {
          presetColorsForMode[key] = String(value);
        }

        const newPreset = {
          ...appliedPreset,
          colors: {
            ...appliedPreset.colors,
            [mode]: presetColorsForMode,
          },
        } as typeof appliedPreset;

        // também atualizar campos globais (sidebar_bg, sidebar_hover_bg, header_bg)
        if (key === 'sidebar_bg' || key === 'sidebar_hover_bg' || key === 'header_bg') {
          // atribui às propriedades opcionais do preset explicitamente
          const v = typeof value === 'string' ? value : String(value);
          if (key === 'sidebar_bg') newPreset.sidebar_bg = v;
          if (key === 'sidebar_hover_bg') newPreset.sidebar_hover_bg = v;
          if (key === 'header_bg') newPreset.header_bg = v;
        }

        setAppliedPreset(newPreset);
      } catch (err) {
        console.warn('Não foi possível atualizar predefinição em memória:', err);
      }
    }
  };

  // Handler para aplicar predefinição
  const handleApplyPreset = (preset: ThemePreset) => {
    // Aplicando predefinição: preparar settings para preview
    // Aplica as cores do preset para ambos os modos
    const newSettings = { ...settings };
    const lightColors = preset.colors.light || {};
    const darkColors = preset.colors.dark || {};

    // Atualiza settings com as cores do modo atual (para preview)
    const themeMode = theme.theme_mode;
    const currentModeColors = themeMode === 'light' ? lightColors : darkColors;

    Object.entries(currentModeColors).forEach(([key, value]) => {
      newSettings[key] = typeof value === 'string' ? value : String(value);
    });

    // Aplica campos globais do preset (sidebar_bg, sidebar_hover_bg, header_bg, sidebar_text, sidebar_active_text)
    newSettings.sidebar_bg = preset.sidebar_bg || newSettings.sidebar_bg || '#e8e8e8';
    newSettings.sidebar_hover_bg =
      preset.sidebar_hover_bg || newSettings.sidebar_hover_bg || '#88544c';
    newSettings.header_bg = preset.header_bg || newSettings.header_bg || '#e9c4c2';
    if ('sidebar_text' in currentModeColors && typeof currentModeColors.sidebar_text === 'string')
      newSettings.sidebar_text = currentModeColors.sidebar_text;
    if (
      'sidebar_active_text' in currentModeColors &&
      typeof currentModeColors.sidebar_active_text === 'string'
    )
      newSettings.sidebar_active_text = currentModeColors.sidebar_active_text;

    // newSettings atualizado com campos globais do preset

    // Validação simples de contraste para modo dark
    const darkBg = darkColors?.background ?? '#111827';
    const darkText = darkColors?.text ?? '#f9fafb';
    function luminance(hex: string) {
      hex = hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const contrast = Math.abs(luminance(darkBg) - luminance(darkText));
    if (contrast < 0.3) {
      toast.error('Atenção: as cores do modo escuro podem não ter contraste suficiente!');
    } else {
      toast.success(
        `Predefinição "${preset.name}" aplicada! As cores serão salvas para ambos os modos (light e dark) quando você clicar em "Salvar Customização".`
      );
    }

    setAppliedPreset(preset);
    setSettings(newSettings);
  };

  // Salvar customização
  const handleSave = async () => {
    try {
      const themeMode = theme.theme_mode;
      const themeColors = theme.colors;
      if (!themeColors || typeof themeColors !== 'object') return;

      const updatedSettings = { ...theme };

      // Se uma predefinição foi aplicada, salvar para ambos os modos
      // resolve userId: prefer profile, caso não esteja disponível tentar buscar via supabase.auth
      let userId = profile?.id;
      if (!userId) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          userId = user?.id;
        } catch (e: unknown) {
          // ignora aqui; updateTheme aceitará undefined e salvará localmente
          console.warn('Não foi possível obter userId via supabase.auth.getUser()', e);
        }
      }

      if (appliedPreset) {
        const lightColors = appliedPreset.colors.light || {};
        const darkColors = appliedPreset.colors.dark || {};

        // Preparar configurações para light (cast seguro via unknown para satisfazer o TS)
        const lightUpdatedColors = {
          ...(lightColors || {}),
        } as unknown as import('@/lib/types').ThemeColors;

        // Preparar configurações para dark (cast seguro via unknown para satisfazer o TS)
        const darkUpdatedColors = {
          ...(darkColors || {}),
        } as unknown as import('@/lib/types').ThemeColors;

        // Aplicar campos globais da predefinição
        if ('sidebar_bg' in appliedPreset) {
          updatedSettings.sidebar_bg = appliedPreset.sidebar_bg;
        }
        if ('sidebar_hover_bg' in appliedPreset) {
          updatedSettings.sidebar_hover_bg = appliedPreset.sidebar_hover_bg;
        }
        if ('header_bg' in appliedPreset) {
          updatedSettings.header_bg = appliedPreset.header_bg;
        }

        // Salvar configurações específicas do usuário admin para ambos os modos
        await updateTheme(
          {
            ...updatedSettings,
            colors: {
              ...themeColors,
              light: lightUpdatedColors,
              dark: darkUpdatedColors,
            },
          },
          false,
          userId
        );

        setAppliedPreset(null); // Reset após salvar
      } else {
        // Salvar apenas o modo atual (customização individual)
        if (!(themeMode in themeColors)) return;

        const currentColors = themeColors[themeMode as keyof typeof themeColors];
        if (!currentColors || typeof currentColors !== 'object') return;

        // Preparar as configurações a serem salvas
        const updatedColors: Record<string, string | number> = { ...currentColors };

        // Separar cores e configurações de logo
        Object.entries(settings).forEach(([key, value]) => {
          if (key === 'logo_url') {
            updatedSettings.logo_url = value as string;
          } else if (key === 'logo_scale') {
            updatedSettings.logo_scale = value as number;
          } else if (key === 'company_logo_url') {
            updatedSettings.company_logo_url = value as string;
          } else if (key === 'company_logo_scale') {
            updatedSettings.company_logo_scale = value as number;
          } else if (key === 'font_family') {
            updatedSettings.font_family = value as string;
          } else if (key === 'name') {
            updatedSettings.name = value as string;
          } else if (key === 'footer_company_name') {
            updatedSettings.footer_company_name = value as string;
          } else if (key === 'footer_system_version') {
            updatedSettings.footer_system_version = value as string;
          } else if (key === 'sidebar_bg') {
            updatedSettings.sidebar_bg = value as string;
          } else if (key === 'sidebar_hover_bg') {
            updatedSettings.sidebar_hover_bg = value as string;
          } else if (key === 'header_bg') {
            updatedSettings.header_bg = value as string;
          } else if (typeof value === 'string') {
            updatedColors[key] = value;
          }
        });

        // Salvar configurações específicas do usuário admin
        await updateTheme(
          {
            ...updatedSettings,
            colors: {
              ...themeColors,
              [themeMode]: updatedColors,
            },
          },
          false,
          userId
        );
      }
    } catch (error) {
      console.error('Erro ao salvar customização:', error);
    }
  };

  // Construir um objeto de predefinição a partir do estado atual/appliedPreset
  const buildPresetFromCurrent = (): ThemePreset => {
    const presetName = appliedPreset?.name || `Custom ${new Date().toISOString()}`;
    const key = (presetName || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Se houver predefinição aplicada, usamos ela como base, senão usamos settings/theme
    let colorsForLight: Record<string, string> = {};
    let colorsForDark: Record<string, string> = {};

    if (appliedPreset) {
      colorsForLight = { ...(appliedPreset.colors?.light || {}) };
      colorsForDark = { ...(appliedPreset.colors?.dark || {}) };
    } else {
      // Extrair do tema atual e do settings
      const themeColors = theme.colors || {};
      colorsForLight = { ...(themeColors.light || {}) } as unknown as Record<string, string>;
      colorsForDark = { ...(themeColors.dark || {}) } as unknown as Record<string, string>;

      // sobrepor com settings do usuário
      Object.entries(settings).forEach(([k, v]) => {
        if (typeof v === 'string') {
          colorsForLight[k] = v;
          colorsForDark[k] = v;
        }
      });
    }

    return {
      key,
      name: presetName,
      description: 'Custom preset created by user',
      colors: {
        light: colorsForLight,
        dark: colorsForDark,
      },
    } as ThemePreset;
  };

  // Persistir predefinição no campo colors_json do registro user_theme_colors para ambos os modos
  const persistUserPreset = async (presetObj: ThemePreset) => {
    if (!profile?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    const modes: Array<'light' | 'dark'> = ['light', 'dark'];

    for (const mode of modes) {
      try {
        const resp = await supabase
          .from('user_theme_colors')
          .select('id, colors_json')
          .eq('user_id', profile.id)
          .eq('theme_mode', mode)
          .single();
        const data = resp.data as unknown;
        const error = resp.error as unknown;

        if (error && (error as { code?: string }).code !== 'PGRST116') {
          console.error('Erro ao buscar registro user_theme_colors:', error);
          toast.error('Erro ao salvar predefinição');
          continue;
        }

        if (data && typeof data === 'object' && 'id' in data) {
          const row = data as Record<string, unknown>;
          let jsonObj: { presets: ThemePreset[] } = { presets: [] };
          const colorsJsonRaw = typeof row.colors_json === 'string' ? row.colors_json : undefined;
          if (colorsJsonRaw) {
            try {
              const parsed = JSON.parse(colorsJsonRaw) as unknown;
              const maybePresets = (parsed as { presets?: unknown }).presets;
              if (Array.isArray(maybePresets)) {
                const safePresets: ThemePreset[] = [];
                maybePresets.forEach((p) => {
                  if (p && typeof p === 'object') {
                    const candidate = p as Record<string, unknown>;
                    if (typeof candidate.name === 'string') {
                      const nameVal = candidate.name;
                      const keyVal = typeof candidate.key === 'string' ? candidate.key : undefined;
                      const descVal =
                        typeof candidate.description === 'string' ? candidate.description : '';
                      const candidateColors =
                        candidate.colors && typeof candidate.colors === 'object'
                          ? (candidate.colors as Record<string, unknown>)
                          : undefined;
                      const lightColors =
                        candidateColors &&
                        candidateColors.light &&
                        typeof candidateColors.light === 'object'
                          ? (candidateColors.light as Record<string, string>)
                          : {};
                      const darkColors =
                        candidateColors &&
                        candidateColors.dark &&
                        typeof candidateColors.dark === 'object'
                          ? (candidateColors.dark as Record<string, string>)
                          : {};

                      const preset: ThemePreset = {
                        key: keyVal,
                        name: nameVal,
                        description: descVal,
                        colors: {
                          light: lightColors,
                          dark: darkColors,
                        },
                      };
                      safePresets.push(preset);
                    }
                  }
                });
                jsonObj = { presets: safePresets };
              }
            } catch (err: unknown) {
              void err;
              jsonObj = { presets: [] };
            }
          }
          jsonObj.presets = jsonObj.presets || [];
          jsonObj.presets.push(presetObj);

          const rowId = Number(String(row.id ?? ''));
          const { error: updateErr } = await supabase
            .from('user_theme_colors')
            .update({ colors_json: JSON.stringify(jsonObj), updated_at: new Date().toISOString() })
            .eq('id', rowId);

          if (updateErr) {
            console.error('Erro ao atualizar colors_json:', updateErr);
            toast.error('Erro ao salvar predefinição');
          }
        } else {
          // Inserir novo registro se não existir (caso raro)
          const jsonObj = { presets: [presetObj] };
          const { error: insertErr } = await supabase.from('user_theme_colors').insert({
            user_id: profile.id,
            theme_mode: mode,
            primary_color: (settings.primary as string) || '#4A2C2B',
            titulo_paginas_color: (settings.tituloPaginas as string) || '#ffffff',
            logo_url: (settings.logo_url as string) || '/logo.png',
            logo_scale: (settings.logo_scale as number) || 1.0,
            colors_json: JSON.stringify(jsonObj),
          });

          if (insertErr) {
            console.error('Erro ao inserir colors_json:', insertErr);
            toast.error('Erro ao salvar predefinição');
          }
        }
      } catch (err) {
        console.error('Erro ao persistir predefinição:', err);
        toast.error('Erro ao salvar predefinição');
      }
    }

    toast.success('Predefinição salva com sucesso no seu perfil!');
    // Atualizar estado local com a nova predefinição para que apareça imediatamente
    try {
      setUserPresets((prev) => {
        // Evita duplicatas por chave
        const exists = prev.some((p) => p.key === presetObj.key || p.name === presetObj.name);
        if (exists) return prev.map((p) => (p.key === presetObj.key ? presetObj : p));
        return [...prev, presetObj];
      });
    } catch (err: unknown) {
      void err; // não crítico
    }
  };

  const handleSaveAsPreset = async (name: string) => {
    setShowSavePresetModal(false);
    const presetObj = buildPresetFromCurrent();
    presetObj.name = name;
    presetObj.key = (name || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await persistUserPreset(presetObj);
  };

  // Carregar predefinições do usuário (do campo colors_json)
  const loadUserPresets = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const resp = await supabase
        .from('user_theme_colors')
        .select('colors_json')
        .eq('user_id', profile.id);
      const data = resp.data as unknown;
      const error = resp.error as unknown;
      if (error) {
        console.error('Erro ao carregar predefinições do usuário:', error);
        return;
      }

      const presets: ThemePreset[] = [];
      const rows = Array.isArray(data) ? data : [];
      rows.forEach((row) => {
        const rowObj = row as Record<string, unknown>;
        const colorsJsonRaw =
          row && typeof row === 'object' && typeof rowObj.colors_json === 'string'
            ? rowObj.colors_json
            : undefined;
        if (colorsJsonRaw) {
          try {
            const parsed = JSON.parse(colorsJsonRaw) as unknown;
            const maybePresets = (parsed as { presets?: unknown }).presets;
            if (Array.isArray(maybePresets)) {
              maybePresets.forEach((p) => {
                if (p && typeof p === 'object') {
                  const candidate = p as Record<string, unknown>;
                  if (typeof candidate.name === 'string') {
                    const nameVal =
                      typeof candidate.name === 'string'
                        ? candidate.name
                        : String(candidate.name ?? '');
                    const keyVal =
                      typeof candidate.key === 'string' ? String(candidate.key) : undefined;
                    const descVal =
                      typeof candidate.description === 'string'
                        ? String(candidate.description)
                        : '';
                    const candidateColors =
                      candidate.colors && typeof candidate.colors === 'object'
                        ? (candidate.colors as Record<string, unknown>)
                        : undefined;
                    const lightColors =
                      candidateColors &&
                      candidateColors.light &&
                      typeof candidateColors.light === 'object'
                        ? (candidateColors.light as Record<string, string>)
                        : {};
                    const darkColors =
                      candidateColors &&
                      candidateColors.dark &&
                      typeof candidateColors.dark === 'object'
                        ? (candidateColors.dark as Record<string, string>)
                        : {};

                    const preset: ThemePreset = {
                      key: keyVal,
                      name: nameVal,
                      description: descVal,
                      colors: {
                        light: lightColors,
                        dark: darkColors,
                      },
                    };
                    presets.push(preset);
                  }
                }
              });
            }
          } catch (err: unknown) {
            void err; // ignora JSON inválido
          }
        }
      });

      // remover duplicatas por key
      const deduped: ThemePreset[] = [];
      const seen = new Set<string>();
      presets.forEach((p) => {
        const k = p.key || p.name;
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(p);
        }
      });

      setUserPresets(deduped);
    } catch (err: unknown) {
      console.error('Erro ao carregar predefinições do usuário:', err);
    }
  }, [profile?.id]);

  // Carregar ao montar / quando o perfil mudar
  useEffect(() => {
    void loadUserPresets();
  }, [loadUserPresets]);

  return (
    <div className="space-y-6">
      {/* Seção Admin da Marca - Customização Pessoal */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Text variant="h3" className="text-primary">
              {isMasterAdmin ? '🎨 Configuração Completa do Tema' : '🎨 Customização do Sistema'}
            </Text>
            <span className="bg-primary/10 rounded px-2 py-1 text-xs text-primary">
              {isMasterAdmin ? 'Master Admin - Controle Total' : 'Personalização Individual'}
            </span>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            <p>
              {isMasterAdmin
                ? 'Configure todas as cores e elementos visuais do sistema. Suas mudanças afetam toda a interface.'
                : 'Personalize suas cores padrão que serão aplicadas em toda a interface do sistema.'}
            </p>
          </div>

          <Tabs
            tabs={[
              {
                id: 'general',
                label: 'Geral',
                icon: '🏷️',
                content: (
                  <div className="space-y-6">
                    {/* Seção de Logo */}
                    <div className="mb-6">
                      <Text className="mb-3 font-medium">Logo Personalizado</Text>

                      {/* Nome do Sistema */}
                      <SystemNameSection settings={settings} onFieldChange={handleFieldChange} />

                      <LogoUploadSection
                        title="Upload de Logo"
                        description="Máximo 2MB. Formatos: PNG, JPG, SVG"
                        logoUrl={settings.logo_url as string}
                        logoScale={(settings.logo_scale as number) || 1}
                        onLogoUrlChange={(url) => handleFieldChange('logo_url', url)}
                        onLogoScaleChange={(scale) => handleFieldChange('logo_scale', scale)}
                        storagePath="user-logo"
                      />
                    </div>

                    {/* Seção de Logo da Empresa */}
                    <div className="mb-6">
                      <Text className="mb-3 font-medium">Logo da Empresa</Text>
                      <p className="mb-3 text-sm text-gray-600">
                        Este logo aparecerá ao lado do logo do sistema no cabeçalho para
                        identificação da sua empresa.
                      </p>

                      <LogoUploadSection
                        title="Upload do Logo da Empresa"
                        description="Máximo 2MB. Formatos: PNG, JPG, SVG"
                        logoUrl={settings.company_logo_url as string}
                        logoScale={(settings.company_logo_scale as number) || 1}
                        onLogoUrlChange={(url) => handleFieldChange('company_logo_url', url)}
                        onLogoScaleChange={(scale) =>
                          handleFieldChange('company_logo_scale', scale)
                        }
                        storagePath="company-logo"
                      />
                    </div>
                  </div>
                ),
              },
              {
                id: 'appearance',
                label: 'Aparência',
                icon: '🎨',
                content: (
                  <div className="space-y-6">
                    {/* Seção de Fonte */}
                    <FontSettingsSection settings={settings} onFieldChange={handleFieldChange} />

                    {/* Seção de Predefinições */}
                    <ThemePresetsSection
                      presets={[...THEME_PRESETS, ...userPresets]}
                      onApplyPreset={handleApplyPreset}
                    />

                    {/* Campos de customização pessoal do admin */}
                    <ColorFieldsSection
                      availableFields={availableFields}
                      settings={settings}
                      onFieldChange={handleFieldChange}
                    />
                  </div>
                ),
              },
              {
                id: 'system',
                label: 'Sistema',
                icon: '⚙️',
                content: (
                  <div className="space-y-6">
                    {/* Seção de Footer */}
                    <FooterSettingsSection settings={settings} onFieldChange={handleFieldChange} />
                  </div>
                ),
              },
            ]}
            defaultActiveTab="general"
          />
        </Card>
      )}

      {/* Botão de salvar */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Button className="px-6 py-2" onClick={handleSave} disabled={loading || authLoading}>
              {loading || authLoading
                ? 'Salvando...'
                : appliedPreset
                  ? `Salvar Predefinição "${appliedPreset.name}"`
                  : 'Salvar Customização'}
            </Button>

            <Button
              variant="outline"
              className="px-4 py-2"
              onClick={() => setShowSavePresetModal(true)}
            >
              Salvar como predefinição
            </Button>
          </div>

          {appliedPreset && (
            <p className="mt-2 text-sm text-gray-600 text-center">
              Esta ação salvará as cores da predefinição para ambos os modos (light e dark)
            </p>
          )}
        </div>
      )}

      <SavePresetModal
        open={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        onSave={handleSaveAsPreset}
        defaultName={appliedPreset?.name}
      />

      {/* Mensagem para usuários sem permissão */}
      {(!profile || (profile.role !== 'admin' && profile.role !== 'master')) && (
        <Card className="p-6 text-center">
          <Text variant="h3" className="mb-2 text-gray-600">
            🔒 Acesso Restrito
          </Text>
          <Text className="text-gray-500">
            Apenas usuários com permissão de Admin ou Master Admin podem acessar a customização
            visual.
          </Text>
        </Card>
      )}
    </div>
  );
}
