import { supabase } from '@/lib/supabase';
import { getActiveLocal, setActiveLocal } from '@/lib/activeLocal';

export interface OperationalContext {
  localId: string | null;
  caixa: any | null;
}

export async function getOperationalContext(profile: any): Promise<OperationalContext> {
  try {
    const profileLocalId = profile?.local_id;
    const userId = profile?.id;

    // 1. PRIORIDADE MÁXIMA: Vínculo direto no perfil (Ex: Login CSA -> PDV CSA)
    if (profileLocalId) {
      // Forçamos a sincronização do localStorage imediatamente
      try {
        if (getActiveLocal() !== profileLocalId) setActiveLocal(profileLocalId);
      } catch (e) {
        void e;
      }

      // Buscamos se existe um caixa aberto para este local específico
      try {
        const { data: caixa } = await supabase
          .from('caixa_sessao')
          .select('*')
          .eq('local_id', profileLocalId)
          .eq('status', 'aberto')
          .maybeSingle();

        return { localId: profileLocalId, caixa: caixa ?? null };
      } catch (e) {
        return { localId: profileLocalId, caixa: null };
      }
    }

    // 2. SEGUNDA PRIORIDADE: Se não tem local fixo, verifica se o usuário abriu um caixa em algum lugar
    if (userId) {
      try {
        const { data: caixa } = await supabase
          .from('caixa_sessao')
          .select('*')
          .eq('usuario_abertura', userId)
          .eq('status', 'aberto')
          .maybeSingle();

        if (caixa) {
          try {
            if (getActiveLocal() !== caixa.local_id) setActiveLocal(caixa.local_id);
          } catch (e) {
            void e;
          }
          return { localId: caixa.local_id, caixa };
        }
      } catch (e) {
        // ignore
      }
    }

    // Segurança: usuário PDV sem local fixo e sem caixa aberto não deve herdar local persistido
    if (profile?.role === 'pdv') {
      try {
        if (getActiveLocal()) setActiveLocal(null);
      } catch (e) {
        void e;
      }
      return { localId: null, caixa: null };
    }

    // 3. TERCEIRA PRIORIDADE (ADMIN): Fallback para seleção manual no localStorage
    let persisted = getActiveLocal();

    // Validação de segurança: garantir que o local selecionado pertence à mesma organização
    if (persisted && profile?.organization_id) {
      try {
        const { data: localRow } = await supabase
          .from('locais')
          .select('organization_id')
          .eq('id', persisted)
          .maybeSingle();

        if (!localRow || localRow.organization_id !== profile.organization_id) {
          try {
            setActiveLocal(null);
          } catch (e) {
            void e;
          }
          persisted = null;
        }
      } catch (e) {
        // ignore
      }
    }

    return { localId: persisted ?? null, caixa: null };
  } catch (err) {
    console.error('[operationalLocal] Erro inesperado:', err);
    return { localId: profile?.local_id ?? getActiveLocal() ?? null, caixa: null };
  }
}

// Helper para uso em componentes
export function useOperationalLocal() {
  return { getOperationalContext };
}
