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
import { Trash2, FileText, ShoppingCart } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

interface ItemPedido {
  insumo: Insumo;
  quantidade: number;
}

export default function PedidosCompraPage() {
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  // estado de loading local removido (uso apenas salvando)
  const [salvando, setSalvando] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoCompraDetalhado[]>([]);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordem de Compra"
        description="Gerencie pedidos de compra e acompanhe o status dos fornecedores"
        icon={ShoppingCart}
      >
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
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  className="flex items-center justify-between rounded border p-2"
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
                        className="w-16 rounded border p-1 text-center"
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

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <div className="relative">
                    <select
                      className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      aria-label={`Excluir pedido ${pedido.numero ?? 0}`}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-green-600 transition-colors duration-200 hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      aria-label={`Baixar PDF do pedido ${pedido.numero ?? 0}`}
                      title="Baixar PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
