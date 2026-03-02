'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';
import AuthGuard from '@/components/AuthGuard';
import LicenseGuard from '@/components/LicenseGuard';
import Loading from '@/components/ui/Loading';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/lib/auth';
import SystemAlertPopup from '@/components/SystemAlertPopup';

export default function DashboardClientWrapper({
  children,
  logoUrl,
}: {
  children: React.ReactNode;
  logoUrl?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [effectiveLogo, setEffectiveLogo] = useState<string | undefined>(logoUrl);
  const router = useRouter();
  const pathname = usePathname();

  const { profile } = useAuth();
  const { org, loading: loadingOrg } = useOrganization();

  // Sempre que o profile/org mudar, atualizamos variáveis CSS e forçamos
  // atualização da logo usada pelo Header/Sidebar.
  useEffect(() => {
    const logo = profile?.company_logo_url || logoUrl || org?.logo_url;
    if (logo) setEffectiveLogo(logo);

    const primary =
      (profile as any)?.theme_primary_color ||
      (profile as any)?.primary_color ||
      (org as any)?.primary_color;
    if (primary && typeof document !== 'undefined') {
      try {
        document.documentElement.style.setProperty('--primary-color', primary);
      } catch (e) {
        void e;
      }
    }
  }, [profile, org, logoUrl]);

  const isOnboardingPage = pathname === '/dashboard/onboarding';

  useEffect(() => {
    if (!loadingOrg && org && profile) {
      if (profile.role === 'master') return;
      if (!org?.setup_concluido && !isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
      if (org?.setup_concluido && isOnboardingPage) {
        router.replace('/dashboard');
      }
    }
  }, [org, loadingOrg, isOnboardingPage, router, profile]);

  if (loadingOrg) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loading />
      </div>
    );
  }

  if (isOnboardingPage) {
    return (
      <AuthGuard requiredRoles={['admin', 'master', 'gerente']}>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={['admin', 'fabrica', 'master', 'pdv', 'gerente', 'compras']}>
      <LicenseGuard>
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            logoUrl={effectiveLogo}
            key={effectiveLogo}
          />

          <div className="flex flex-1 flex-col min-h-screen min-w-0 transition-all duration-300 lg:ml-64">
            <DashboardHeader
              onMenuClick={() => setIsSidebarOpen(true)}
              logoUrl={effectiveLogo}
              key={effectiveLogo}
            />

            <div className="flex flex-col flex-1 w-full">
              <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto animate-fade-up">
                {children}
              </main>
            </div>
          </div>

          <SystemAlertPopup />
        </div>
      </LicenseGuard>
    </AuthGuard>
  );
}
