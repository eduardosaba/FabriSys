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
  name: 'Sistema Lari',
  logo_url: '/logo.png',
  logo_scale: 1.0,
  font_family: 'Inter',
  border_radius: '0.5rem',
  theme_mode: 'light' as const,
  density: 'comfortable' as const,
  colors: {
    light: {
      primary: '#4CAF50', // rgb(76, 175, 80)
      secondary: '#4f46e5',
      accent: '#f97316',
      background: '#ffffff',
      text: '#ffffff', // rgb(255, 255, 255)
      tituloPaginas: '#ffffff',
      hover3Submenu: '#2E7D32', // rgb(46, 125, 50)
      textoGeralHover: '#388E3C', // rgb(56, 142, 60)
      bordasHeaderPerfil: '#A5D6A7', // rgb(165, 214, 167)
      bordasSelecaoListagens: '#C8E6C9', // rgb(200, 230, 201)
      barraDashboard: '#04A9DA', // rgb(4, 169, 218)
      barraDashboardHover: '#04A9DA',
      receitasGraficos: '#388E3C',
      receitasGraficosSecundaria: '#81C784', // rgb(129, 199, 132)
      despesasGraficos: '#D32F2F', // rgb(211, 47, 47)
      despesasGraficosSecundaria: '#E57373', // rgb(229, 115, 115)
      barraRolagem: '#4CAF50',
      barraRolagemFundo: '#C8E6C9',
      fundoLinkEAD: '#66BB6A', // rgb(102, 187, 106)
      textoLinkEAD: '#388E3C',
      botaoSalvar: '#27AE60', // rgb(39, 174, 96)
      botaoSalvarAtivo: '#219A52', // rgb(33, 154, 82)
      botaoSalvarDesabilitado: '#7F8C8D', // rgb(127, 140, 141)
      botaoCancelar: '#E74C3C', // rgb(231, 76, 60)
      botaoCancelarAtivo: '#C0392B', // rgb(192, 57, 43)
      botaoCancelarDesabilitado: '#95A5A6', // rgb(149, 165, 166)
      botaoPesquisar: '#3498DB', // rgb(52, 152, 219)
      botaoPesquisarAtivo: '#2980B9', // rgb(41, 128, 185)
      botaoPesquisarDesabilitado: '#BDC3C7', // rgb(189, 195, 199)
      camposObrigatorios: '#F1C40F', // rgb(241, 196, 15)
      camposNaoObrigatorios: '#ECF0F1', // rgb(236, 240, 241)
      barraSuperiorMenu: '#2ECC71', // rgb(46, 204, 113)
      textoIconeAjuda: '#34495E', // rgb(52, 73, 94)
      iconeAjuda: '#2ECC71',
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#f97316',
      background: '#1a1a1a',
      text: '#f3f4f6',
      tituloPaginas: '#f3f4f6',
      hover3Submenu: '#2E7D32',
      textoGeralHover: '#388E3C',
      bordasHeaderPerfil: '#A5D6A7',
      bordasSelecaoListagens: '#C8E6C9',
      barraDashboard: '#04A9DA',
      barraDashboardHover: '#04A9DA',
      receitasGraficos: '#388E3C',
      receitasGraficosSecundaria: '#81C784',
      despesasGraficos: '#D32F2F',
      despesasGraficosSecundaria: '#E57373',
      barraRolagem: '#4CAF50',
      barraRolagemFundo: '#C8E6C9',
      fundoLinkEAD: '#66BB6A',
      textoLinkEAD: '#388E3C',
      botaoSalvar: '#27AE60',
      botaoSalvarAtivo: '#219A52',
      botaoSalvarDesabilitado: '#7F8C8D',
      botaoCancelar: '#E74C3C',
      botaoCancelarAtivo: '#C0392B',
      botaoCancelarDesabilitado: '#95A5A6',
      botaoPesquisar: '#3498DB',
      botaoPesquisarAtivo: '#2980B9',
      botaoPesquisarDesabilitado: '#BDC3C7',
      camposObrigatorios: '#F1C40F',
      camposNaoObrigatorios: '#ECF0F1',
      barraSuperiorMenu: '#2ECC71',
      textoIconeAjuda: '#34495E',
      iconeAjuda: '#2ECC71',
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
      root.style.setProperty('--font-family', themeToApply.font_family);
      root.style.setProperty('--logo-scale', themeToApply.logo_scale.toString());
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
          .select('primary_color, titulo_paginas_color, logo_url, logo_scale')
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
            primary_color: colors.primary ?? '#4CAF50',
            titulo_paginas_color: colors.tituloPaginas ?? '#ffffff',
            logo_url: colors.logo_url ?? '/logo.png',
            logo_scale: colors.logo_scale ?? 1.0,
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
            primary_color: colors.primary ?? '#4CAF50',
            titulo_paginas_color: colors.tituloPaginas ?? '#ffffff',
            logo_url: colors.logo_url ?? '/logo.png',
            logo_scale: colors.logo_scale ?? 1.0,
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
        const updatedTheme = { ...theme, ...newTheme };

        // Se for um usuário admin e estiver salvando cores específicas, salva no banco
        if (userId && newTheme.colors) {
          const themeMode = updatedTheme.theme_mode;
          const colors = newTheme.colors[themeMode as keyof typeof newTheme.colors];
          if (colors) {
            await saveUserThemeColors(userId, colors as Partial<ThemeColors>);
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
    [theme, applyTheme, saveUserThemeColors]
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
              // Aplicar cores do usuário sobre o tema padrão
              const themeMode =
                systemTheme.theme_mode === 'system' ? resolvedTheme : systemTheme.theme_mode;
              activeTheme = {
                ...systemTheme,
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
          console.warn('Erro ao carregar cores do usuário, usando tema padrão:', userError);
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
