'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '@/components/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import StatusIcon from '@/components/ui/StatusIcon';
import Panel from '@/components/ui/Panel';
import { PedidoCompraDetalhado } from '@/lib/types/pedidos';
import { PedidoCompraDetalhadoArraySchema } from '@/lib/validations/pedidos';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Modal';
import { useRouter } from 'next/navigation';

export default function PedidosCompraList() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoCompraDetalhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<
    'todos' | 'aberto' | 'finalizado' | 'cancelado' | 'rascunho'
  >('todos');
  const { toast } = useToast();
  const [editando, setEditando] = useState<PedidoCompraDetalhado | null>(null);
  const [observacoesEdicao, setObservacoesEdicao] = useState<string>('');

  const carregarPedidos = useCallback(async () => {
    try {
      const response = await fetch('/api/pedidos');
      const raw = (await response.json()) as unknown;
      if (!response.ok) {
        const msg =
          raw &&
          typeof raw === 'object' &&
          raw !== null &&
          'error' in raw &&
          typeof (raw as { error?: unknown }).error === 'string'
            ? (raw as { error: string }).error
            : 'Falha ao carregar';
        throw new Error(msg);
      }
      const parsed = PedidoCompraDetalhadoArraySchema.parse(raw);
      setPedidos(parsed);
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
    void carregarPedidos();
  }, [carregarPedidos]);

  const abrirEditar = (pedido: PedidoCompraDetalhado) => {
    setEditando(pedido);
    setObservacoesEdicao(pedido.observacoes ?? '');
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    try {
      const resp = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando.id, observacoes: observacoesEdicao }),
      });
      if (!resp.ok) throw new Error('Erro ao atualizar');
      setEditando(null);
      setObservacoesEdicao('');
      await carregarPedidos();
      toast({ title: 'Ordem atualizada', variant: 'success' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao atualizar ordem', variant: 'error' });
    }
  };

  function classificaStatus(
    status: PedidoCompraDetalhado['status']
  ): 'aberto' | 'finalizado' | 'cancelado' | 'rascunho' {
    if (status === 'finalizado') return 'finalizado';
    if (status === 'rejeitado') return 'cancelado';
    if ((status as string) === 'rascunho') return 'rascunho';
    return 'aberto';
  }

  const pedidosFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return pedidos;
    return pedidos.filter((p) => classificaStatus(p.status) === filtroStatus);
  }, [filtroStatus, pedidos]);

  if (carregando) {
    return <Text>Carregando pedidos...</Text>;
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Text variant="h3">Ordens de Compra</Text>
            <Badge variant="default">{pedidosFiltrados.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <FiltroStatus value={filtroStatus} onChange={setFiltroStatus} />
            <Button variant="secondary" onClick={() => void carregarPedidos()}>
              Atualizar
            </Button>
          </div>
        </div>
      </Panel>

      {pedidosFiltrados.length === 0 ? (
        <Card>
          <Text>
            {filtroStatus === 'todos'
              ? 'Nenhuma ordem encontrada'
              : 'Nenhuma ordem encontrada para o filtro selecionado'}
          </Text>
        </Card>
      ) : (
        pedidosFiltrados.map((pedido) => (
          <Card key={pedido.id}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <Text variant="h3">Ordem {String(pedido.numero ?? 0).padStart(5, '0')}</Text>
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
                          : pedido.status === 'aprovado' ||
                              pedido.status === 'pendente' ||
                              pedido.status === 'enviado'
                            ? 'info'
                            : 'default'
                    }
                  >
                    {pedido.status === 'finalizado'
                      ? 'Finalizado'
                      : pedido.status === 'rejeitado'
                        ? 'Cancelado'
                        : pedido.status === 'aprovado' ||
                            pedido.status === 'pendente' ||
                            pedido.status === 'enviado'
                          ? 'Em Aberto'
                          : pedido.status}
                  </Badge>
                </div>

                <Text variant="body" className="text-gray-500">
                  Criado em: {new Date(pedido.created_at).toLocaleString('pt-BR')}
                </Text>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/pedidos-compra/${pedido.id}`)}
                >
                  Editar Itens
                </Button>
                <Button variant="secondary" onClick={() => abrirEditar(pedido)}>
                  Editar Rápido
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const confirmar = window.confirm('Tem certeza que deseja excluir esta ordem?');
                    if (!confirmar) return;
                    try {
                      const resp = await fetch('/api/pedidos', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: pedido.id }),
                      });
                      if (!resp.ok && resp.status !== 204) throw new Error('Erro ao excluir');
                      await carregarPedidos();
                      toast({ title: 'Ordem excluída', variant: 'success' });
                    } catch (err) {
                      console.error(err);
                      toast({ title: 'Erro ao excluir ordem', variant: 'error' });
                    }
                  }}
                >
                  Excluir
                </Button>
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
                      a.download = `ordem-compra-${String(pedido.numero ?? 0).padStart(5, '0')}.pdf`;
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
              <Text variant="h4">Itens da Ordem</Text>
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
        ))
      )}

      {/* Modal de edição de observações */}
      <Modal
        isOpen={!!editando}
        onClose={() => setEditando(null)}
        title={
          editando
            ? `Editar Ordem ${String(editando.numero ?? 0).padStart(5, '0')}`
            : 'Editar Ordem'
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium">Observações</label>
          <textarea
            className="w-full border rounded p-2 min-h-[100px]"
            value={observacoesEdicao}
            onChange={(e) => setObservacoesEdicao(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FiltroStatus({
  value,
  onChange,
}: {
  value: 'todos' | 'aberto' | 'finalizado' | 'cancelado' | 'rascunho';
  onChange: (v: 'todos' | 'aberto' | 'finalizado' | 'cancelado' | 'rascunho') => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant={value === 'todos' ? 'primary' : 'outline'} onClick={() => onChange('todos')}>
        Todos
      </Button>
      <Button
        variant={value === 'aberto' ? 'primary' : 'outline'}
        onClick={() => onChange('aberto')}
      >
        Em Aberto
      </Button>
      <Button
        variant={value === 'finalizado' ? 'primary' : 'outline'}
        onClick={() => onChange('finalizado')}
      >
        Finalizado
      </Button>
      <Button
        variant={value === 'cancelado' ? 'primary' : 'outline'}
        onClick={() => onChange('cancelado')}
      >
        Cancelado
      </Button>
      <Button
        variant={value === 'rascunho' ? 'primary' : 'outline'}
        onClick={() => onChange('rascunho')}
      >
        Rascunho
      </Button>
    </div>
  );
}
