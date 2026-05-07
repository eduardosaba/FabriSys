'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import { toast } from 'react-hot-toast';
import { ThemeSettings, ThemeColors } from '@/lib/types';
import { supabase } from './supabase';

interface ThemeContextType {
  theme: ThemeSettings;
  loading: boolean;
  error: Error | null;
  resolvedTheme: 'light' | 'dark';
  systemTheme: ThemeSettings;
  updateTheme: (
    newTheme: Partial<ThemeSettings>,
    asDefault?: boolean,
    userId?: string
  ) => Promise<void>;
  resetToSystemTheme: () => void;
  loadThemeByOrg: (organizationId: string) => Promise<void>;
  setPreviewVars?: (partial: Partial<ThemeSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: ThemeSettings = {
  name: 'Confectio',
  logo_url: '/logo.png',
  logo_scale: 1.0,
  company_logo_url: undefined,
  company_logo_scale: 1.0,
  font_family: 'Inter',
  border_radius: '0.5rem',
  theme_mode: 'light' as const,
  density: 'comfortable' as const,
  footer_company_name: 'Eduardo Saba',
  footer_system_version: '1.0.0',
  sidebar_bg: '#e9c4c2',
  sidebar_hover_bg: '#88544c',
  header_bg: '#e9c4c2',
  colors: {
    light: {
      primary: '#88544c',
      tituloPaginas: '#4a2c2b',
      secondary: '#e9c4c2',
      text: '#111827',
      accent: '#88544c',
      background: '#f5e4e2',
      hover3Submenu: '#e9c4c2',
      textoGeralHover: '#f2e8e3',
      bordasHeaderPerfil: '#88544c',
      bordasSelecaoListagens: '#e9c4c2',
      barraDashboard: '#88544c',
      barraDashboardHover: '#f2e8e3',
      receitasGraficos: '#e9c4c2',
      receitasGraficosSecundaria: '#88544c',
      despesasGraficos: '#ef4444',
      despesasGraficosSecundaria: '#f87171',
      barraRolagem: '#e9c4c2',
      barraRolagemFundo: '#4a2c2b',
      fundoLinkEAD: '#e9c4c2',
      textoLinkEAD: '#f2e8e3',
      botaoSalvar: '#e9c4c2',
      botaoSalvarAtivo: '#f2e8e3',
      botaoSalvarDesabilitado: '#6b7280',
      botaoCancelar: '#ef4444',
      botaoCancelarAtivo: '#f87171',
      botaoCancelarDesabilitado: '#9ca3af',
      botaoPesquisar: '#10b981',
      botaoPesquisarAtivo: '#34d399',
      botaoPesquisarDesabilitado: '#9ca3af',
      camposObrigatorios: '#fbbf24',
      camposNaoObrigatorios: '#374151',
      barraSuperiorMenu: '#88544c',
      textoIconeAjuda: '#9ca3af',
      iconeAjuda: '#e9c4c2',
      sidebar_bg: '#4a2c2b',
      sidebar_hover_bg: '#88544c',
      sidebar_text: '#f2e8e3',
      sidebar_active_text: '#e9c4c2',
      header_bg: '#88544c',
    },
    dark: {
      primary: '#e9c4c2',
      tituloPaginas: '#f2e8e3',
      secondary: '#4a2c2b',
      text: '#f9fafb',
      accent: '#e9c4c2',
      background: '#0b1220',
      hover3Submenu: '#4a2c2b',
      textoGeralHover: '#111827',
      bordasHeaderPerfil: '#f2e8e3',
      bordasSelecaoListagens: '#4a2c2b',
      barraDashboard: '#4a2c2b',
      barraDashboardHover: '#f2e8e3',
      receitasGraficos: '#4a2c2b',
      receitasGraficosSecundaria: '#e9c4c2',
      despesasGraficos: '#ef4444',
      despesasGraficosSecundaria: '#f87171',
      barraRolagem: '#4a2c2b',
      barraRolagemFundo: '#f2e8e3',
      fundoLinkEAD: '#4a2c2b',
      textoLinkEAD: '#f2e8e3',
      botaoSalvar: '#4a2c2b',
      botaoSalvarAtivo: '#f2e8e3',
      botaoSalvarDesabilitado: '#6b7280',
      botaoCancelar: '#ef4444',
      botaoCancelarAtivo: '#f87171',
      botaoCancelarDesabilitado: '#9ca3af',
      botaoPesquisar: '#10b981',
      botaoPesquisarAtivo: '#34d399',
      botaoPesquisarDesabilitado: '#9ca3af',
      camposObrigatorios: '#fbbf24',
      camposNaoObrigatorios: '#f3f4f6',
      barraSuperiorMenu: '#4a2c2b',
      textoIconeAjuda: '#9ca3af',
      iconeAjuda: '#4a2c2b',
      sidebar_bg: '#4a2c2b',
      sidebar_hover_bg: '#4a2c2b',
      sidebar_text: '#f2e8e3',
      sidebar_active_text: '#e9c4c2',
      header_bg: '#4a2c2b',
      footer_bg: '#4a2c2b',
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error] = useState<Error | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const lastAppliedThemeRef = useRef<string>('');

  const applyTheme = useCallback(
    (themeToApply: ThemeSettings) => {
      if (typeof window === 'undefined') return;
      const mode = themeToApply.theme_mode === 'system' ? resolvedTheme : themeToApply.theme_mode;

      const themeKey = `${mode}-${JSON.stringify(themeToApply.colors[mode])}-${themeToApply.border_radius}`;
      if (lastAppliedThemeRef.current === themeKey) return;
      lastAppliedThemeRef.current = themeKey;

      try {
        const root = document.documentElement;
        if (mode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        const allColorsMap = (themeToApply.colors || {}) as Record<string, any>;
        Object.entries(allColorsMap).forEach(([m, cmap]) => {
          const cmapObj = (cmap || {}) as Record<string, any>;
          Object.entries(cmapObj).forEach(([k, v]) => {
            if (typeof v === 'string' && v) {
              const normalized = String(k).replace(/_/g, '-');
              root.style.setProperty(`--${m}-${normalized}`, v);
              if (m === mode) {
                root.style.setProperty(`--${normalized}`, v);
                root.style.setProperty(`--${k}`, v);
              }
            }
          });
        });

        root.style.setProperty('--border-radius', themeToApply.border_radius || '0.5rem');
        root.style.setProperty('--custom-font-family', themeToApply.font_family || 'Inter');
      } catch (e) {
        console.warn('Erro ao aplicar tema:', e);
      }
    },
    [resolvedTheme]
  );

  const fetchScopedThemeColors = useCallback(
    async (options: {
      userId?: string;
      organizationId?: string;
      themeMode?: 'light' | 'dark';
    }): Promise<Partial<ThemeColors> | null> => {
      try {
        const parseExtra = (row: any) => {
          try {
            if (row && typeof row.colors_json === 'string')
              return JSON.parse(row.colors_json) || {};
          } catch (e) {
            return {};
          }
          return {};
        };

        if (options.organizationId) {
          const { data: orgData } = await supabase
            .from('user_theme_colors')
            .select('*')
            .eq('organization_id', options.organizationId)
            .eq('theme_mode', options.themeMode || resolvedTheme)
            .maybeSingle();
          if (orgData) {
            const extra = parseExtra(orgData);
            return { ...orgData, ...extra };
          }
        }

        if (options.userId) {
          const modeToQuery = options.themeMode || resolvedTheme;
          const { data } = await supabase
            .from('user_theme_colors')
            .select('*')
            .eq('user_id', options.userId)
            .eq('theme_mode', modeToQuery)
            .maybeSingle();
          if (data) {
            const extra = parseExtra(data);
            return { ...data, ...extra };
          }
        }
        return null;
      } catch (err) {
        return null;
      }
    },
    [resolvedTheme]
  );

  const fetchSystemSettings = useCallback(async (organizationId?: string) => {
    try {
      let orgId = organizationId;
      if (!orgId) {
        const { data: sessionData } = await supabase.auth.getUser();
        const user = sessionData?.user;
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();
          orgId = profileData?.organization_id;
        }
      }
      const { data: sysRow } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('chave', 'system_settings')
        .eq('organization_id', orgId || null)
        .maybeSingle();
      return sysRow || null;
    } catch (err) {
      return null;
    }
  }, []);

  const saveScopedThemeColors = useCallback(
    async (options: { userId?: string; organizationId?: string }, colors: Partial<ThemeColors>) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        const payload: any = {
          theme_mode: resolvedTheme,
          primary_color: colors.primary,
          titulo_paginas_color: colors.tituloPaginas,
          logo_url: colors.logo_url,
          logo_scale: colors.logo_scale,
          font_family: colors.font_family,
          colors_json: JSON.stringify(colors),
          updated_at: new Date().toISOString(),
        };

        if (options.organizationId) payload.organization_id = options.organizationId;
        else payload.user_id = user.id;

        await supabase.from('user_theme_colors').upsert(payload, {
          onConflict: options.organizationId ? 'organization_id,theme_mode' : 'user_id,theme_mode',
        });
      } catch (err) {
        console.error(err);
      }
    },
    [resolvedTheme]
  );

  const updateTheme = useCallback(
    async (newTheme: Partial<ThemeSettings>, asDefault = false, userId?: string) => {
      try {
        setLoading(true);
        const updatedTheme = {
          ...theme,
          ...newTheme,
          colors: newTheme.colors
            ? {
                light: { ...(theme.colors.light || {}), ...(newTheme.colors.light || {}) },
                dark: { ...(theme.colors.dark || {}), ...(newTheme.colors.dark || {}) },
              }
            : theme.colors,
        } as ThemeSettings;

        const currentMode =
          updatedTheme.theme_mode === 'system' ? resolvedTheme : updatedTheme.theme_mode;
        const colorsToSave = updatedTheme.colors[currentMode];

        if (userId) {
          await saveScopedThemeColors({ userId }, colorsToSave);
        }

        if (asDefault) {
          await supabase
            .from('system_settings')
            .upsert({ key: 'theme', value: updatedTheme, updated_at: new Date().toISOString() });
          setSystemTheme(updatedTheme);
        } else {
          window.localStorage.setItem('theme-preference', JSON.stringify(updatedTheme));
        }

        setTheme(updatedTheme);
        applyTheme(updatedTheme);
        toast.success('Tema atualizado!');
      } catch (err) {
        toast.error('Erro ao salvar tema');
      } finally {
        setLoading(false);
      }
    },
    [theme, resolvedTheme, applyTheme, saveScopedThemeColors]
  );

  const loadThemeByOrg = useCallback(
    async (organizationId: string) => {
      try {
        setLoading(true);
        const orgColors = await fetchScopedThemeColors({ organizationId });
        const sys = await fetchSystemSettings(organizationId);
        let activeTheme = systemTheme || defaultTheme;

        if (orgColors) {
          const mode = activeTheme.theme_mode === 'system' ? resolvedTheme : activeTheme.theme_mode;
          activeTheme = {
            ...activeTheme,
            colors: {
              ...activeTheme.colors,
              [mode]: { ...((activeTheme.colors as any)[mode] || {}), ...orgColors },
            },
          };
        }

        if (sys) {
          const themeMode = sys.theme_mode || activeTheme.theme_mode;
          const mode = themeMode === 'system' ? resolvedTheme : themeMode;
          activeTheme = {
            ...activeTheme,
            theme_mode: themeMode,
            colors: {
              ...activeTheme.colors,
              [mode]: { ...((activeTheme.colors as any)[mode] || {}), ...(sys.colors_json || {}) },
            },
          };
        }

        setTheme(activeTheme);
        applyTheme(activeTheme);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [fetchScopedThemeColors, fetchSystemSettings, applyTheme, resolvedTheme, systemTheme]
  );

  const setPreviewVars = useCallback((partial: Partial<ThemeSettings>) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (partial.logo_scale !== undefined)
      root.style.setProperty('--logo-scale', String(partial.logo_scale));
    if (partial.company_logo_scale !== undefined)
      root.style.setProperty('--company-logo-scale', String(partial.company_logo_scale));
  }, []);

  const resetToSystemTheme = useCallback(() => {
    setTheme(systemTheme);
    applyTheme(systemTheme);
  }, [systemTheme, applyTheme]);

  useEffect(() => {
    async function initialize() {
      try {
        const sysT = defaultTheme; // Simplificado para inicialização rápida
        let active = sysT;
        const stored = window.localStorage.getItem('theme-preference');
        if (stored) {
          active = { ...active, ...JSON.parse(stored) };
        }
        setTheme(active);
        applyTheme(active);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [applyTheme]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: { matches: boolean }) =>
      setResolvedTheme(e.matches ? 'dark' : 'light');
    setResolvedTheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      loading,
      error,
      resolvedTheme,
      systemTheme,
      updateTheme,
      resetToSystemTheme,
      loadThemeByOrg,
      setPreviewVars,
    }),
    [
      theme,
      loading,
      error,
      resolvedTheme,
      systemTheme,
      updateTheme,
      resetToSystemTheme,
      loadThemeByOrg,
      setPreviewVars,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  return context;
}
