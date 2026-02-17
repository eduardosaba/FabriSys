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

export type UserRole = 'master' | 'admin' | 'gerente' | 'compras' | 'fabrica' | 'pdv' | 'user'; // Adicionado fallback

interface Profile {
  id: string;
  role: UserRole;
  local_id?: string;
  nome?: string;
  email?: string;
  organization_id?: string; // Vital para o SaaS
  ativo?: boolean;
  status_conta?: string;
}

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
    console.log(`[AuthProvider] 🔍 Iniciando fetchProfile para userId=${userId}`);

    try {
      // 1. Tenta buscar na tabela SaaS (COLABORADORES) - Prioridade
      console.log('[AuthProvider] 📋 Buscando na tabela colaboradores...');
      const colabStart = performance.now();
      const { data: colab, error: colabError } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      const colabDuration = performance.now() - colabStart;
      console.log(`[AuthProvider] ⏱️ Query colaboradores: ${colabDuration.toFixed(2)}ms`);

      if (colabError) {
        console.warn('[AuthProvider] ⚠️ Erro ao buscar colaboradores:', colabError);
      }

      if (colab) {
        // Se achou colaborador, usa esses dados (são os mais completos)
        const totalDuration = performance.now() - startTime;
        console.log(
          `[AuthProvider] ✅ Perfil encontrado em colaboradores. Total: ${totalDuration.toFixed(2)}ms`
        );
        console.log('[AuthProvider] 👤 Perfil:', {
          id: colab.id,
          role: colab.role,
          organization_id: colab.organization_id,
        });
        setProfile(colab as Profile);
        return;
      }

      // 2. Se não achou (ex: usuário recém criado sem vinculo), tenta em PROFILES
      console.log('[AuthProvider] 📋 Colaborador não encontrado. Buscando na tabela profiles...');
      const profStart = performance.now();
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      const profDuration = performance.now() - profStart;
      console.log(`[AuthProvider] ⏱️ Query profiles: ${profDuration.toFixed(2)}ms`);

      if (profError) {
        console.warn('[AuthProvider] ⚠️ Erro ao buscar profiles:', profError);
      }

      if (prof) {
        const totalDuration = performance.now() - startTime;
        console.log(
          `[AuthProvider] ✅ Perfil encontrado em profiles. Total: ${totalDuration.toFixed(2)}ms`
        );
        const profileData = {
          id: prof.id,
          role: (prof.role as UserRole) || 'user',
          nome: prof.full_name || prof.username || userEmail?.split('@')[0],
          email: userEmail,
          // Copiar organization_id e outros campos úteis quando disponíveis
          organization_id: prof.organization_id ?? undefined,
          ativo: prof.ativo ?? undefined,
          status_conta: prof.status_conta ?? undefined,
        };
        console.log('[AuthProvider] 👤 Perfil:', profileData);
        setProfile(profileData as Profile);
        return;
      }

      // 3. Fallback de emergência (não trava o app se o banco falhar)
      const totalDuration = performance.now() - startTime;
      console.warn(
        `[AuthProvider] ⚠️ Perfil não encontrado em nenhuma tabela. Total: ${totalDuration.toFixed(2)}ms`
      );
      console.log('[AuthProvider] 🔄 Usando fallback: role=user');
      setProfile({ id: userId, role: 'user', email: userEmail });
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      console.error(
        `[AuthProvider] ❌ Erro ao buscar perfil (${totalDuration.toFixed(2)}ms):`,
        error
      );
      // Garante que o loading termine mesmo com erro
      setProfile({ id: userId, role: 'user', email: userEmail });
    } finally {
      fetchingProfile.current = false;
    }
  }, []);

  useEffect(() => {
    // Timeout de segurança: evita loading infinito se houver problemas de rede
    // Se o profile não carregar em 15s, força loading=false e marca que ocorreu timeout
    // Aumentamos o limite para 15s para tolerar queries maiores em ambientes remotos.
    const timeoutOccurred = { value: false } as { value: boolean };
    const _timeout = setTimeout(() => {
      timeoutOccurred.value = true;
      setLoading((prev) => {
        if (prev) {
          console.warn('Timeout de loading excedido (Auth). A busca de perfil pode estar lenta.');
          return false;
        }
        return prev;
      });
    }, 15000);

    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id, initialSession.user.email);
        }
      } catch (error) {
        console.error('Erro na sessão inicial:', error);
      } finally {
        clearTimeout(_timeout);
        if (timeoutOccurred.value) {
          console.log('[AuthProvider] fetchProfile finalizou após timeout; profile pode ter sido carregado posteriormente.');
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
