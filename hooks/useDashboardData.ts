import useSWR from 'swr';
import { supabase } from '@/lib/supabase';

export type FiltrosDashboard = {
  dataInicial: string;
  dataFinal: string;
  statusSelecionado: string;
};

export type Profile = {
  id: string;
  nome?: string;
  local_id?: string;
  role: string;
  email: string;
};

type UseProfileResult = {
  data: Profile | null | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

export function useProfile(): UseProfileResult {
  const swrResult = useSWR<Profile | null, Error>(
    'profile',
    async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;
      const response = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (response && typeof response.error !== 'undefined' && response.error) {
        const errorObj = response.error;
        if (typeof errorObj === 'string') {
          throw new Error(errorObj);
        } else if (
          errorObj &&
          typeof errorObj === 'object' &&
          'message' in errorObj &&
          typeof (errorObj as { message?: unknown }).message === 'string'
        ) {
          throw new Error(String((errorObj as { message: string }).message));
        } else {
          throw new Error('Erro desconhecido ao buscar perfil');
        }
      }
      // Se chegou aqui, não há erro
      return response.data ? (response.data as Profile) : null;
    },
    { revalidateOnFocus: true }
  ) as {
    data: Profile | null | undefined;
    error: Error | undefined;
    isLoading: boolean;
  };
  const safeError = swrResult.error instanceof Error ? swrResult.error : undefined;
  return { data: swrResult.data, error: safeError, isLoading: swrResult.isLoading };
}

export type KPIs = {
  producaoTotal: number;
  eficiencia: number;
  produtividade: number;
  perdas: number;
};

type UseKPIsResult = {
  data: KPIs | null | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

export function useKPIs(filtros: FiltrosDashboard): UseKPIsResult {
  const swrResult = useSWR<KPIs | null, Error>(
    ['kpis', JSON.stringify(filtros)],
    async () => {
      const queryParams = new URLSearchParams({
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        statusSelecionado: filtros.statusSelecionado,
      });
      const response = await fetch(`/api/dashboard/producao?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao buscar dados da produção');
      const json: unknown = await response.json();
      if (json && typeof json === 'object' && 'error' in json) {
        const errorObj = (json as { error?: unknown }).error;
        if (typeof errorObj === 'string') {
          throw new Error(errorObj);
        } else if (
          errorObj &&
          typeof errorObj === 'object' &&
          'message' in errorObj &&
          typeof (errorObj as { message?: unknown }).message === 'string'
        ) {
          throw new Error(String((errorObj as { message: string }).message));
        } else {
          throw new Error('Erro desconhecido ao buscar KPIs');
        }
      }
      // Se chegou aqui, não há erro
      return json ? (json as KPIs) : null;
    },
    { revalidateOnFocus: true }
  ) as {
    data: KPIs | null | undefined;
    error: Error | undefined;
    isLoading: boolean;
  };
  const safeError = swrResult.error instanceof Error ? swrResult.error : undefined;
  return { data: swrResult.data, error: safeError, isLoading: swrResult.isLoading };
}
