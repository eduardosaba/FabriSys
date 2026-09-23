'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Organization {
  id: string;
  nome: string;
  plano: string;
  setup_concluido: boolean;
  logo_url?: string;
  primary_color?: string;
}

export function useOrganization() {
  const { profile, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadOrg() {
      if (authLoading && !profile) return;

      // 1. Usar os dados da organização já embutidos no perfil se disponíveis
      if (profile?.organizations) {
        const orgData: any = Array.isArray(profile.organizations)
          ? profile.organizations[0]
          : profile.organizations;
        if (orgData && orgData.id) {
          if (mounted) {
            setOrg({
              id: String(orgData.id),
              nome: String(orgData.nome ?? ''),
              plano: String(orgData.plano ?? ''),
              setup_concluido: (orgData.setup_concluido as boolean) ?? true,
              logo_url: orgData.logo_url ?? undefined,
            });
            setLoading(false);
          }
          return;
        }
      }

      if (!profile?.email) {
        if (mounted) {
          setOrg(
            profile?.organization_id
              ? {
                  id: String(profile.organization_id),
                  nome: 'Sua Organização',
                  plano: 'Pro',
                  setup_concluido: true,
                }
              : null
          );
          setLoading(false);
        }
        return;
      }

      try {
        const fetchWithTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T | null> =>
          Promise.race([promise, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

        const res: any = await fetchWithTimeout(
          supabase
            .from('colaboradores')
            .select('organization_id, organizations(id, nome, plano, setup_concluido)')
            .eq('email', profile.email)
            .maybeSingle()
        );

        if (!mounted) return;

        const colaborador = res?.data;

        if (colaborador?.organizations) {
          const orgData = Array.isArray(colaborador.organizations)
            ? colaborador.organizations[0]
            : colaborador.organizations;

          const normalized: Organization = {
            id: String(orgData.id),
            nome: String(orgData.nome ?? ''),
            plano: String(orgData.plano ?? ''),
            setup_concluido: (orgData.setup_concluido as boolean) ?? true,
            logo_url: orgData.logo_url ?? undefined,
          };

          setOrg(normalized);
        } else if (profile?.organization_id) {
          const { data: orgRow } = await supabase
            .from('organizations')
            .select('id, nome, plano, setup_concluido, logo_url')
            .eq('id', profile.organization_id)
            .maybeSingle();

          if (orgRow) {
            setOrg({
              id: String(orgRow.id),
              nome: String(orgRow.nome ?? 'Sua Organização'),
              plano: String(orgRow.plano ?? 'Pro'),
              setup_concluido: (orgRow.setup_concluido as boolean) ?? true,
              logo_url: orgRow.logo_url ?? undefined,
            });
          } else {
            setOrg({
              id: String(profile.organization_id),
              nome: 'Sua Organização',
              plano: 'Pro',
              setup_concluido: true,
            });
          }
        } else {
          setOrg(null);
        }
      } catch (err) {
        console.error('Erro ao carregar organização:', err);
        if (mounted) {
          if (profile?.organization_id) {
            setOrg({
              id: String(profile.organization_id),
              nome: 'Sua Organização',
              plano: 'Pro',
              setup_concluido: true,
            });
          } else {
            setOrg(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadOrg();

    return () => {
      mounted = false;
    };
  }, [profile, authLoading]);

  return { org, loading };
}
