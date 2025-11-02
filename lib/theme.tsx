'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeSettings } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ThemeContextType {
  theme: ThemeSettings;
  loading: boolean;
  error: Error | null;
  updateTheme: (newTheme: Partial<ThemeSettings>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: ThemeSettings = {
  name: 'FabriSys',
  logo_url: '/logo.png',
  primary_color: '#2563eb',
  secondary_color: '#4f46e5',
  accent_color: '#f97316',
  background_color: '#ffffff',
  text_color: '#111827',
  font_family: 'Inter',
  border_radius: '0.5rem',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTheme();
  }, []);

  useEffect(() => {
    // Aplica as variáveis CSS do tema
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', theme.primary_color);
      root.style.setProperty('--secondary-color', theme.secondary_color);
      root.style.setProperty('--accent-color', theme.accent_color);
      root.style.setProperty('--background-color', theme.background_color);
      root.style.setProperty('--text-color', theme.text_color);
      root.style.setProperty('--font-family', theme.font_family);
      root.style.setProperty('--border-radius', theme.border_radius);
    }
  }, [theme]);

  async function fetchTheme() {
    try {
      setLoading(true);
      const response = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'theme')
        .single();

      if (response.error) {
        console.error('Erro na resposta do Supabase:', response.error);
        throw response.error;
      }
      
      if (response.data?.value) {
        const themeData = response.data.value as ThemeSettings;
        setTheme(themeData);
      } else {
        console.log('Usando tema padrão pois nenhum tema foi encontrado');
        setTheme(defaultTheme);
      }
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
      setError(err as Error);
      setTheme(defaultTheme); // Fallback para o tema padrão em caso de erro
    } finally {
      setLoading(false);
    }
  }

  async function updateTheme(newTheme: Partial<ThemeSettings>) {
    try {
      setLoading(true);
      const updatedTheme = { ...theme, ...newTheme };
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'theme',
          value: updatedTheme
        })
        .eq('key', 'theme');

      if (error) throw error;
      
      setTheme(updatedTheme);
    } catch (err) {
      console.error('Erro ao atualizar tema:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, loading, error, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}