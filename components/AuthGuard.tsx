'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  requiredRoles = [],
  redirectTo = '/login',
}: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Se ainda não temos o perfil, aguardar carregamento
    if (!profile) return;

    if (requiredRoles.length > 0 && !requiredRoles.includes(profile.role)) {
      // Redirecionar baseado no role atual
      switch (profile.role) {
        case 'admin':
        case 'fabrica':
          router.push('/dashboard');
          break;
        case 'pdv':
          router.push('/dashboard/pedidos-compra');
          break;
        default:
          router.push('/dashboard');
      }
      return;
    }
  }, [user, profile, loading, requiredRoles, redirectTo, router]);

  // Mostrar loading enquanto carrega usuário OU perfil (se usuário existe)
  if (loading || (user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecionará no useEffect
  }

  if (requiredRoles.length > 0 && profile && !requiredRoles.includes(profile.role)) {
    return null; // Redirecionará no useEffect
  }

  return <>{children}</>;
}
