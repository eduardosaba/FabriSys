'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getActiveLocal, setActiveLocal } from '@/lib/activeLocal';
import { supabase } from '@/lib/supabase-client';

type ActiveLocalContextType = {
  activeLocalId: string | null;
  activeLocalName: string | null;
  setActiveLocalId: (id: string | null) => void;
  refreshName: () => Promise<void>;
};

const ActiveLocalContext = createContext<ActiveLocalContextType | null>(null);

export function ActiveLocalProvider({ children }: { children: React.ReactNode }) {
  const [activeLocalId, setActiveLocalIdState] = useState<string | null>(null);
  const [activeLocalName, setActiveLocalName] = useState<string | null>(null);

  const refreshName = useCallback(async () => {
    try {
      const id = getActiveLocal();
      setActiveLocalIdState(id);
      if (!id) {
        setActiveLocalName(null);
        return;
      }
      const { data } = await supabase.from('locais').select('nome').eq('id', id).maybeSingle();
      setActiveLocalName(data?.nome || null);
    } catch (e) {
      setActiveLocalName(null);
    }
  }, []);

  // Expondo wrapper que persiste + dispara evento
  const setActiveLocalId = useCallback(
    (id: string | null) => {
      try {
        setActiveLocal(id);
        // Atualiza estado local imediatamente — o evento storage/custom também fará isso entre abas
        setActiveLocalIdState(id);
        void refreshName();
      } catch (e) {
        // noop
      }
    },
    [refreshName]
  );

  useEffect(() => {
    // inicializa
    void refreshName();

    const handler = (ev: any) => {
      try {
        const id = ev?.detail?.localId ?? getActiveLocal();
        setActiveLocalIdState(id);
        void refreshName();
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('pdv_active_local_change', handler as EventListener);
    window.addEventListener('storage', handler as EventListener);
    return () => {
      window.removeEventListener('pdv_active_local_change', handler as EventListener);
      window.removeEventListener('storage', handler as EventListener);
    };
  }, [refreshName]);

  const value: ActiveLocalContextType = {
    activeLocalId,
    activeLocalName,
    setActiveLocalId,
    refreshName,
  };

  return <ActiveLocalContext.Provider value={value}>{children}</ActiveLocalContext.Provider>;
}

export function useActiveLocal() {
  const ctx = useContext(ActiveLocalContext);
  if (!ctx) throw new Error('useActiveLocal must be used within ActiveLocalProvider');
  return ctx;
}

export default ActiveLocalContext;
