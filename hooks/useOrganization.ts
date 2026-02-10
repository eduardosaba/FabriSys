'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Organization {
  id: string;
  nome: string;
  plano: string;
  setup_concluido: boolean;
}

export function useOrganization() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadOrg() {
      // Se não há email no profile, não tenta buscar
      if (!profile?.email) {
        if (mounted) {
          setOrg(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const { data: colaborador, error } = await supabase
          .from('colaboradores')
          .select('organization_id, organizations(id, nome, plano, setup_concluido)')
          .eq('email', profile.email)
          .maybeSingle();

        if (error) throw error;

        if (!mounted) return;

        if (colaborador?.organizations) {
          const orgData = Array.isArray(colaborador.organizations)
            ? colaborador.organizations[0]
            : colaborador.organizations;

          // Normaliza o campo setup_concluido: se undefined/null, assume false
          const normalized: Organization = {
            id: String(orgData.id),
            nome: String(orgData.nome ?? ''),
            plano: String(orgData.plano ?? ''),
            setup_concluido: (orgData.setup_concluido as boolean) ?? false,
          };

          setOrg(normalized);
        } else {
          setOrg(null);
        }
      } catch (err) {
        // manter log para debug; não lançar para não quebrar a UI
        console.error('Erro ao carregar organização:', err);
        if (mounted) setOrg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadOrg();

    return () => {
      mounted = false;
    };
  }, [profile?.email]);

  return { org, loading };
}
