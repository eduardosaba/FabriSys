'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'loading' | 'error';

export function useLicense() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<LicenseStatus>('loading');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    async function checkLicense() {
      if (!profile?.email) return;

      // Se for Master, sempre tem acesso
      if (profile.role === 'master') {
        setStatus('active');
        setDaysRemaining(null);
        return;
      }

      try {
        // Busca os dados atualizados do colaborador (não confie apenas no profile local/cache)
        const { data, error } = await supabase
          .from('colaboradores')
          .select('status_conta, data_vencimento_licenca, ativo')
          .eq('email', profile.email)
          .maybeSingle();

        if (error || !data) {
          setStatus('error');
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

          // Diferença em dias
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
        // Em caso de erro de rede ou similar
        console.error('useLicense check error:', err);
        setStatus('error');
        setDaysRemaining(null);
      }
    }

    checkLicense();
    // Também podemos revalidar eventualmente (não implementado aqui)
  }, [profile]);

  return { status, daysRemaining };
}
