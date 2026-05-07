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
import { setActiveLocal } from '@/lib/activeLocal';
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
  const PROFILE_CACHE_KEY = 'syslari_profile_v1';
  const PROFILE_CACHE_MS = Number(process.env.NEXT_PUBLIC_PROFILE_CACHE_MS) || 300000; // 5min

  const readProfileCache = () => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !parsed.profile) return null;
      if (Date.now() - parsed.ts > PROFILE_CACHE_MS) return null;
      return parsed.profile as Profile;
    } catch (e) {
      return null;
    }
  };

  const writeProfileCache = (p: Profile | null) => {
    try {
      if (typeof window === 'undefined') return;
      if (!p) return localStorage.removeItem(PROFILE_CACHE_KEY);
      // store only essential public fields to reduce payload and avoid sensitive data
      const cacheObj = {
        id: (p as any).id,
        role: (p as any).role,
        local_id: (p as any).local_id ?? null,
        organization_id: (p as any).organization_id ?? null,
        avatar_url: (p as any).avatar_url ?? null,
        company_logo_url: (p as any).company_logo_url ?? null,
      } as Profile;
      localStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), profile: cacheObj })
      );
    } catch (e) {
      void e;
    }
  };

  // Ref para evitar chamadas duplicadas ao fetchProfile
  const fetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  // Função isolada para buscar o perfil nas tabelas corretas
  const fetchProfile = useCallback(
    async (userId: string, userEmail?: string | null): Promise<void> => {
      // Evitar chamadas duplicadas simultaneas
      if (fetchingProfile.current && lastFetchedUserId.current === userId) {
        console.log(`[AuthProvider] ⏭️ Pulando fetchProfile duplicado para ${userId}`);
        return;
      }

      fetchingProfile.current = true;
      lastFetchedUserId.current = userId;
      const startTime = performance.now();
      console.log(`[AuthProvider] 🔍 Iniciando fetchProfile (sequencial) para userId=${userId}`);

      // tentar carregar perfil do cache para exibir imediatamente
      try {
        const cached = readProfileCache();
        if (cached && cached.id === userId) {
          setProfile(cached);
          setLoading(false);
        } else {
          // setar um perfil mínimo imediatamente para não bloquear a UI
          setProfile({ id: userId, role: 'user', email: userEmail ?? undefined });
          setLoading(false);
        }
      } catch (e) {
        try {
          setProfile({ id: userId, role: 'user', email: userEmail ?? undefined });
          setLoading(false);
        } catch (err) {
          void err;
        }
      }

      try {
        // Executar buscas em paralelo para reduzir latência percebida.
        let baseProfile: Profile | null = null;
        try {
          const colabQ: any = supabase
            .from('colaboradores')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          const profQ: any = supabase
            .from('profiles')
            .select(`*, organizations(id, nome, logo_url)`)
            .eq('id', userId)
            .maybeSingle();

          console.time('[AuthProvider] profile-queries');
          const [colabRes, profRes] = await Promise.allSettled([colabQ, profQ]);
          console.timeEnd('[AuthProvider] profile-queries');

          const colab: any = colabRes.status === 'fulfilled' ? colabRes.value.data : null;
          const colabErr: any = colabRes.status === 'rejected' ? colabRes.reason : null;
          if (colabErr) console.warn('[AuthProvider] ⚠️ colaboradores query erro:', colabErr);
          if (colab) baseProfile = colab as Profile;
          const profVal: any = profRes.status === 'fulfilled' ? profRes.value : null;
          if (profRes.status === 'rejected')
            console.warn('[AuthProvider] ⚠️ profiles query erro:', profRes.reason);

          // Se profiles retornou com dados, usamos como fonte primária
          if (profVal && profVal.data) {
            const prof: any = profVal.data;
            const orgRaw: any = prof.organizations;
            const org: any = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

            const profileData: any = {
              id: prof.id,
              role: (prof.role as UserRole) || baseProfile?.role || 'user',
              nome:
                prof.nome ||
                prof.full_name ||
                prof.username ||
                baseProfile?.nome ||
                userEmail?.split('@')[0],
              full_name: prof.full_name || prof.username || baseProfile?.full_name || undefined,
              email: userEmail ?? baseProfile?.email,
              avatar_url: prof.avatar_url ?? prof.foto_url ?? baseProfile?.avatar_url ?? null,
              local_id: prof.local_id ?? (baseProfile as any)?.local_id ?? undefined,
              organization_id: prof.organization_id ?? baseProfile?.organization_id ?? undefined,
              organizations: org ?? undefined,
              company_logo_url:
                (org && org.logo_url) ??
                prof.company_logo_url ??
                baseProfile?.company_logo_url ??
                undefined,
              ativo: prof.ativo ?? baseProfile?.ativo ?? undefined,
              status_conta: prof.status_conta ?? baseProfile?.status_conta ?? undefined,
            } as Profile & { organizations?: any };

            setProfile(profileData as Profile);
            try {
              writeProfileCache(profileData as Profile);
            } catch (e) {
              void e;
            }

            // resolver local/pdv em background se necessário
            (async () => {
              if (profileData.role === 'pdv' && !profileData.local_id) {
                try {
                  const caixaRes: any = await supabase
                    .from('caixa_sessao')
                    .select('local_id')
                    .eq('usuario_abertura', profileData.id)
                    .eq('status', 'aberto')
                    .maybeSingle();
                  const caixa: any = caixaRes?.data ?? null;
                  if (caixa && caixa.local_id) {
                    profileData.local_id = caixa.local_id;
                    try {
                      await setActiveLocal(caixa.local_id);
                    } catch (e) {
                      void e;
                    }
                    setProfile((p) => ({ ...(p as any), local_id: caixa.local_id }));
                    try {
                      writeProfileCache({ ...profileData });
                    } catch (e) {
                      void e;
                    }
                  } else {
                    try {
                      await setActiveLocal(null);
                    } catch (e) {
                      void e;
                    }
                  }
                } catch (e) {
                  void e;
                }
              }
            })();

            return;
          }

          // Se não temos profile mas há colaboradores, usamos baseProfile
          if (baseProfile) {
            console.log('[AuthProvider] ✅ Perfil vindo de colaboradores (base)', {
              id: baseProfile.id,
              role: baseProfile.role,
            });
            setProfile(baseProfile);
            try {
              writeProfileCache(baseProfile);
            } catch (e) {
              void e;
            }
            // tentar resolver local em background
            (async () => {
              if ((baseProfile as any).role === 'pdv' && !(baseProfile as any).local_id) {
                try {
                  const caixaRes: any = await supabase
                    .from('caixa_sessao')
                    .select('local_id')
                    .eq('usuario_abertura', baseProfile.id)
                    .eq('status', 'aberto')
                    .maybeSingle();
                  const caixa: any = caixaRes?.data ?? null;
                  if (caixa && caixa.local_id) {
                    try {
                      await setActiveLocal(caixa.local_id);
                    } catch (e) {
                      void e;
                    }
                    setProfile((p) => ({ ...(p as any), local_id: caixa.local_id }));
                    try {
                      writeProfileCache({ ...(baseProfile as any) });
                    } catch (e) {
                      void e;
                    }
                  } else {
                    try {
                      await setActiveLocal(null);
                    } catch (e) {
                      void e;
                    }
                  }
                } catch (e) {
                  void e;
                }
              }
            })();

            return;
          }
        } catch (e) {
          console.warn(
            '[AuthProvider] ⚠️ Falha ao consultar colaboradores/profiles em paralelo:',
            e
          );
        }

        // Se não existiu registro em `profiles` mas `baseProfile` foi encontrado, usa ele
        if (baseProfile) {
          console.log('[AuthProvider] ✅ Usando perfil base de colaboradores (sem profiles)');
          // resolve pdv local for baseProfile if missing
          if ((baseProfile as any).role === 'pdv' && !(baseProfile as any).local_id) {
            try {
              const { data: caixa } = await supabase
                .from('caixa_sessao')
                .select('local_id')
                .eq('usuario_abertura', baseProfile.id)
                .eq('status', 'aberto')
                .maybeSingle();
              if (caixa && caixa.local_id) {
                (baseProfile as any).local_id = caixa.local_id;
                await setActiveLocal(caixa.local_id);
              } else {
                await setActiveLocal(null);
              }
            } catch (e) {
              void e;
            }
          }
          if ((baseProfile as any).local_id) {
            try {
              await setActiveLocal((baseProfile as any).local_id);
            } catch (e) {
              void e;
            }
          }
          setProfile(baseProfile);
          return;
        }

        // 3) Fallback: perfil mínimo para não travar a app
        console.warn(
          '[AuthProvider] ⚠️ Perfil não encontrado em colaboradores/profiles — aplicando fallback'
        );
        const fallbackProfile = { id: userId, role: 'user', email: userEmail } as Profile;
        setProfile(fallbackProfile);
        try {
          writeProfileCache(fallbackProfile);
        } catch (e) {
          void e;
        }
      } catch (error) {
        console.error('[AuthProvider] ❌ Erro crítico no fetchProfile:', error);
        const fallbackProfile2 = { id: userId, role: 'user', email: userEmail } as Profile;
        setProfile(fallbackProfile2);
        try {
          writeProfileCache(fallbackProfile2);
        } catch (e) {
          void e;
        }
      } finally {
        fetchingProfile.current = false;
        setLoading(false);
        const totalDuration = performance.now() - startTime;
        console.log(`[AuthProvider] fetchProfile finalizado em ${totalDuration.toFixed(2)}ms`);
        try {
          if (totalDuration > 2000) {
            toast({
              title: 'Atenção: demora no carregamento',
              description: `Carregamento do perfil demorou ${Math.round(totalDuration)}ms.`,
              variant: 'warning',
              duration: 6000,
            });
          }
        } catch (e) {
          void e;
        }
      }
    },
    []
  );

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

        try {
          // Também limpar a unidade ativa persistida (pdv_active_local)
          setActiveLocal(null);
        } catch (e) {
          void e;
        }

        setProfile(null);
        try {
          writeProfileCache(null);
        } catch (e) {
          void e;
        }
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
        try {
          writeProfileCache(null);
        } catch (e) {
          void e;
        }
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
    try {
      // limpar unidade ativa ao deslogar para evitar carry-over entre contas
      setActiveLocal(null);
    } catch (e) {
      void e;
    }
    setProfile(null);
    try {
      writeProfileCache(null);
    } catch (e) {
      void e;
    }
    setUser(null);
    setSession(null);
    lastFetchedUserId.current = null;
    fetchingProfile.current = false;
    router.push('/');
  };

  const updateProfile = async () => {
    if (user) {
      // Invalidate cache and force refetch
      try {
        writeProfileCache(null);
      } catch (e) {
        void e;
      }
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
