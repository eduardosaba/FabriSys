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
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';
import SystemAlertPopup from '@/components/SystemAlertPopup';

import MobileQuickActionBar from '@/components/ui/MobileQuickActionBar';

export default function DashboardClientWrapper({
  children,
  logoUrl,
}: {
  children: React.ReactNode;
  logoUrl?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [effectiveLogo, setEffectiveLogo] = useState<string | undefined>(logoUrl);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  const { profile } = useAuth();
  const { org, loading: loadingOrg } = useOrganization();
  const { loadThemeByOrg } = useTheme();

  // Carrega permissões do perfil express/pdv_simples para liberação dinâmica de rotas
  useEffect(() => {
    if (!profile?.role) return;
    if (profile.role !== 'express' && profile.role !== 'pdv_simples') return;

    let isMounted = true;
    const fetchPerms = async () => {
      try {
        const { data: globalData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .is('organization_id', null)
          .maybeSingle();

        let orgData = null;
        if (profile?.organization_id) {
          const { data } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'permissoes_acesso')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();
          orgData = data;
        }

        const parseValor = (valor: unknown): Record<string, string[]> => {
          if (!valor) return {};
          if (typeof valor === 'string') {
            try {
              return JSON.parse(valor);
            } catch {
              return {};
            }
          }
          if (typeof valor === 'object') return valor as Record<string, string[]>;
          return {};
        };

        const globalP = parseValor(globalData?.valor);
        const orgP = parseValor(orgData?.valor);

        const defaultExpress = [
          'acertos_rapidos',
          'lancar_turno',
          'fechamento_diario',
          'auditoria_geral',
          'conciliacao_bancaria',
          'ranking_produtos',
          'produtos',
          'agenda',
          'configuracoes_lojas',
          'pdv',
          'pdv_caixa',
          'pdv_controle_caixa',
          'ajuda',
        ];

        const rolePerms = orgP[profile.role] || globalP[profile.role] || defaultExpress;
        if (isMounted) setUserPerms(rolePerms);
      } catch {
        if (isMounted) {
          setUserPerms(['acertos_rapidos', 'agenda', 'configuracoes_lojas', 'pdv', 'produtos']);
        }
      }
    };
    void fetchPerms();
    return () => {
      isMounted = false;
    };
  }, [profile?.role, profile?.organization_id]);

  // Sempre que o profile/org mudar, atualizamos variáveis CSS e forçamos
  // atualização da logo usada pelo Header/Sidebar.
  useEffect(() => {
    const logo = profile?.company_logo_url || logoUrl || org?.logo_url;
    if (logo) setEffectiveLogo(logo);

    const primary =
      profile?.theme_primary_color || profile?.primary_color || (org as any)?.primary_color;
    if (primary && typeof document !== 'undefined') {
      try {
        document.documentElement.style.setProperty('--primary-color', primary);
      } catch (e) {
        void e;
      }
    }
  }, [profile, org, logoUrl]);

  const orgId = profile?.organization_id || '';
  const userId = profile?.id || '';

  // Carrega tema da organização / usuário assim que soubermos orgId ou userId
  useEffect(() => {
    if (orgId || userId) {
      try {
        void loadThemeByOrg(orgId, userId);
      } catch (e) {
        void e;
      }
    }
  }, [orgId, userId, loadThemeByOrg]);

  const isOnboardingPage = pathname === '/dashboard/onboarding';

  useEffect(() => {
    if (!loadingOrg && org && profile) {
      if (profile.role === 'master') return;

      // Trava de Rota Dinâmica para Perfil Express / PDV Simples
      if (profile.role === 'express' || profile.role === 'pdv_simples') {
        if (pathname === '/dashboard/producao' || pathname === '/dashboard/producao/') {
          router.replace('/dashboard/producao/produtos');
          return;
        }

        const defaultAllowed = [
          '/dashboard/acerto-diario',
          '/dashboard/producao/produtos',
          '/dashboard/agenda',
          '/dashboard/configuracoes/lojas',
          '/dashboard/pdv',
          '/dashboard/ajuda',
        ];

        const modRouteMap: Record<string, string[]> = {
          agenda: ['/dashboard/agenda'],
          configuracoes_lojas: ['/dashboard/configuracoes/lojas', '/dashboard/configuracoes'],
          pdv: ['/dashboard/pdv'],
          pdv_caixa: ['/dashboard/pdv/caixa', '/dashboard/pdv'],
          pdv_controle_caixa: ['/dashboard/pdv/controle-caixa', '/dashboard/pdv'],
          pdv_recebimento: ['/dashboard/pdv/recebimento', '/dashboard/pdv'],
          pdv_inventario: ['/dashboard/pdv/inventario', '/dashboard/pdv'],
          acertos_rapidos: ['/dashboard/acerto-diario'],
          auditoria_geral: ['/dashboard/acerto-diario/auditoria', '/dashboard/acerto-diario'],
          lancar_turno: ['/dashboard/acerto-diario'],
          fechamento_diario: ['/dashboard/acerto-diario/fechamento', '/dashboard/acerto-diario'],
          produtos: ['/dashboard/producao/produtos'],
          producao: ['/dashboard/producao'],
          ajuda: ['/dashboard/ajuda'],
        };

        const allowedRoutesSet = new Set<string>(defaultAllowed);
        userPerms.forEach((mod) => {
          if (modRouteMap[mod]) {
            modRouteMap[mod].forEach((r) => allowedRoutesSet.add(r));
          }
        });

        const rotasPermitidas = Array.from(allowedRoutesSet);
        const rotaPermitida = rotasPermitidas.some(
          (r) => pathname === r || pathname.startsWith(r + '/') || pathname.startsWith(r)
        );

        if (!rotaPermitida) {
          router.replace('/dashboard/acerto-diario/auditoria');
          return;
        }
      }

      if (!org?.setup_concluido && !isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
      if (org?.setup_concluido && isOnboardingPage) {
        router.replace('/dashboard');
      }
    }
  }, [org, loadingOrg, isOnboardingPage, router, profile, pathname, userPerms]);

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
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)] transition-colors duration-300">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard
      requiredRoles={[
        'admin',
        'fabrica',
        'master',
        'pdv',
        'gerente',
        'compras',
        'express',
        'pdv_simples',
      ]}
    >
      <LicenseGuard>
        <div className="flex min-h-screen bg-[var(--background)] font-sans text-[var(--text)] transition-colors duration-300">
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
              <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 w-full max-w-[1600px] mx-auto animate-fade-up">
                {children}
              </main>
            </div>
          </div>

          <MobileQuickActionBar />
          <SystemAlertPopup />
        </div>
      </LicenseGuard>
    </AuthGuard>
  );
}
