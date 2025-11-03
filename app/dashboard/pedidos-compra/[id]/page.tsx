'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import InsumoSelector from '@/components/insumos/InsumoSelector';
import { PedidoCompraDetalhado } from '@/lib/types/pedidos';
import { PedidoCompraDetalhadoSchema } from '@/lib/validations/pedidos';
import { Insumo } from '@/lib/types/insumos';
import { useToast } from '@/hooks/useToast';

type InsumoMin = Pick<Insumo, 'id' | 'nome' | 'unidade_medida'> & { ultimo_valor?: number | null };
type ItemEdicao = {
  insumo: InsumoMin;
  quantidade: number;
};

export default function EditarPedidoCompraPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [pedido, setPedido] = useState<PedidoCompraDetalhado | null>(null);
  const [itens, setItens] = useState<ItemEdicao[]>([]);
  const [observacoes, setObservacoes] = useState('');

  const carregar = useCallback(async () => {
    try {
      const resp = await fetch(`/api/pedidos?id=${params.id}`);
      const raw = (await resp.json()) as unknown;
      if (!resp.ok) {
        const msg =
          raw &&
          typeof raw === 'object' &&
          raw !== null &&
          'error' in raw &&
          typeof (raw as { error?: unknown }).error === 'string'
            ? (raw as { error: string }).error
            : 'Erro ao carregar ordem';
        throw new Error(msg);
      }
      const data = PedidoCompraDetalhadoSchema.parse(raw);
      setPedido(data);
      setObservacoes(data.observacoes ?? '');
      const itensMap: ItemEdicao[] = (data.itens_pedido_compra || []).map(
        (i: { insumo: InsumoMin; quantidade: number }) => ({
          insumo: i.insumo,
          quantidade: Number(i.quantidade) || 0,
        })
      );
      setItens(itensMap);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao carregar ordem', variant: 'error' });
    } finally {
      setCarregando(false);
    }
  }, [params.id, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const valorTotal = useMemo(
    () => itens.reduce((t, it) => t + (it.quantidade || 0) * (it.insumo.ultimo_valor || 0), 0),
    [itens]
  );

  const adicionarItem = (insumo: Insumo, quantidade: number) => {
    setItens((prev) => {
      const idx = prev.findIndex((i) => i.insumo.id === insumo.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + quantidade };
        return novo;
      }
      return [...prev, { insumo, quantidade }];
    });
  };

  const atualizarQuantidade = (insumoId: string, qtd: number) => {
    setItens((prev) => prev.map((i) => (i.insumo.id === insumoId ? { ...i, quantidade: qtd } : i)));
  };

  const removerItem = (insumoId: string) => {
    setItens((prev) => prev.filter((i) => i.insumo.id !== insumoId));
  };

  const salvar = async () => {
    if (!pedido) return;
    try {
      setSalvando(true);
      const resp = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedido.id,
          observacoes,
          itens: itens.map((it) => ({
            insumo: { id: it.insumo.id, ultimo_valor: it.insumo.ultimo_valor ?? 0 },
            quantidade: it.quantidade,
          })),
        }),
      });
      const raw = (await resp.json().catch(() => ({}))) as unknown;
      if (!resp.ok) {
        const msg =
          raw &&
          typeof raw === 'object' &&
          raw !== null &&
          'error' in raw &&
          typeof (raw as { error?: unknown }).error === 'string'
            ? (raw as { error: string }).error
            : 'Erro ao salvar';
        throw new Error(msg);
      }
      toast({ title: 'Ordem atualizada', variant: 'success' });
      router.push('/dashboard/pedidos-compra/list');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar ordem', variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <Text>Carregando...</Text>;
  }
  if (!pedido) {
    return (
      <div className="space-y-4">
        <Text>Ordem não encontrada</Text>
        <Button variant="secondary" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Text variant="h3">Editar Ordem {String(pedido.numero ?? 0).padStart(5, '0')}</Text>
          <Text className="text-sm text-gray-500">
            Criado em: {new Date(pedido.created_at).toLocaleString('pt-BR')}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <Text variant="h4" className="mb-3">
            Adicionar Insumos
          </Text>
          <InsumoSelector onSelect={adicionarItem} />
        </Card>

        <Card className="p-4">
          <Text variant="h4" className="mb-3">
            Itens da Ordem
          </Text>
          {itens.length === 0 ? (
            <Text className="text-gray-500">Nenhum item</Text>
          ) : (
            <div className="space-y-3">
              {itens.map((it) => (
                <div
                  key={it.insumo.id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div>
                    <Text weight="medium">{it.insumo.nome}</Text>
                    <Text className="text-sm text-gray-500">
                      Último valor:{' '}
                      {it.insumo.ultimo_valor ? `R$ ${it.insumo.ultimo_valor.toFixed(2)}` : 'N/A'}
                    </Text>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="px-2 py-1"
                        onClick={() =>
                          atualizarQuantidade(it.insumo.id, Math.max(1, (it.quantidade || 0) - 1))
                        }
                      >
                        -
                      </Button>
                      <input
                        type="number"
                        min={1}
                        value={it.quantidade}
                        onChange={(e) =>
                          atualizarQuantidade(
                            it.insumo.id,
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-20 text-center border rounded p-1"
                      />
                      <Button
                        variant="secondary"
                        className="px-2 py-1"
                        onClick={() => atualizarQuantidade(it.insumo.id, (it.quantidade || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button variant="secondary" onClick={() => removerItem(it.insumo.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t flex items-center justify-between">
                <Text weight="medium">Valor Total Estimado:</Text>
                <Text weight="bold">R$ {valorTotal.toFixed(2)}</Text>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Panel>
        <div className="space-y-2">
          <Text variant="h4">Observações</Text>
          <textarea
            className="w-full border rounded p-2 min-h-[120px]"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
      </Panel>
    </div>
  );
}
