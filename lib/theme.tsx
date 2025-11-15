'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: ThemeSettings = {
  name: 'Confectio',
  logo_url: '/logo.png', // Mantenha ou atualize para o URL da logo 'confectio'
  logo_scale: 1.0,
  company_logo_url: undefined,
  company_logo_scale: 1.0,
  font_family: 'Inter',
  border_radius: '0.5rem',
  theme_mode: 'light' as const,
  density: 'comfortable' as const,
  footer_company_name: 'Eduardo Saba',
  footer_system_version: '1.0.0',
  sidebar_bg: '#e8e8e8',
  sidebar_hover_bg: '#88544c',
  header_bg: '#e9c4c2',
  colors: {
    light: {
      primary: '#88544c', // Caramelo - Botões, Links
      tituloPaginas: '#4a2c2b', // Chocolate Escuro
      secondary: '#e9c4c2', // Rosa Claro - Destaques suaves
      accent: '#88544c',
      background: '#f5e4e2', // Pêssego Claro - Fundo Geral
      text: '#4a2c2b',
      hover3Submenu: '#88544c',
      textoGeralHover: '#4a2c2b',
      bordasHeaderPerfil: '#e9c4c2',
      bordasSelecaoListagens: '#88544c',
      barraDashboard: '#88544c',
      barraDashboardHover: '#4a2c2b',
      receitasGraficos: '#88544c',
      receitasGraficosSecundaria: '#e9c4c2',
      despesasGraficos: '#dc2626', // Vermelho Padrão
      despesasGraficosSecundaria: '#ef4444', // Vermelho Padrão
      barraRolagem: '#88544c',
      barraRolagemFundo: '#f5e4e2',
      fundoLinkEAD: '#88544c',
      textoLinkEAD: '#4a2c2b',
      botaoSalvar: '#88544c',
      botaoSalvarAtivo: '#4a2c2b',
      botaoSalvarDesabilitado: '#9ca3af',
      botaoCancelar: '#dc2626',
      botaoCancelarAtivo: '#b91c1c',
      botaoCancelarDesabilitado: '#d1d5db',
      botaoPesquisar: '#059669', // Verde Padrão
      botaoPesquisarAtivo: '#047857', // Verde Padrão
      botaoPesquisarDesabilitado: '#d1d5db',
      camposObrigatorios: '#f59e0b', // Laranja Padrão
      camposNaoObrigatorios: '#f3f4f6',
      barraSuperiorMenu: '#88544c',
      textoIconeAjuda: '#374151',
      iconeAjuda: '#88544c',
    },
    dark: {
      primary: '#e9c4c2', // Rosa Claro - Destaque em fundo escuro
      tituloPaginas: '#f2e8e3', // Branco Suave
      secondary: '#88544c', // Caramelo
      accent: '#e9c4c2',
      background: '#4a2c2b', // Chocolate Escuro - Fundo Geral
      text: '#f2e8e3',
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
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Limpeza: evita conflito com next-themes que usa a chave 'theme' no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('theme');
      } catch {
        void 0; // noop: limpeza best-effort
      }
    }
  }, []);

  const applyTheme = useCallback(
    (themeToApply: ThemeSettings) => {
      if (typeof window === 'undefined') return;

      const mode = themeToApply.theme_mode === 'system' ? resolvedTheme : themeToApply.theme_mode;

      const colors = themeToApply.colors[mode];
      const root = document.documentElement;

      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--secondary', colors.secondary);
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--background', colors.background);
      root.style.setProperty('--text', colors.text);
      root.style.setProperty('--titulo-paginas', colors.tituloPaginas);
      root.style.setProperty('--hover-3-submenu', colors.hover3Submenu);
      root.style.setProperty('--texto-geral-hover', colors.textoGeralHover);
      root.style.setProperty('--bordas-header-perfil', colors.bordasHeaderPerfil);
      root.style.setProperty('--bordas-selecao-listagens', colors.bordasSelecaoListagens);
      root.style.setProperty('--barra-dashboard', colors.barraDashboard);
      root.style.setProperty('--barra-dashboard-hover', colors.barraDashboardHover);
      root.style.setProperty('--receitas-graficos', colors.receitasGraficos);
      root.style.setProperty('--receitas-graficos-secundaria', colors.receitasGraficosSecundaria);
      root.style.setProperty('--despesas-graficos', colors.despesasGraficos);
      root.style.setProperty('--despesas-graficos-secundaria', colors.despesasGraficosSecundaria);
      root.style.setProperty('--barra-rolagem', colors.barraRolagem);
      root.style.setProperty('--barra-rolagem-fundo', colors.barraRolagemFundo);
      root.style.setProperty('--fundo-link-ead', colors.fundoLinkEAD);
      root.style.setProperty('--texto-link-ead', colors.textoLinkEAD);
      root.style.setProperty('--botao-salvar', colors.botaoSalvar);
      root.style.setProperty('--botao-salvar-ativo', colors.botaoSalvarAtivo);
      root.style.setProperty('--botao-salvar-desabilitado', colors.botaoSalvarDesabilitado);
      root.style.setProperty('--botao-cancelar', colors.botaoCancelar);
      root.style.setProperty('--botao-cancelar-ativo', colors.botaoCancelarAtivo);
      root.style.setProperty('--botao-cancelar-desabilitado', colors.botaoCancelarDesabilitado);
      root.style.setProperty('--botao-pesquisar', colors.botaoPesquisar);
      root.style.setProperty('--botao-pesquisar-ativo', colors.botaoPesquisarAtivo);
      root.style.setProperty('--botao-pesquisar-desabilitado', colors.botaoPesquisarDesabilitado);
      root.style.setProperty('--campos-obrigatorios', colors.camposObrigatorios);
      root.style.setProperty('--campos-nao-obrigatorios', colors.camposNaoObrigatorios);
      root.style.setProperty('--barra-superior-menu', colors.barraSuperiorMenu);
      root.style.setProperty('--texto-icone-ajuda', colors.textoIconeAjuda);
      root.style.setProperty('--icone-ajuda', colors.iconeAjuda);
      root.style.setProperty('--border-radius', themeToApply.border_radius);
      // Aplicar fonte baseada na seleção - definir diretamente a família de fonte
      const fontMap: Record<string, string> = {
        Inter: 'Inter, sans-serif',
        Poppins: 'Poppins, sans-serif',
        Roboto: 'Roboto, sans-serif',
        'Open Sans': 'Open Sans, sans-serif',
        Lato: 'Lato, sans-serif',
        Montserrat: 'Montserrat, sans-serif',
        Nunito: 'Nunito, sans-serif',
        Ubuntu: 'Ubuntu, sans-serif',
        'Crimson Text': 'Crimson Text, serif',
        'Playfair Display': 'Playfair Display, serif',
        Lora: 'Lora, serif',
        Merriweather: 'Merriweather, serif',
      };
      root.style.setProperty(
        '--custom-font-family',
        fontMap[themeToApply.font_family] || 'Inter, sans-serif'
      );
      root.style.setProperty('--logo-scale', themeToApply.logo_scale.toString());
      root.style.setProperty(
        '--company-logo-scale',
        (themeToApply.company_logo_scale ?? 1.0).toString()
      );
      root.style.setProperty('--sidebar-bg', themeToApply.sidebar_bg || '#e9c4c2');
      root.style.setProperty('--sidebar-hover-bg', themeToApply.sidebar_hover_bg || '#88544c');
      root.style.setProperty('--header-bg', themeToApply.header_bg || '#e9c4c2');
    },
    [resolvedTheme]
  );

  const resetToSystemTheme = useCallback(() => {
    setTheme(systemTheme);
    applyTheme(systemTheme);
  }, [systemTheme, applyTheme]);

  const fetchTheme = useCallback(async (): Promise<ThemeSettings> => {
    // Por enquanto, retorna o tema padrão
    // Futuramente pode buscar do banco de dados se houver configurações globais
    return defaultTheme;
  }, []);

  const fetchUserThemeColors = useCallback(
    async (userId: string): Promise<Partial<ThemeColors> | null> => {
      try {
        const { data, error } = await supabase
          .from('user_theme_colors')
          .select(
            'primary_color, titulo_paginas_color, logo_url, logo_scale, company_logo_url, company_logo_scale, font_family'
          )
          .eq('user_id', userId)
          .eq('theme_mode', resolvedTheme)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = not found
          console.error('Erro ao buscar cores do usuário:', error);
          return null;
        }

        if (data) {
          return {
            primary: data.primary_color as string,
            tituloPaginas: data.titulo_paginas_color as string,
            logo_url: data.logo_url as string,
            logo_scale: data.logo_scale as number,
            company_logo_url: data.company_logo_url as string,
            company_logo_scale: data.company_logo_scale as number,
            font_family: data.font_family as string,
          };
        }

        return null;
      } catch (err) {
        console.error('Erro ao carregar cores do usuário:', err);
        return null;
      }
    },
    [resolvedTheme]
  );

  const saveUserThemeColors = useCallback(
    async (userId: string, colors: Partial<ThemeColors>) => {
      try {
        // Primeiro tenta atualizar o registro existente
        const { data: updateData, error: updateError } = await supabase
          .from('user_theme_colors')
          .update({
            primary_color: colors.primary ?? '#4A2C2B',
            titulo_paginas_color: colors.tituloPaginas ?? '#ffffff',
            logo_url: colors.logo_url ?? '/logo.png',
            logo_scale: colors.logo_scale ?? 1.0,
            company_logo_url: colors.company_logo_url,
            company_logo_scale: colors.company_logo_scale ?? 1.0,
            font_family: colors.font_family ?? 'Inter',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('theme_mode', resolvedTheme)
          .select();

        // Se não atualizou nada (registro não existe), faz insert
        if (!updateData || updateData.length === 0) {
          const { error: insertError } = await supabase.from('user_theme_colors').insert({
            user_id: userId,
            theme_mode: resolvedTheme,
            primary_color: colors.primary ?? '#4A2C2B',
            titulo_paginas_color: colors.tituloPaginas ?? '#ffffff',
            logo_url: colors.logo_url ?? '/logo.png',
            logo_scale: colors.logo_scale ?? 1.0,
            company_logo_url: colors.company_logo_url,
            company_logo_scale: colors.company_logo_scale ?? 1.0,
            font_family: colors.font_family ?? 'Inter',
          });

          if (insertError) throw insertError;
        } else if (updateError) {
          throw updateError;
        }
      } catch (err) {
        console.error('Erro ao salvar cores do usuário:', err);
        throw err;
      }
    },
    [resolvedTheme]
  );

  const updateTheme = useCallback(
    async (newTheme: Partial<ThemeSettings>, asDefault = false, userId?: string) => {
      try {
        setLoading(true);
        let updatedTheme = { ...theme, ...newTheme };

        // Se apenas o theme_mode está sendo alterado, tentar aplicar cores customizadas do usuário
        if (newTheme.theme_mode && newTheme.theme_mode !== 'system' && !newTheme.colors && userId) {
          try {
            const userColors = await fetchUserThemeColors(userId);
            if (userColors) {
              // Aplicar cores customizadas ao novo modo
              const mode = newTheme.theme_mode;
              updatedTheme = {
                ...updatedTheme,
                colors: {
                  ...updatedTheme.colors,
                  [mode]: {
                    ...updatedTheme.colors[mode],
                    ...userColors,
                  },
                },
              };
            }
          } catch (err) {
            console.warn('Erro ao carregar cores do usuário para novo modo:', err);
          }
        }

        // Se for um usuário admin e estiver salvando cores específicas ou configurações de logo, salva no banco
        if (
          userId &&
          (newTheme.colors ||
            newTheme.logo_url ||
            newTheme.company_logo_url ||
            newTheme.logo_scale ||
            newTheme.company_logo_scale ||
            newTheme.font_family)
        ) {
          const themeMode = updatedTheme.theme_mode;
          const colors =
            newTheme.colors?.[themeMode as keyof typeof newTheme.colors] ||
            updatedTheme.colors[themeMode as keyof typeof updatedTheme.colors];

          // Incluir configurações de logo nas cores a serem salvas
          const colorsToSave: Partial<ThemeColors> = {
            ...(colors as Partial<ThemeColors>),
            logo_url: newTheme.logo_url || updatedTheme.logo_url,
            company_logo_url: newTheme.company_logo_url || updatedTheme.company_logo_url,
            logo_scale: newTheme.logo_scale || updatedTheme.logo_scale,
            company_logo_scale:
              newTheme.company_logo_scale ?? updatedTheme.company_logo_scale ?? 1.0,
            font_family: newTheme.font_family || updatedTheme.font_family,
          };

          if (colorsToSave) {
            await saveUserThemeColors(userId, colorsToSave);
          }
        }

        if (asDefault) {
          const { error: updateError } = await supabase.from('system_settings').upsert({
            key: 'theme',
            value: updatedTheme,
            updated_at: new Date().toISOString(),
          });

          if (updateError) throw updateError;
          setSystemTheme(updatedTheme);

          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('theme-preference');
          }
        } else {
          if (typeof window !== 'undefined') {
            const themeString = JSON.stringify(updatedTheme);
            window.localStorage.setItem('theme-preference', themeString);
          }
        }

        setTheme(updatedTheme);
        applyTheme(updatedTheme);
      } catch (err) {
        console.error('Erro ao atualizar tema:', err);
        setError(err instanceof Error ? err : new Error('Erro ao atualizar tema'));
      } finally {
        setLoading(false);
      }
    },
    [theme, applyTheme, saveUserThemeColors, fetchUserThemeColors]
  );

  useEffect(() => {
    async function initializeTheme() {
      try {
        setLoading(true);
        const systemTheme = await fetchTheme();
        setSystemTheme(systemTheme);

        let activeTheme = systemTheme;

        // Tentar carregar cores do usuário se estiver logado
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const userColors = await fetchUserThemeColors(user.id);
            if (userColors) {
              // Aplicar configurações do usuário sobre o tema padrão
              const themeMode =
                systemTheme.theme_mode === 'system' ? resolvedTheme : systemTheme.theme_mode;
              activeTheme = {
                ...systemTheme,
                logo_url: userColors.logo_url || systemTheme.logo_url,
                logo_scale: userColors.logo_scale || systemTheme.logo_scale,
                company_logo_url: userColors.company_logo_url || systemTheme.company_logo_url,
                font_family: userColors.font_family || systemTheme.font_family,
                colors: {
                  ...systemTheme.colors,
                  [themeMode]: {
                    ...systemTheme.colors[themeMode],
                    ...userColors,
                  },
                },
              };
            }
          }
        } catch (userError) {
          console.warn('Erro ao carregar configurações do usuário, usando tema padrão:', userError);
        }

        // Verificar se há preferências salvas no localStorage
        if (typeof window !== 'undefined') {
          try {
            const storedTheme = window.localStorage.getItem('theme-preference');
            if (storedTheme) {
              const parsedTheme = JSON.parse(storedTheme) as Partial<ThemeSettings>;
              if (parsedTheme && typeof parsedTheme === 'object') {
                activeTheme = { ...activeTheme, ...parsedTheme };
              }
            }
          } catch (err) {
            console.error('Erro ao parse do tema local:', err);
            window.localStorage.removeItem('theme-preference');
          }
        }

        setTheme(activeTheme);
        applyTheme(activeTheme);
      } catch (err) {
        console.error('Erro ao inicializar tema:', err);
        setError(err instanceof Error ? err : new Error('Erro ao inicializar tema'));
      } finally {
        setLoading(false);
      }
    }

    void initializeTheme();
  }, [applyTheme, fetchTheme, fetchUserThemeColors, resolvedTheme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: { matches: boolean }) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);

        if (theme.theme_mode === 'system') {
          applyTheme(theme);
        }
      };

      handleChange(query);
      query.addEventListener('change', handleChange);

      return () => query.removeEventListener('change', handleChange);
    }
  }, [theme, applyTheme]);

  const value = {
    theme,
    loading,
    error,
    resolvedTheme,
    systemTheme,
    updateTheme,
    resetToSystemTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
