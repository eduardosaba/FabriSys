'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface Insumo {
  id: string;
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
}

interface EstoqueAlerta {
  insumo: Insumo;
  quantidade_total: number;
}

export default function AlertasEstoque() {
  const [alertas, setAlertas] = useState<EstoqueAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [_channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    verificarEstoque();

    // Inscrever-se para atualizações de estoque em tempo real
    const channel = supabase
      .channel('estoque-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lotes_insumos'
        },
        () => {
          verificarEstoque();
        }
      )
      .subscribe();

    setChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function verificarEstoque() {
    try {
      setLoading(true);

      // Buscar todos os insumos e suas quantidades totais em estoque
      const { data: insumos, error: insumoError } = await supabase
        .from('insumos')
        .select('*');

      if (insumoError) throw insumoError;

      const alertas: EstoqueAlerta[] = [];

      for (const insumo of insumos) {
        // Calcular quantidade total em estoque para cada insumo
        const { data: lotes, error: lotesError } = await supabase
          .from('lotes_insumos')
          .select('quantidade_restante')
          .eq('insumo_id', insumo.id)
          .gte('quantidade_restante', 0);

        if (lotesError) throw lotesError;

        const quantidade_total = lotes.reduce((total, lote) => total + (lote.quantidade_restante || 0), 0);

        // Verificar se está abaixo do nível mínimo
        if (quantidade_total <= insumo.estoque_minimo_alerta) {
          alertas.push({
            insumo,
            quantidade_total
          });

          // Mostrar notificação toast se o estado anterior não tinha este alerta
          if (!alertas.some(a => a.insumo.id === insumo.id)) {
            toast.error(`Alerta: ${insumo.nome} está com estoque baixo (${quantidade_total} ${insumo.unidade_medida})`, {
              duration: 5000,
              id: `estoque-baixo-${insumo.id}`, // Evita duplicatas
            });
          }
        }
      }

      setAlertas(alertas);
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && alertas.length === 0) return null;

  if (alertas.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-200">
        Todos os insumos estão com níveis de estoque adequados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alertas.map((alerta) => (
        <div
          key={alerta.insumo.id}
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200"
        >
          <div className="mb-1 font-medium">
            Alerta: Estoque Baixo
          </div>
          <p>
            {alerta.insumo.nome} está com apenas {alerta.quantidade_total} {alerta.insumo.unidade_medida} em estoque
            (mínimo: {alerta.insumo.estoque_minimo_alerta} {alerta.insumo.unidade_medida}).
          </p>
        </div>
      ))}
    </div>
  );
}