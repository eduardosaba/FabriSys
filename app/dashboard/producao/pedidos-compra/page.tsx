'use client';

import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import InsumoSelector from '@/components/insumos/InsumoSelector';
import Button from '@/components/Button';
import { useCallback, useEffect, useState } from 'react';
import { Insumo } from '@/lib/types/insumos';
import { useToast } from '@/hooks/useToast';
import Panel from '@/components/ui/Panel';
import Badge from '@/components/ui/Badge';
import { PedidoCompraDetalhado } from '@/lib/types/pedidos';
import { PedidoCompraDetalhadoArraySchema } from '@/lib/validations/pedidos';
import Modal from '@/components/Modal';
import { useRouter } from 'next/navigation';

interface ItemPedido {
  insumo: Insumo;
  quantidade: number;
}

export default function PedidosCompraPage() {
  const router = useRouter();
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  // estado de loading local removido (uso apenas salvando)
  const [salvando, setSalvando] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoCompraDetalhado[]>([]);
  const [editando, setEditando] = useState<PedidoCompraDetalhado | null>(null);
  const [observacoesEdicao, setObservacoesEdicao] = useState<string>('');
  const { toast } = useToast();

  // Adicionar item ao pedido
  const adicionarItem = (insumo: Insumo, quantidade: number) => {
    setItensPedido((prev) => {
      // Verifica se o item já existe
      const itemExistente = prev.find((item) => item.insumo.id === insumo.id);
      if (itemExistente) {
        // Atualiza a quantidade se já existe
        return prev.map((item) =>
          item.insumo.id === insumo.id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      }
      // Adiciona novo item se não existe
      return [...prev, { insumo, quantidade }];
    });
  };

  // Remover item do pedido
  const removerItem = (insumoId: string) => {
    setItensPedido((prev) => prev.filter((item) => item.insumo.id !== insumoId));
  };

  // Atualizar quantidade de um item
  const atualizarQuantidade = (insumoId: string, novaQuantidade: number) => {
    setItensPedido((prev) =>
      prev.map((item) =>
        item.insumo.id === insumoId ? { ...item, quantidade: novaQuantidade } : item
      )
    );
  };

  // Calcular valor total do pedido
  const valorTotal = itensPedido.reduce(
    (total, item) => total + item.quantidade * (item.insumo.ultimo_valor || 0),
    0
  );

  // Salvar Ordem de Compra
  const salvarOrdem = async () => {
    if (itensPedido.length === 0) {
      toast({ title: 'Adicione itens à ordem', variant: 'warning' });
      return;
    }
    try {
      setSalvando(true);
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: itensPedido }),
      });
      if (!response.ok) throw new Error('Erro ao salvar ordem');
      toast({
        title: 'Ordem salva',
        description: 'Você pode gerar o PDF na listagem abaixo.',
        variant: 'success',
      });
      setItensPedido([]);
      await carregarPedidos();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar ordem', variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

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
            : 'Erro ao listar ordens';
        throw new Error(msg);
      }
      const parsed = PedidoCompraDetalhadoArraySchema.parse(raw);
      setPedidos(parsed);
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Text variant="h3" weight="semibold">
          Ordem de Compra
        </Text>
        <div className="flex gap-2">
          <Button onClick={salvarOrdem} disabled={itensPedido.length === 0 || salvando}>
            {salvando ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setItensPedido([])}
            disabled={itensPedido.length === 0}
          >
            Limpar Pedido
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seletor de Insumos */}
        <Card className="p-4">
          <Text variant="h4" weight="medium" className="mb-4">
            Adicionar Insumos
          </Text>
          <InsumoSelector onSelect={(insumo, quantidade) => adicionarItem(insumo, quantidade)} />
        </Card>

        {/* Lista de Itens do Pedido */}
        <Card className="p-4">
          <Text variant="h4" weight="medium" className="mb-4">
            Itens do Pedido
          </Text>
          {itensPedido.length === 0 ? (
            <Text className="text-gray-500">Nenhum item adicionado ao pedido</Text>
          ) : (
            <div className="space-y-4">
              {itensPedido.map((item) => (
                <div
                  key={item.insumo.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <Text weight="medium">{item.insumo.nome}</Text>
                    <Text className="text-sm text-gray-500">
                      Último valor:{' '}
                      {item.insumo.ultimo_valor
                        ? `R$ ${item.insumo.ultimo_valor.toFixed(2)}`
                        : 'N/A'}
                    </Text>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        className="px-2 py-1"
                        variant="secondary"
                        onClick={() =>
                          atualizarQuantidade(item.insumo.id, Math.max(0, item.quantidade - 1))
                        }
                      >
                        -
                      </Button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) =>
                          atualizarQuantidade(
                            item.insumo.id,
                            Math.max(1, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-16 text-center border rounded p-1"
                      />
                      <Button
                        className="px-2 py-1"
                        variant="secondary"
                        onClick={() => atualizarQuantidade(item.insumo.id, item.quantidade + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      className="px-3 py-1"
                      variant="secondary"
                      onClick={() => removerItem(item.insumo.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Text weight="medium">Valor Total Estimado:</Text>
                  <Text weight="bold">R$ {valorTotal.toFixed(2)}</Text>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      {/* Listagem de Ordens salvas */}
      <Panel>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Text variant="h3">Ordens de Compra</Text>
            <Badge variant="default">{pedidos.length}</Badge>
          </div>
          <Button variant="secondary" onClick={() => void carregarPedidos()}>
            Atualizar
          </Button>
        </div>
      </Panel>
      {pedidos.length === 0 ? (
        <Card className="p-4">
          <Text>Nenhuma ordem encontrada</Text>
        </Card>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <Card key={pedido.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text variant="h4">Ordem {String(pedido.numero ?? 0).padStart(5, '0')}</Text>
                  <Text className="text-sm text-gray-500">
                    Criado em: {new Date(pedido.created_at).toLocaleString('pt-BR')}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={pedido.status}
                    onChange={async (e) => {
                      const novo = e.target.value as
                        | 'pendente'
                        | 'aprovado'
                        | 'rejeitado'
                        | 'finalizado'
                        | 'enviado';
                      try {
                        const resp = await fetch('/api/pedidos', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: pedido.id, status: novo }),
                        });
                        if (!resp.ok) throw new Error('Erro ao atualizar status');
                        await carregarPedidos();
                      } catch (err) {
                        console.error(err);
                        alert('Não foi possível atualizar o status.');
                      }
                    }}
                  >
                    <option value="pendente">Em Aberto</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="rejeitado">Cancelado</option>
                  </select>
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
                      const confirmar = window.confirm(
                        'Tem certeza que deseja excluir esta ordem?'
                      );
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
                          headers: { 'Content-Type': 'application/json' },
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
                        alert('Erro ao gerar PDF');
                      }
                    }}
                  >
                    Baixar PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
