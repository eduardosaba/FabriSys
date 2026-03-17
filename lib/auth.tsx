'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import type { Profile, UserRole } from '@/types/profile';
export type { UserRole } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [authTimeout, setAuthTimeout] = useState(false);
  const AUTH_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_AUTH_TIMEOUT_MS) || 20000;

  // Ref para evitar chamadas duplicadas ao fetchProfile
  const fetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  // Função isolada para buscar o perfil nas tabelas corretas
  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    // Evitar chamadas duplicadas simultaneas
    if (fetchingProfile.current && lastFetchedUserId.current === userId) {
      console.log(`[AuthProvider] ⏭️ Pulando fetchProfile duplicado para ${userId}`);
      return;
    }

    fetchingProfile.current = true;
    lastFetchedUserId.current = userId;
    const startTime = performance.now();
    console.log(`[AuthProvider] 🔍 Iniciando fetchProfile (sequencial) para userId=${userId}`);

    try {
      // 1) Tentativa em colaboradores (funcionários) — se existir, usamos como base
      // mas NÃO retornamos imediatamente: tentamos mesclar campos extras (ex: avatar_url)
      let baseProfile: Profile | null = null;
      try {
        const { data: colab, error: colabErr } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (colabErr) console.warn('[AuthProvider] ⚠️ colaboradores query erro:', colabErr);
        if (colab) {
          console.log('[AuthProvider] ✅ Perfil vindo de colaboradores (base)', {
            id: colab.id,
            role: colab.role,
          });
          baseProfile = colab as Profile;
          // não retorna — vamos tentar mesclar com `profiles` para buscar avatar_url/nomes adicionais
        }
      } catch (e) {
        console.warn('[AuthProvider] ⚠️ Falha ao consultar colaboradores:', e);
      }

      // 2) Tentativa em profiles (clientes/administradores) — se existir, mesclar com base
      try {
        // Buscar profile incluindo relacionamento com organizations
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select(`*, organizations(id, nome, logo_url)`)
          .eq('id', userId)
          .maybeSingle();

        if (profErr) {
          // Se a query com relacionamento falhar (PostgREST 400), tentamos um fallback simples
          console.warn('[AuthProvider] ⚠️ profiles query erro (relacionamento):', profErr);
          try {
            const { data: profSimple, error: profSimpleErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            if (profSimpleErr) {
              console.warn('[AuthProvider] ⚠️ fallback profiles query erro:', profSimpleErr);
            }

            if (profSimple) {
              // tentar buscar organização manualmente se existir organization_id
              let org = undefined;
              try {
                if (profSimple.organization_id) {
                  const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id,nome,logo_url')
                    .eq('id', profSimple.organization_id)
                    .maybeSingle();
                  org = orgData;
                }
              } catch (orgErr) {
                void orgErr;
              }

              const profileData = {
                id: profSimple.id,
                role: (profSimple.role as UserRole) || (baseProfile?.role as UserRole) || 'user',
                nome:
                  profSimple.nome ||
                  profSimple.full_name ||
                  profSimple.username ||
                  baseProfile?.nome ||
                  userEmail?.split('@')[0],
                full_name:
                  profSimple.full_name ||
                  profSimple.username ||
                  baseProfile?.full_name ||
                  undefined,
                email: userEmail ?? baseProfile?.email,
                avatar_url:
                  profSimple.avatar_url ?? profSimple.foto_url ?? baseProfile?.avatar_url ?? null,
                organization_id:
                  profSimple.organization_id ?? baseProfile?.organization_id ?? undefined,
                organizations: org ?? undefined,
                company_logo_url:
                  (org && (org as any).logo_url) ??
                  profSimple.company_logo_url ??
                  baseProfile?.company_logo_url ??
                  undefined,
                ativo: profSimple.ativo ?? baseProfile?.ativo ?? undefined,
                status_conta: profSimple.status_conta ?? baseProfile?.status_conta ?? undefined,
              } as Profile & { organizations?: any };
              console.log(
                '[AuthProvider] ✅ Perfil vindo de profiles (fallback simples)',
                profileData
              );
              setProfile(profileData as any);
              return;
            }
          } catch (fallbackErr) {
            console.warn('[AuthProvider] ⚠️ Falha no fallback profiles query:', fallbackErr);
          }
        }

        if (prof) {
          // organizations pode vir como objeto ou array dependendo do relacionamento
          const orgRaw: any = prof.organizations;
          const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

          const profileData = {
            id: prof.id,
            role: (prof.role as UserRole) || (baseProfile?.role as UserRole) || 'user',
            nome:
              prof.nome ||
              prof.full_name ||
              prof.username ||
              baseProfile?.nome ||
              userEmail?.split('@')[0],
            full_name: prof.full_name || prof.username || baseProfile?.full_name || undefined,
            email: userEmail ?? baseProfile?.email,
            avatar_url: prof.avatar_url ?? prof.foto_url ?? baseProfile?.avatar_url ?? null,
            organization_id: prof.organization_id ?? baseProfile?.organization_id ?? undefined,
            organizations: org ?? undefined,
            // Prioriza logo da organização quando disponível
            company_logo_url:
              (org && org.logo_url) ??
              prof.company_logo_url ??
              baseProfile?.company_logo_url ??
              undefined,
            ativo: prof.ativo ?? baseProfile?.ativo ?? undefined,
            status_conta: prof.status_conta ?? baseProfile?.status_conta ?? undefined,
          } as Profile & { organizations?: any };
          console.log('[AuthProvider] ✅ Perfil vindo de profiles (mesclado)', profileData);
          setProfile(profileData as any);
          return;
        }
      } catch (e) {
        console.warn('[AuthProvider] ⚠️ Falha ao consultar profiles:', e);
      }

      // Se não existiu registro em `profiles` mas `baseProfile` foi encontrado, usa ele
      if (baseProfile) {
        console.log('[AuthProvider] ✅ Usando perfil base de colaboradores (sem profiles)');
        setProfile(baseProfile);
        return;
      }

      // 3) Fallback: perfil mínimo para não travar a app
      console.warn(
        '[AuthProvider] ⚠️ Perfil não encontrado em colaboradores/profiles — aplicando fallback'
      );
      setProfile({ id: userId, role: 'user', email: userEmail } as Profile);
    } catch (error) {
      console.error('[AuthProvider] ❌ Erro crítico no fetchProfile:', error);
      setProfile({ id: userId, role: 'user', email: userEmail } as Profile);
    } finally {
      fetchingProfile.current = false;
      setLoading(false);
      const totalDuration = performance.now() - startTime;
      console.log(`[AuthProvider] fetchProfile finalizado em ${totalDuration.toFixed(2)}ms`);
    }
  }, []);

  useEffect(() => {
    // Timeout de segurança: evita loading infinito se houver problemas de rede
    // Se o profile não carregar dentro de `AUTH_TIMEOUT_MS`, marca timeout e avisa o usuário.
    const timeoutOccurred = { value: false } as { value: boolean };
    const _timeout = setTimeout(() => {
      timeoutOccurred.value = true;
      setAuthTimeout(true);
      setLoading(false);
      console.warn(
        `⚠️ Auth: Timeout de ${AUTH_TIMEOUT_MS}ms atingido. O carregamento do perfil pode continuar em segundo plano; algumas informações podem demorar a aparecer.`
      );
      try {
        toast({
          title: 'Atenção: demora no login',
          description:
            'O carregamento do perfil está demorando. Algumas informações podem aparecer em seguida.',
          variant: 'warning',
          duration: 8000,
        });
      } catch (e) {
        void e;
      }
    }, AUTH_TIMEOUT_MS);

    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          // tenta buscar o perfil, mas fetchProfile agora é seguro e sempre resolve
          void fetchProfile(initialSession.user.id, initialSession.user.email);
        }
      } catch (error) {
        console.error('Erro na sessão inicial:', error);
      } finally {
        clearTimeout(_timeout);
        if (timeoutOccurred.value) {
          console.log(
            '[AuthProvider] fetchProfile pode ter finalizado após o timeout; perfil pode ter sido carregado posteriormente.'
          );
        }
        setLoading(false);
      }
    };

    void getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AuthProvider] 🔔 Auth state changed: ${event}`);

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Tratamento específico quando o refresh do token falha (ex: token inválido)
      if (String(event) === 'TOKEN_REFRESH_FAILED') {
        console.warn('[AuthProvider] ❌ TOKEN_REFRESH_FAILED recebido — encerrando sessão local.');
        // Exibir toast informando expiração
        try {
          toast({
            title: 'Sessão expirada',
            description: 'Sua sessão expirou. Faça login novamente.',
            variant: 'error',
            duration: 6000,
          });
        } catch (e) {
          void e;
        }

        // Tentar sign out para limpar cookies via SDK
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('[AuthProvider] Erro ao signOut após TOKEN_REFRESH_FAILED:', e);
        }

        // Limpar possíveis tokens remanescentes no storage — pode resolver casos de refresh inválido
        try {
          // Remover chaves que possivelmente contenham tokens do Supabase
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (/supabase|sb|sb-/.test(key.toLowerCase())) localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn('[AuthProvider] Falha ao limpar localStorage:', e);
        }

        try {
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (!key) continue;
            if (/supabase|sb|sb-/.test(key.toLowerCase())) sessionStorage.removeItem(key);
          }
        } catch (e) {
          console.warn('[AuthProvider] Falha ao limpar sessionStorage:', e);
        }

        setProfile(null);
        lastFetchedUserId.current = null;
        fetchingProfile.current = false;
        setLoading(false);
        try {
          router.push('/login');
        } catch (e) {
          void e;
        }
        return;
      }

      if (currentSession?.user) {
        // Busca profile apenas se o usuário mudou
        if (lastFetchedUserId.current !== currentSession.user.id) {
          await fetchProfile(currentSession.user.id, currentSession.user.email);
        }
      } else {
        setProfile(null);
        lastFetchedUserId.current = null;
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(_timeout);
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    lastFetchedUserId.current = null;
    fetchingProfile.current = false;
    router.push('/');
  };

  const updateProfile = async () => {
    if (user) {
      lastFetchedUserId.current = null; // Força refetch
      await fetchProfile(user.id, user.email);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
