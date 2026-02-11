'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';
import Footer from '@/components/ui/Footer';
import AuthGuard from '@/components/AuthGuard';
import LicenseGuard from '@/components/LicenseGuard';
import Loading from '@/components/ui/Loading';
import { useOrganization } from '@/hooks/useOrganization'; // Hook que criamos antes
import { useAuth } from '@/lib/auth';
import SystemAlertPopup from '@/components/SystemAlertPopup';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hooks de dados
  const { profile } = useAuth();
  const { org, loading: loadingOrg } = useOrganization();

  // Verifica se estamos na página de onboarding para não entrar em loop infinito
  const isOnboardingPage = pathname === '/dashboard/onboarding';

  useEffect(() => {
    if (!loadingOrg && org && profile) {
      // LÓGICA DO GUARDA DE TRÂNSITO:

      // 1. Se for Master, nunca bloqueia (Master não faz onboarding de si mesmo)
      if (profile.role === 'master') return;

      // 2. Se a empresa NÃO tem setup concluído (false OU undefined) e o usuário NÃO está na página de onboarding...
      if (!org?.setup_concluido && !isOnboardingPage) {
        // ...Manda ele para o onboarding agora!
        router.replace('/dashboard/onboarding');
      }

      // 3. Se a empresa JÁ TEM setup concluído e ele tenta voltar para o onboarding...
      if (org?.setup_concluido && isOnboardingPage) {
        // ...Manda ele para o dashboard (não precisa configurar de novo)
        router.replace('/dashboard');
      }
    }
  }, [org, loadingOrg, isOnboardingPage, router, profile]);

  // Enquanto carrega a organização, mostra loading para não piscar a tela errada
  if (loadingOrg) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loading />
      </div>
    );
  }

  // --- MODO ONBOARDING (Tela Cheia, Sem Menu) ---
  // Se estivermos na página de onboarding, retornamos apenas o conteúdo (children)
  // sem a Sidebar e sem o Header, para focar o usuário no cadastro.
  if (isOnboardingPage) {
    return (
      <AuthGuard requiredRoles={['admin', 'master', 'gerente']}>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </AuthGuard>
    );
  }

  // --- MODO SISTEMA NORMAL (Com Menu e Header) ---
  return (
    <AuthGuard requiredRoles={['admin', 'fabrica', 'master', 'pdv', 'gerente', 'compras']}>
      <LicenseGuard>
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
          {/* Overlay Mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Container Principal */}
          <div className="flex flex-1 flex-col min-h-screen min-w-0 transition-all duration-300 lg:ml-64">
            <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

            {/* Conteúdo das Páginas */}
            <div className="flex flex-col flex-1 w-full">
              <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto animate-fade-up">
                {children}
              </main>
              <Footer />
            </div>
          </div>

          {/* Sistema de Avisos/Comunicados em Tempo Real */}
          <SystemAlertPopup />
        </div>
      </LicenseGuard>
    </AuthGuard>
  );
}
