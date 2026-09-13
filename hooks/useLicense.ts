'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'loading' | 'error';

export function useLicense() {
  const { profile, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<LicenseStatus>('loading');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkLicense() {
      // Se a autenticação ainda está inicializando, aguarde
      if (authLoading) return;

      // Se não há usuário/perfil logado ou email ausente, libera o acesso como ativo para não travar no spinner
      if (!profile || !profile.email) {
        if (mounted) {
          setStatus('active');
          setDaysRemaining(null);
        }
        return;
      }

      // Se for Master, Admin ou perfis com licença liberada padrão
      if (profile.role === 'master' || profile.role === 'admin') {
        if (mounted) {
          setStatus('active');
          setDaysRemaining(null);
        }
        return;
      }

      try {
        const fetchWithTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T | null> =>
          Promise.race([promise, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

        const res: any = await fetchWithTimeout(
          supabase
            .from('colaboradores')
            .select('status_conta, data_vencimento_licenca, ativo')
            .eq('email', profile.email)
            .maybeSingle()
        );

        if (!mounted) return;

        const data = res?.data;

        if (!data) {
          // Em caso de inconsistência temporária ou timeout de rede no mobile, libera o acesso (active)
          setStatus('active');
          setDaysRemaining(null);
          return;
        }

        // 1. Verificação de Bloqueio Manual
        if (!data.ativo || data.status_conta === 'suspenso' || data.status_conta === 'cancelado') {
          setStatus('suspended');
          setDaysRemaining(null);
          return;
        }

        // 2. Verificação de Data
        if (data.data_vencimento_licenca) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const vencimento = new Date(data.data_vencimento_licenca);

          const diffTime = vencimento.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setDaysRemaining(diffDays);

          if (diffDays < 0) {
            setStatus('expired');
            return;
          }
        } else {
          setDaysRemaining(null);
        }

        setStatus('active');
      } catch (err) {
        console.error('useLicense check error:', err);
        if (mounted) {
          setStatus('active');
          setDaysRemaining(null);
        }
      }
    }

    void checkLicense();

    return () => {
      mounted = false;
    };
  }, [profile, authLoading]);

  return { status, daysRemaining };
}
