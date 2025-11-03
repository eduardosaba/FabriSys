'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import StatusIcon from '@/components/ui/StatusIcon';
import Panel from '@/components/ui/Panel';
import { PedidoCompraDetalhado } from '@/lib/types/pedidos';
import { useToast } from '@/hooks/useToast';

export default function PedidosCompraList() {
  const [pedidos, setPedidos] = useState<PedidoCompraDetalhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { toast } = useToast();

  const carregarPedidos = useCallback(async () => {
    try {
      const response = await fetch('/api/pedidos');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setPedidos(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast({
        title: 'Erro ao carregar pedidos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'error',
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  if (carregando) {
    return <Text>Carregando pedidos...</Text>;
  }

  if (pedidos.length === 0) {
    return (
      <Card>
        <Text>Nenhum pedido encontrado</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pedidos.map((pedido) => (
        <Card key={pedido.id}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <Text variant="h3">Pedido #{pedido.id}</Text>
                <StatusIcon
                  variant={
                    pedido.status === 'finalizado'
                      ? 'success'
                      : pedido.status === 'rejeitado'
                        ? 'danger'
                        : pedido.status === 'aprovado'
                          ? 'warning'
                          : 'info'
                  }
                />
                <Badge
                  variant={
                    pedido.status === 'finalizado'
                      ? 'success'
                      : pedido.status === 'rejeitado'
                        ? 'danger'
                        : pedido.status === 'aprovado'
                          ? 'warning'
                          : 'default'
                  }
                >
                  {pedido.status}
                </Badge>
              </div>

              <Text variant="body" className="text-gray-500">
                Criado em: {new Date(pedido.created_at).toLocaleString('pt-BR')}
              </Text>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/pdf/pedido-compra`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        itens: pedido.itens_pedido_compra.map((item) => ({
                          insumo: item.insumo,
                          quantidade: item.quantidade,
                        })),
                      }),
                    });

                    if (!response.ok) throw new Error('Erro ao gerar PDF');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pedido-compra-${pedido.id}.pdf`;
                    a.click();
                  } catch (error) {
                    console.error('Erro ao baixar PDF:', error);
                    toast({
                      title: 'Erro ao baixar PDF',
                      description: error instanceof Error ? error.message : 'Erro desconhecido',
                      variant: 'error',
                    });
                  }
                }}
              >
                Baixar PDF
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  // TODO: Implementar envio por email
                }}
              >
                Enviar Email
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  // TODO: Implementar envio por WhatsApp
                }}
              >
                Enviar WhatsApp
              </Button>
            </div>
          </div>

          <Panel className="mt-4">
            <Text variant="h4">Itens do Pedido</Text>
            <div className="space-y-2">
              {pedido.itens_pedido_compra.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                >
                  <div>
                    <Text>{item.insumo.nome}</Text>
                    <Text className="text-sm text-gray-500">
                      {item.quantidade} {item.insumo.unidade_medida}
                    </Text>
                  </div>

                  <Text>R$ {(item.quantidade * (item.valor_unitario || 0)).toFixed(2)}</Text>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <Text variant="h4">Valor Total:</Text>
              <Text variant="h4">R$ {pedido.valor_total.toFixed(2)}</Text>
            </div>
          </Panel>

          {pedido.observacoes && (
            <Panel className="mt-4">
              <Text variant="h4">Observações</Text>
              <Text>{pedido.observacoes}</Text>
            </Panel>
          )}
        </Card>
      ))}
    </div>
  );
}
