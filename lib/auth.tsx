'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'admin' | 'fabrica' | 'pdv' | 'master';

interface Profile {
  id: string;
  role: UserRole;
  nome?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão inicial
    const getInitialSession = async () => {
      const res = await supabase.auth.getSession();
      const sessionRes = res?.data?.session ?? null;
      setSession(sessionRes);
      setUser(sessionRes?.user ?? null);

      if (sessionRes?.user) {
        await fetchProfile(sessionRes.user.id);
      }

      setLoading(false);
    };

    void getInitialSession();

    // Escutar mudanças de auth
    const onAuth = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    const subscription = onAuth?.data?.subscription;

    return () => subscription?.unsubscribe?.();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const res = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (res?.error && (res.error as { message?: string }).message) {
        throw new Error((res.error as { message?: string }).message as string);
      }

      setProfile((res?.data as Profile) ?? { id: userId, role: 'pdv' });
    } catch (error) {
      if (error instanceof Error) console.error('Erro ao buscar perfil:', error.message);
      else console.error('Erro ao buscar perfil:', error);
      // Fallback para role pdv se não encontrar perfil
      setProfile({ id: userId, role: 'pdv' });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
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
