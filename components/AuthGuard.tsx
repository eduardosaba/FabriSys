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

    if (requiredRoles.length > 0 && profile) {
      if (!requiredRoles.includes(profile.role)) {
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
    }
  }, [user, profile, loading, requiredRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
