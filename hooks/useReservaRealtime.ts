import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export function useReservaRealtime() {
  const [totalReserva, setTotalReserva] = useState<number>(0);

  const fetchReserva = async () => {
    try {
      const res = await fetch('/api/reservas/count');
      if (!res.ok) return;
      const json = await res.json();
      const count = Number(json?.count ?? 0);
      setTotalReserva(count);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    void fetchReserva();

    const channel = supabase
      .channel('reserva-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_producao' }, () => {
        void fetchReserva();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return totalReserva;
}
