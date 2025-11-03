'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import StatusIcon from '@/components/ui/StatusIcon';
import Badge from '@/components/ui/Badge';

interface Insumo {
  id: string;
  nome: string;
  unidade_medida: string;
  estoque_minimo_alerta: number;
}

interface EstoqueAlerta {
  insumo: Insumo;
  quantidade_total: number;
  lotes_vencendo?: {
    id: string;
    quantidade_restante: number;
    data_validade: string;
  }[];
}

export default function AlertasEstoque() {
  const [alertas, setAlertas] = useState<EstoqueAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    void verificarEstoque();

    // Inscrever-se para atualizações de estoque em tempo real
    const channel = supabase
      .channel('estoque-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lotes_insumos',
        },
        () => {
          void verificarEstoque();
        }
      )
      .subscribe();

    setChannel(channel);

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  async function verificarEstoque() {
    try {
      setLoading(true);

      // Buscar todos os insumos e suas quantidades totais em estoque
      const { data: insumos, error: insumoError } = await supabase.from('insumos').select('*');

      if (insumoError) throw insumoError;

      const alertas: EstoqueAlerta[] = [];

      for (const insumo of insumos as Insumo[]) {
        const dataLimite = addDays(new Date(), 30); // Alertar para vencimentos nos próximos 30 dias

        // Buscar lotes com quantidade e data de validade
        const { data: lotes, error: lotesError } = await supabase
          .from('lotes_insumos')
          .select('id, quantidade_restante, data_validade')
          .eq('insumo_id', insumo.id)
          .gte('quantidade_restante', 0);

        if (lotesError) throw lotesError;

        // Separar lotes vencendo
        const lotes_vencendo = (lotes || []).filter(
          (lote) => lote.data_validade && new Date(lote.data_validade as string) <= dataLimite
        );

        const quantidade_total = (lotes || []).reduce(
          (total, lote) => total + (lote.quantidade_restante || 0),
          0
        );

        // Adicionar alerta se estiver abaixo do nível mínimo ou tiver lotes vencendo
        if (quantidade_total <= insumo.estoque_minimo_alerta || lotes_vencendo.length > 0) {
          alertas.push({
            insumo,
            quantidade_total,
            lotes_vencendo: lotes_vencendo.length > 0 ? lotes_vencendo : undefined,
          });

          // Mostrar notificação toast se o estado anterior não tinha este alerta
          if (!alertas.some((a) => a.insumo.id === insumo.id)) {
            toast.error(
              `Alerta: ${insumo.nome} está com estoque baixo (${quantidade_total} ${insumo.unidade_medida})`,
              {
                duration: 5000,
                id: `estoque-baixo-${insumo.id}`, // Evita duplicatas
              }
            );
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
      <Card variant="default" className="bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center gap-3">
          <StatusIcon variant="success" size="md" />
          <Text color="success">Todos os insumos estão com níveis de estoque adequados.</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alertas.map((alerta) => {
        const percentual = (alerta.quantidade_total / alerta.insumo.estoque_minimo_alerta) * 100;
        const isZero = alerta.quantidade_total === 0;
        const isCritical = percentual <= 30;

        const variant = isZero ? 'danger' : isCritical ? 'warning' : ('default' as const);
        const status = isZero
          ? 'Estoque Zerado!'
          : isCritical
            ? 'Estoque Crítico'
            : 'Estoque Baixo';

        return (
          <Card
            key={alerta.insumo.id}
            variant="default"
            className="relative overflow-hidden"
            progress={percentual}
            progressVariant={variant}
          >
            {/* Cabeçalho com status */}
            <div className="mb-3 flex items-center gap-3">
              <StatusIcon
                variant={variant}
                size="md"
                icon={
                  isZero
                    ? ({ className }) => (
                        <svg
                          className={className}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      )
                    : undefined
                }
              />
              <Text variant="body" weight="medium" color={variant}>
                {status}
              </Text>
            </div>

            {/* Conteúdo */}
            <div className="space-y-1">
              <Text variant="body" weight="semibold">
                {alerta.insumo.nome}
              </Text>
              <Text variant="body-sm" color="muted">
                Quantidade atual: {alerta.quantidade_total} {alerta.insumo.unidade_medida}
              </Text>
              <Text variant="body-sm" color="muted">
                Mínimo recomendado: {alerta.insumo.estoque_minimo_alerta}{' '}
                {alerta.insumo.unidade_medida}
              </Text>

              {alerta.lotes_vencendo && alerta.lotes_vencendo.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Text variant="body-sm" weight="medium" color="warning">
                    Lotes próximos ao vencimento:
                  </Text>
                  <div className="space-y-1">
                    {alerta.lotes_vencendo.map((lote) => (
                      <div key={lote.id} className="flex items-center justify-between">
                        <Text variant="body-sm" color="muted">
                          {lote.quantidade_restante} {alerta.insumo.unidade_medida}
                        </Text>
                        <Badge variant="warning">
                          Vence em{' '}
                          {format(new Date(lote.data_validade), 'dd/MM/yyyy', { locale: ptBR })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Badge de porcentagem */}
            <Badge variant={variant} className="absolute right-4 top-4">
              {percentual.toFixed(0)}%
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}
