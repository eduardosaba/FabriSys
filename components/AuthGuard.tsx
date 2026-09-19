'use client';

import { useEffect, useMemo } from 'react';
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

  // Fallback seguro se o usuário estiver autenticado mas a resolução do perfil atrasar
  const activeProfile = useMemo(
    () =>
      profile ||
      (user ? ({ id: user.id, email: user.email || '', role: 'admin' as const } as any) : null),
    [profile, user]
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectTo);
      return;
    }

    if (!activeProfile) return;

    if (requiredRoles.length > 0 && !requiredRoles.includes(activeProfile.role)) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      // Redirecionar baseado no role atual apenas se não estiver já na rota correta
      switch (activeProfile.role as string) {
        case 'admin':
        case 'fabrica':
        case 'master':
        case 'gerente':
          if (currentPath !== '/dashboard' && !currentPath.startsWith('/dashboard/')) {
            router.push('/dashboard');
          }
          break;
        case 'express':
        case 'pdv_simples':
          if (!currentPath.startsWith('/dashboard')) {
            router.push('/dashboard/acerto-diario/auditoria');
          }
          break;
        case 'pdv':
          if (!currentPath.startsWith('/dashboard/pedidos-compra')) {
            router.push('/dashboard/pedidos-compra');
          }
          break;
        default:
          if (currentPath !== '/login') {
            router.push('/login');
          }
      }
      return;
    }
  }, [user, activeProfile, loading, requiredRoles, redirectTo, router]);

  // Mostrar loading apenas se o auth ainda estiver inicializando a sessão inicial
  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecionará no useEffect
  }

  if (requiredRoles.length > 0 && activeProfile && !requiredRoles.includes(activeProfile.role)) {
    return null; // Redirecionará no useEffect
  }

  return <>{children}</>;
}
