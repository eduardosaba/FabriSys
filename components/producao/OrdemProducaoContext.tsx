'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { OrdemProducao } from '@/lib/types/producao';

interface OrdemProducaoContextType {
  ordens: OrdemProducao[];
  loading: boolean;
  loadOrdens: () => Promise<void>;
  updateOrdemStatus: (id: string, status: OrdemProducao['status']) => Promise<void>;
}

const OrdemProducaoContext = createContext<OrdemProducaoContextType | undefined>(undefined);

export function useOrdemProducao() {
  const context = useContext(OrdemProducaoContext);
  if (!context) {
    throw new Error('useOrdemProducao deve ser usado dentro de um OrdemProducaoProvider');
  }
  return context;
}

export function OrdemProducaoProvider({ children }: { children: React.ReactNode }) {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadOrdens = useCallback(async () => {
    try {
      setLoading(true);
      const resp = (await supabase
        .from('ordens_producao')
        .select('*, produto_final_id')
        .order('data_prevista', { ascending: false })) as unknown as {
        data?: unknown[];
        error?: unknown;
      };

      const data = resp.data ?? [];
      const error = resp.error;
      if (error) throw error;

      const rows = data as any[];
      const produtoIds = Array.from(new Set(rows.map((r) => String(r.produto_final_id)).filter(Boolean)));
      const produtoMap: Record<string, { nome?: string }> = {};
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase.from('produtos_finais').select('id, nome').in('id', produtoIds);
        (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome }));
      }

      const normalized = rows.map((d: any) => ({
        ...d,
        produto_final: produtoMap[String(d.produto_final_id)] || null,
      }));

      setOrdens(normalized as OrdemProducao[]);
    } catch {
      toast({
        title: 'Erro ao carregar ordens',
        description: 'Não foi possível carregar as ordens de produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateOrdemStatus = useCallback(
    async (id: string, status: OrdemProducao['status']) => {
      try {
        const { error } = await supabase.from('ordens_producao').update({ status }).eq('id', id);

        if (error) throw error;

        setOrdens((prev) => prev.map((ordem) => (ordem.id === id ? { ...ordem, status } : ordem)));

        toast({
          title: 'Status atualizado',
          description: 'O status da ordem foi atualizado com sucesso.',
          variant: 'success',
        });
      } catch {
        toast({
          title: 'Erro ao atualizar',
          description: 'Não foi possível atualizar o status da ordem.',
          variant: 'error',
        });
      }
    },
    [toast]
  );

  return (
    <OrdemProducaoContext.Provider
      value={{
        ordens,
        loading,
        loadOrdens,
        updateOrdemStatus,
      }}
    >
      {children}
    </OrdemProducaoContext.Provider>
  );
}
