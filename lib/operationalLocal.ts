import { supabase } from '@/lib/supabase';
import { getActiveLocal } from '@/lib/activeLocal';

export interface OperationalContext {
  localId: string | null;
  caixa: any | null;
}

export async function getOperationalContext(profile: any): Promise<OperationalContext> {
  try {
    // If we have a profile.id, prefer finding an open caixa for this user
    if (profile && profile.id) {
      const { data: caixa } = await supabase
        .from('caixa_sessao')
        .select('*')
        .eq('usuario_abertura', profile.id)
        .eq('status', 'aberto')
        .maybeSingle();

      if (caixa) return { localId: caixa.local_id ?? null, caixa };
    }

    // Fallback to persisted active local (admin selection) or profile.local_id
    const persisted = getActiveLocal();
    const localId = profile?.local_id ?? persisted ?? null;
    return { localId, caixa: null };
  } catch (err) {
    const persisted = getActiveLocal();
    return { localId: profile?.local_id ?? persisted ?? null, caixa: null };
  }
}

export function useOperationalLocal(profile: any) {
  const [ctx, setCtx] = (globalThis as any).__op_local_state ||= { value: null };
  // Note: lightweight helper for synchronous usage in client pages — prefer calling getOperationalContext in effects
  return { getOperationalContext };
}
