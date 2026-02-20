'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  // Atualiza variáveis CSS de preview em tempo real (não persiste no banco)
  setPreviewVars?: (partial: Partial<ThemeSettings>) => void;
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
      text: '#111827',
      accent: '#88544c',
      background: '#f5e4e2', // Pêssego Claro - Fundo Geral
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
      // Propriedades do sidebar (valores padrão para manter compatibilidade com ThemeColors)
      sidebar_bg: '#4a2c2b',
      sidebar_hover_bg: '#88544c',
      sidebar_text: '#f2e8e3',
      sidebar_active_text: '#e9c4c2',
      // Fundo do cabeçalho (modo escuro)
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
      sidebar_bg: '#111827',
      sidebar_hover_bg: '#4a2c2b',
      sidebar_text: '#f2e8e3',
      sidebar_active_text: '#e9c4c2',
      header_bg: '#4a2c2b',
      footer_bg: '#111827',
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
      // Preferir cores específicas do modo (light/dark) quando disponíveis,
      // caso contrário usar valores top-level como fallback.
      root.style.setProperty(
        '--sidebar-bg',
        (colors as Partial<ThemeColors>).sidebar_bg ||
          themeToApply.sidebar_bg ||
          colors.secondary ||
          '#e9c4c2'
      );
      root.style.setProperty(
        '--sidebar-hover-bg',
        (colors as Partial<ThemeColors>).sidebar_hover_bg ||
          themeToApply.sidebar_hover_bg ||
          '#88544c'
      );
      root.style.setProperty(
        '--header-bg',
        (colors as Partial<ThemeColors>).header_bg ||
          themeToApply.header_bg ||
          colors.secondary ||
          '#e9c4c2'
      );
      // Footer background: por padrão usar a cor secundária para consistência
      root.style.setProperty(
        '--footer-bg',
        (colors as Partial<ThemeColors>).footer_bg ||
          themeToApply.footer_bg ||
          colors.secondary ||
          '#e9c4c2'
      );
      root.style.setProperty(
        '--sidebar-text',
        (colors as Partial<ThemeColors>).sidebar_text || themeToApply.sidebar_text || '#4a2c2b'
      );
      root.style.setProperty(
        '--sidebar-active-text',
        (colors as Partial<ThemeColors>).sidebar_active_text ||
          themeToApply.sidebar_active_text ||
          '#88544c'
      );
    },
    [resolvedTheme]
  );

  // Atualiza variáveis CSS para preview em tempo real sem alterar o estado salvo
  const setPreviewVars = useCallback((partial: Partial<ThemeSettings>) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (partial.logo_scale !== undefined) {
      root.style.setProperty('--logo-scale', String(partial.logo_scale));
    }
    if (partial.company_logo_scale !== undefined) {
      root.style.setProperty('--company-logo-scale', String(partial.company_logo_scale));
    }
    // Caso queira também visualizar troca de logo em tempo real, o componente
    // de configurações pode chamar updateTheme com preview=false ou setTheme localmente.
  }, []);

  const resetToSystemTheme = useCallback(() => {
    setTheme(systemTheme);
    applyTheme(systemTheme);
  }, [systemTheme, applyTheme]);

  const fetchTheme = useCallback((): Promise<ThemeSettings> => {
    // Por enquanto, retorna o tema padrão
    // Futuramente pode buscar do banco de dados se houver configurações globais
    return Promise.resolve(defaultTheme);
  }, []);

  const fetchScopedThemeColors = useCallback(
    async (options: {
      userId?: string;
      organizationId?: string;
    }): Promise<Partial<ThemeColors> | null> => {
      try {
        // Primeiro tenta buscar tema vinculado à organização (maior prioridade)
        if (options.organizationId) {
          const { data: orgData, error: orgErr } = await supabase
            .from('user_theme_colors')
            .select(
              'primary_color, titulo_paginas_color, logo_url, logo_scale, company_logo_url, company_logo_scale, font_family, sidebar_bg, sidebar_hover_bg, sidebar_text, sidebar_active_text'
            )
            .eq('organization_id', options.organizationId)
            .eq('theme_mode', resolvedTheme)
            .maybeSingle();

          if (orgErr) {
            console.error('Erro ao buscar cores da organização:', orgErr);
          } else if (orgData) {
            return {
              primary: orgData.primary_color as string,
              tituloPaginas: orgData.titulo_paginas_color as string,
              logo_url: orgData.logo_url as string,
              logo_scale: orgData.logo_scale as number,
              company_logo_url: orgData.company_logo_url as string,
              company_logo_scale: orgData.company_logo_scale as number,
              font_family: orgData.font_family as string,
              sidebar_bg: orgData.sidebar_bg as string,
              sidebar_hover_bg: orgData.sidebar_hover_bg as string,
              sidebar_text: orgData.sidebar_text as string,
              sidebar_active_text: orgData.sidebar_active_text as string,
            };
          }
        }

        // Se não encontrou por organização, tenta por usuário
        if (options.userId) {
          const { data, error } = await supabase
            .from('user_theme_colors')
            .select(
              'primary_color, titulo_paginas_color, logo_url, logo_scale, company_logo_url, company_logo_scale, font_family, sidebar_bg, sidebar_hover_bg, sidebar_text, sidebar_active_text'
            )
            .eq('user_id', options.userId)
            .eq('theme_mode', resolvedTheme)
            .maybeSingle();

          if (error) {
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
              sidebar_bg: data.sidebar_bg as string,
              sidebar_hover_bg: data.sidebar_hover_bg as string,
              sidebar_text: data.sidebar_text as string,
              sidebar_active_text: data.sidebar_active_text as string,
            };
          }
        }

        return null;
      } catch (err) {
        console.error('Erro ao carregar cores do usuário/organização:', err);
        return null;
      }
    },
    [resolvedTheme]
  );

  const fetchSystemSettings = useCallback(async (organizationId?: string) => {
    try {
      if (!organizationId) {
        const { data: sessionData } = await supabase.auth.getUser();
        const user = (sessionData as any)?.user;
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();
          organizationId = (profileData as any)?.organization_id;
        }
      }

      // Try organization-specific first
      if (organizationId) {
        const { data: sysRow } = await supabase
          .from('configuracoes_sistema')
          .select(
            'logo_url, company_logo_url, company_name, nome_empresa, theme, theme_mode, primary_color, colors_json, features'
          )
          .eq('chave', 'system_settings')
          .eq('organization_id', organizationId)
          .limit(1)
          .maybeSingle();
        if (sysRow) return sysRow as any;
      }

      // Fallback to global
      const { data: globalRow } = await supabase
        .from('configuracoes_sistema')
        .select(
          'logo_url, company_logo_url, company_name, nome_empresa, theme, theme_mode, primary_color, colors_json, features'
        )
        .eq('chave', 'system_settings')
        .is('organization_id', null)
        .limit(1)
        .maybeSingle();
      return (globalRow as any) || null;
    } catch (err) {
      console.error('Erro ao buscar system_settings:', err);
      return null;
    }
  }, []);

  const saveScopedThemeColors = useCallback(
    async (options: { userId?: string; organizationId?: string }, colors: Partial<ThemeColors>) => {
      try {
        // Proteção: evite tentar upserts quando não houver um usuário autenticado.
        // Chamadas anônimas chegarão ao Postgres sem auth.uid() e serão bloqueadas por RLS.
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            console.warn('saveScopedThemeColors abortado: usuário não autenticado');
            throw new Error('Usuário não autenticado');
          }

          // Se estamos gravando por organização, confirme que o usuário pertence a ela
          if (options.organizationId) {
            const { data: profileData, error: profErr } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .maybeSingle();
            if (profErr) {
              console.warn('Não foi possível verificar organization_id do perfil:', profErr);
              throw new Error('Erro ao validar organização do usuário');
            }
            const userOrg = (profileData as any)?.organization_id;
            if (!userOrg || String(userOrg) !== String(options.organizationId)) {
              console.warn('Usuário não pertence à organization_id fornecida — abortando upsert.');
              throw new Error('Usuário não autorizado para essa organização');
            }
          }
        } catch (authErr) {
          // Propaga para o caller tratar — evita que façamos requests anônimos
          console.error('saveScopedThemeColors: abortando por falta de autenticação', authErr);
          throw authErr;
        }

        // Preparar payload comum
        const payloadBase: any = {
          theme_mode: resolvedTheme,
          primary_color: colors.primary ?? '#4A2C2B',
          titulo_paginas_color: colors.tituloPaginas ?? '#ffffff',
          logo_url: colors.logo_url ?? '/logo.png',
          logo_scale: colors.logo_scale ?? 1.0,
          company_logo_url: colors.company_logo_url,
          company_logo_scale: colors.company_logo_scale ?? 1.0,
          font_family: colors.font_family ?? 'Inter',
          sidebar_bg: colors.sidebar_bg ?? colors.secondary ?? '#e8e8e8',
          sidebar_hover_bg: colors.sidebar_hover_bg ?? '#88544c',
          sidebar_text: colors.sidebar_text ?? '#4a2c2b',
          sidebar_active_text: colors.sidebar_active_text ?? '#88544c',
          updated_at: new Date().toISOString(),
          // Persistir JSON completo com as cores/customizações para garantir
          // que todas as chaves personalizadas sejam salvas mesmo que não haja
          // colunas específicas para cada uma.
          colors_json: JSON.stringify({
            theme_mode: resolvedTheme,
            colors: colors || {},
            logo_url: colors.logo_url ?? null,
            logo_scale: colors.logo_scale ?? null,
            company_logo_url: colors.company_logo_url ?? null,
            company_logo_scale: colors.company_logo_scale ?? null,
            font_family: colors.font_family ?? null,
          }),
        };

        if (options.organizationId) {
          const payload = { ...payloadBase, organization_id: options.organizationId };
          try {
            const { error } = await supabase
              .from('user_theme_colors')
              .upsert(payload, { onConflict: 'organization_id,theme_mode' });
            if (error) throw error;
            return;
          } catch (upsertErr: any) {
            const msg = String(upsertErr?.message || upsertErr);
            // Fallback manual: se o ON CONFLICT não for suportado por falta de índice,
            // tentar select -> update ou insert para garantir persistência.
            if (msg.includes('no unique') || msg.includes('ON CONFLICT')) {
              const { data: existing, error: selErr } = await supabase
                .from('user_theme_colors')
                .select('*')
                .eq('organization_id', options.organizationId)
                .eq('theme_mode', payload.theme_mode)
                .maybeSingle();
              if (selErr) throw selErr;
              if (existing) {
                const { error: updErr } = await supabase
                  .from('user_theme_colors')
                  .update(payload)
                  .eq('id', existing.id);
                if (updErr) throw updErr;
                return;
              }
              const { error: insErr } = await supabase.from('user_theme_colors').insert(payload);
              if (insErr) throw insErr;
              return;
            }
            throw upsertErr;
          }
        }

        if (options.userId) {
          const payload = { ...payloadBase, user_id: options.userId };
          try {
            const { error } = await supabase.from('user_theme_colors').upsert(payload, {
              onConflict: 'user_id,theme_mode',
            });
            if (error) throw error;
            return;
          } catch (upsertErr: any) {
            const msg = String(upsertErr?.message || upsertErr);
            if (msg.includes('no unique') || msg.includes('ON CONFLICT')) {
              const { data: existing, error: selErr } = await supabase
                .from('user_theme_colors')
                .select('*')
                .eq('user_id', options.userId)
                .eq('theme_mode', payload.theme_mode)
                .maybeSingle();
              if (selErr) throw selErr;
              if (existing) {
                const { error: updErr } = await supabase
                  .from('user_theme_colors')
                  .update(payload)
                  .eq('id', existing.id);
                if (updErr) throw updErr;
                return;
              }
              const { error: insErr } = await supabase.from('user_theme_colors').insert(payload);
              if (insErr) throw insErr;
              return;
            }
            throw upsertErr;
          }
        }

        // Se não houver escopo fornecido, simplesmente retorna sem persistir
        console.warn('Nenhum userId ou organizationId informado para salvar cores.');
      } catch (err) {
        console.error('Erro ao salvar cores do usuário/organização:', err);
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

        // Se a atualização inclui alteração da cor `secondary` para o modo ativo,
        // e não especifica `sidebar_bg`/`header_bg`, propagar `secondary` para esses campos.
        try {
          type Mode = 'light' | 'dark';
          let mode: Mode = 'light';
          const modeCandidate = newTheme.theme_mode ?? updatedTheme.theme_mode;
          if (modeCandidate === 'light' || modeCandidate === 'dark') mode = modeCandidate;

          const incomingColorsMap = newTheme.colors as
            | Partial<Record<Mode, Partial<ThemeColors>>>
            | undefined;
          const incomingModeColors = incomingColorsMap ? incomingColorsMap[mode] : undefined;
          const incomingHasSecondary = !!(incomingModeColors && incomingModeColors.secondary);

          if (incomingHasSecondary) {
            const newSecondary = String(incomingModeColors.secondary);

            const incomingHasSidebarBg =
              !!(incomingModeColors && 'sidebar_bg' in incomingModeColors) ||
              'sidebar_bg' in newTheme;
            const incomingHasHeaderBg =
              !!(incomingModeColors && 'header_bg' in incomingModeColors) ||
              'header_bg' in newTheme;

            if (!incomingHasSidebarBg || !incomingHasHeaderBg) {
              const prevColorsForMode = (updatedTheme.colors && updatedTheme.colors[mode]) || {};
              const merged: Partial<ThemeColors> = {
                ...prevColorsForMode,
                ...(incomingModeColors || {}),
              };

              if (!incomingHasSidebarBg) merged.sidebar_bg = newSecondary;
              if (!incomingHasHeaderBg) merged.header_bg = newSecondary;

              updatedTheme = {
                ...updatedTheme,
                colors: {
                  ...(updatedTheme.colors || {}),
                  [mode]: merged as ThemeColors,
                },
              };

              // Também ajustar top-level campos se o caller não forneceu
              if (!('sidebar_bg' in newTheme)) updatedTheme.sidebar_bg = newSecondary;
              if (!('header_bg' in newTheme)) updatedTheme.header_bg = newSecondary;
            }
          }
        } catch (propErr: unknown) {
          // Não bloquear a atualização por erro nesta lógica
          console.warn('Erro ao propagar secondary para sidebar/header:', propErr);
        }

        // Se apenas o theme_mode está sendo alterado, tentar aplicar cores customizadas do usuário
        if (newTheme.theme_mode && newTheme.theme_mode !== 'system' && !newTheme.colors && userId) {
          try {
            const userColors = await fetchScopedThemeColors({ userId });
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
          (userId || undefined) &&
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

          const colorsToSave: Partial<ThemeColors> = {
            ...(colors as Partial<ThemeColors>),
            logo_url: newTheme.logo_url || updatedTheme.logo_url,
            company_logo_url: newTheme.company_logo_url || updatedTheme.company_logo_url,
            logo_scale: newTheme.logo_scale || updatedTheme.logo_scale,
            company_logo_scale:
              newTheme.company_logo_scale ?? updatedTheme.company_logo_scale ?? 1.0,
            font_family: newTheme.font_family || updatedTheme.font_family,
            sidebar_bg: newTheme.sidebar_bg || updatedTheme.sidebar_bg,
            sidebar_hover_bg: newTheme.sidebar_hover_bg || updatedTheme.sidebar_hover_bg,
            sidebar_text: newTheme.sidebar_text || updatedTheme.sidebar_text,
            sidebar_active_text: newTheme.sidebar_active_text || updatedTheme.sidebar_active_text,
          };

          // Tentar resolver escopo: organization primeiro, senão user
          let resolvedOrgId: string | undefined;
          let resolvedUserId: string | undefined = userId;

          if (!resolvedUserId) {
            try {
              const { data: sessionData } = await supabase.auth.getUser();
              const user = (sessionData as any)?.user;
              if (user) resolvedUserId = user.id;
            } catch (e) {
              // ignore
            }
          }

          if (resolvedUserId) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', resolvedUserId)
                .maybeSingle();
              resolvedOrgId = (profileData as any)?.organization_id;
            } catch (e) {
              // ignore
            }
          }

          if (resolvedOrgId) {
            await saveScopedThemeColors({ organizationId: resolvedOrgId }, colorsToSave);
            // Além de salvar em `user_theme_colors`, também gravar/atualizar a linha consolidada
            try {
              const themeModeForPrimary: 'light' | 'dark' =
                updatedTheme.theme_mode === 'system'
                  ? resolvedTheme
                  : ((updatedTheme.theme_mode as any) ?? 'light');

              const rpcPayload = {
                p_organization_id: resolvedOrgId,
                p_chave: 'system_settings',
                p_valor: {
                  logo_url: colorsToSave.logo_url,
                  company_logo_url: colorsToSave.company_logo_url,
                  company_name: updatedTheme.footer_company_name,
                  theme: { mode: updatedTheme.theme_mode, colors: colorsToSave },
                  theme_mode: updatedTheme.theme_mode,
                  primary_color:
                    colorsToSave.primary ?? updatedTheme.colors?.[themeModeForPrimary]?.primary,
                  colors_json: colorsToSave,
                },
              } as any;
              const { error } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
              if (error) console.warn('RPC system_settings warning:', error.message || error);
            } catch (e) {
              console.warn('Erro ao gravar system_settings via RPC:', e);
            }
          } else if (resolvedUserId) {
            await saveScopedThemeColors({ userId: resolvedUserId }, colorsToSave);
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
        const msg = err instanceof Error ? err.message : String(err ?? 'Erro ao atualizar tema');
        // Mensagem amigável para o usuário (erros de autenticação/autorizaÃ§Ã£o sÃ£o tratadas aqui)
        if (msg.includes('Usuário') || msg.includes('autorizad')) {
          toast.error(msg);
        } else {
          toast.error('Erro ao atualizar tema. Tente novamente.');
        }
        setError(err instanceof Error ? err : new Error('Erro ao atualizar tema'));
      } finally {
        setLoading(false);
      }
    },
    [theme, applyTheme, saveScopedThemeColors, fetchScopedThemeColors]
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
            const userColors = await fetchScopedThemeColors({ userId: user.id });
            if (userColors) {
              const themeMode: 'light' | 'dark' =
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
                    ...((systemTheme.colors as any)[themeMode] || {}),
                    ...userColors,
                  },
                },
              };
            }

            // Também tentar carregar `system_settings` por organização e mesclar
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .maybeSingle();
              const orgId = (profileData as any)?.organization_id;
              const sys = await fetchSystemSettings(orgId);
              if (sys) {
                let themeMode: 'light' | 'dark' = activeTheme.theme_mode as 'light' | 'dark';
                if (sys.theme_mode) {
                  themeMode =
                    sys.theme_mode === 'system'
                      ? resolvedTheme
                      : (sys.theme_mode as 'light' | 'dark');
                }
                const sysColors = sys.colors_json || sys.theme || {};
                activeTheme = {
                  ...activeTheme,
                  logo_url: sys.logo_url || activeTheme.logo_url,
                  company_logo_url: sys.company_logo_url || activeTheme.company_logo_url,
                  footer_company_name: sys.company_name || activeTheme.footer_company_name,
                  font_family: sys.font_family || activeTheme.font_family,
                  theme_mode: themeMode,
                  colors: {
                    ...activeTheme.colors,
                    [themeMode]: {
                      ...((activeTheme.colors as any)[themeMode] || {}),
                      ...(sysColors || {}),
                    },
                  },
                };
              }
            } catch (e) {
              // non-blocking
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
  }, [applyTheme, fetchTheme, fetchScopedThemeColors, resolvedTheme]);

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
    setPreviewVars,
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
