'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

export type UserRole =
  | 'admin'
  | 'fabrica'
  | 'pdv'
  | 'master'
  | 'gerente'
  | 'estoque'
  | 'caixa'
  | 'cozinha'
  | 'operador'
  | 'user'; // Adicionado fallback

interface Profile {
  id: string;
  role: UserRole;
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

  // Função isolada para buscar o perfil nas tabelas corretas
  const fetchProfile = async (userId: string, userEmail?: string) => {
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
        };
        console.log('[AuthProvider] 👤 Perfil:', profileData);
        setProfile(profileData);
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
    }
  };

  useEffect(() => {
    // Timeout de segurança
    const _timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('Timeout de loading excedido (Auth).');
          return false;
        }
        return prev;
      });
    }, 7000);

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
        setLoading(false);
      }
    };

    void getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Só busca se o perfil ainda não estiver carregado ou se o usuário mudou
        if (!profile || profile.id !== currentSession.user.id) {
          await fetchProfile(currentSession.user.id, currentSession.user.email);
        }
      } else {
        setProfile(null);
        // Opcional: Redirecionar para login se deslogar
        // router.push('/');
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(_timeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    router.push('/');
  };

  const updateProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
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
