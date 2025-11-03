'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ThemeSettings } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ThemeContextType {
  theme: ThemeSettings;
  loading: boolean;
  error: Error | null;
  resolvedTheme: 'light' | 'dark';
  systemTheme: ThemeSettings;
  updateTheme: (newTheme: Partial<ThemeSettings>, asDefault?: boolean) => Promise<void>;
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
      primary: '#2563eb',
      secondary: '#4f46e5',
      accent: '#f97316',
      background: '#ffffff',
      text: '#111827',
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#f97316',
      background: '#1a1a1a',
      text: '#f3f4f6',
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
      root.style.setProperty('--border-radius', themeToApply.border_radius);
      root.style.setProperty('--font-family', themeToApply.font_family);
      root.style.setProperty('--logo-scale', themeToApply.logo_scale.toString());
    },
    [resolvedTheme]
  );

  const fetchTheme = useCallback(async (): Promise<ThemeSettings> => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'theme')
        .single();

      if (error) {
        console.error('Erro ao buscar tema:', error);
        return defaultTheme;
      }

      const themeData = (data?.value as ThemeSettings) || defaultTheme;
      const requiredFields = Object.keys(defaultTheme);
      const missingFields = requiredFields.filter((field) => !(field in themeData));

      if (missingFields.length > 0) {
        console.warn('Campos ausentes no tema:', missingFields);
        return { ...defaultTheme, ...themeData };
      }

      return themeData;
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
      return defaultTheme;
    }
  }, []);

  const resetToSystemTheme = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('theme-preference');
      }
      setTheme(systemTheme);
      applyTheme(systemTheme);
    } catch (err) {
      console.error('Erro ao resetar tema:', err);
      setError(err instanceof Error ? err : new Error('Erro ao resetar tema'));
    }
  }, [systemTheme, applyTheme]);

  const updateTheme = useCallback(
    async (newTheme: Partial<ThemeSettings>, asDefault = false) => {
      try {
        setLoading(true);
        const updatedTheme = { ...theme, ...newTheme };

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
    [theme, applyTheme]
  );

  useEffect(() => {
    async function initializeTheme() {
      try {
        setLoading(true);
        const systemTheme = await fetchTheme();
        setSystemTheme(systemTheme);

        let activeTheme = systemTheme;
        if (typeof window !== 'undefined') {
          try {
            const storedTheme = window.localStorage.getItem('theme-preference');
            if (storedTheme) {
              const parsedTheme = JSON.parse(storedTheme) as Partial<ThemeSettings>;
              // Validar que o tema tem todos os campos necessários
              if (parsedTheme && typeof parsedTheme === 'object') {
                activeTheme = { ...systemTheme, ...parsedTheme };
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
  }, [applyTheme, fetchTheme]);

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
