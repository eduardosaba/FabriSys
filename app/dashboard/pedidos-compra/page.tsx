'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Button from '@/components/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Panel from '@/components/ui/Panel';
import { useToast } from '@/hooks/useToast';
import { Insumo } from '@/lib/types/insumos';
import PedidoCompraForm from '@/components/insumos/PedidoCompraForm';

type CartItem = { insumo: Insumo; quantidade: number };

export default function PedidosCompraPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [busca, setBusca] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [carregando, setCarregando] = useState(true);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      try {
        let query = supabase.from('insumos').select('*').limit(200);
        if (busca) query = query.ilike('nome', `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        if (ativo) setInsumos(data || []);
      } catch (e) {
        console.error('Erro ao carregar insumos', e);
        toast({ title: 'Erro ao listar insumos', variant: 'error' });
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [busca, supabase, toast]);

  const adicionarAoCarrinho = (insumo: Insumo, quantidade: number) => {
    if (!quantidade || quantidade <= 0) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.insumo.id === insumo.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + quantidade };
        return novo;
      }
      return [...prev, { insumo, quantidade }];
    });
    toast({ title: 'Item adicionado', description: insumo.nome, variant: 'success' });
  };

  const removerDoCarrinho = (id: string) => {
    setCart((prev) => prev.filter((i) => i.insumo.id !== id));
  };

  const total = useMemo(
    () =>
      cart.reduce(
        (acc, i) => acc + (i.insumo.ultimo_valor ? i.insumo.ultimo_valor * i.quantidade : 0),
        0
      ),
    [cart]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Text variant="h1">Pedidos de Compra</Text>
        <div className="flex gap-2">
          <Button variant={view === 'grid' ? 'primary' : 'outline'} onClick={() => setView('grid')}>
            Grade
          </Button>
          <Button variant={view === 'list' ? 'primary' : 'outline'} onClick={() => setView('list')}>
            Lista
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: busca + catálogo */}
        <div className="lg:col-span-2 space-y-4">
          <Panel>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar insumo pelo nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              <Button variant="secondary" onClick={() => setBusca('')}>
                Limpar
              </Button>
            </div>
          </Panel>

          {carregando ? (
            <Card className="p-6">
              <Text>Carregando insumos...</Text>
            </Card>
          ) : insumos.length === 0 ? (
            <Card className="p-6">
              <Text className="text-gray-500">Nenhum insumo encontrado</Text>
            </Card>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {insumos.map((insumo) => (
                <InsumoCard key={insumo.id} insumo={insumo} onAdd={adicionarAoCarrinho} />
              ))}
            </div>
          ) : (
            <Card className="p-0 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Nome</th>
                    <th className="text-left px-4 py-2">Unidade</th>
                    <th className="text-left px-4 py-2">Último Valor</th>
                    <th className="text-left px-4 py-2">Qtd</th>
                    <th className="text-right px-4 py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((insumo) => (
                    <InsumoListRow key={insumo.id} insumo={insumo} onAdd={adicionarAoCarrinho} />
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {/* Coluna direita: carrinho */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Text variant="h3">Carrinho</Text>
              <Text className="text-sm text-gray-500">{cart.length} itens</Text>
            </div>

            {cart.length === 0 ? (
              <Text className="text-gray-500 italic">Nenhum item adicionado</Text>
            ) : (
              <div className="space-y-3">
                {cart.map((ci) => (
                  <div key={ci.insumo.id} className="flex items-center justify-between">
                    <div>
                      <Text>{ci.insumo.nome}</Text>
                      <Text className="text-sm text-gray-500">
                        {ci.quantidade} {ci.insumo.unidade_medida}
                      </Text>
                    </div>
                    <div className="flex items-center gap-3">
                      {ci.insumo.ultimo_valor && (
                        <Text className="text-sm">
                          R$ {(ci.insumo.ultimo_valor * ci.quantidade).toFixed(2)}
                        </Text>
                      )}
                      <Button variant="secondary" onClick={() => removerDoCarrinho(ci.insumo.id)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <Text variant="h4">Total</Text>
                  <Text variant="h4">R$ {total.toFixed(2)}</Text>
                </div>
              </div>
            )}
          </Card>

          {cart.length > 0 && (
            <Panel>
              <PedidoCompraForm
                itens={cart.map((c) => ({ insumo: c.insumo, quantidade: c.quantidade }))}
                onSuccess={() => {
                  setCart([]);
                  toast({ title: 'Pedido enviado com sucesso', variant: 'success' });
                }}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function InsumoCard({
  insumo,
  onAdd,
}: {
  insumo: Insumo;
  onAdd: (insumo: Insumo, quantidade: number) => void;
}) {
  const [qtd, setQtd] = useState(1);
  return (
    <Card className="p-4 space-y-3">
      <div>
        <Text variant="h4">{insumo.nome}</Text>
        <Text className="text-sm text-gray-500">
          Unidade: {insumo.unidade_medida}
          {insumo.ultimo_valor ? ` • Último valor: R$ ${insumo.ultimo_valor.toFixed(2)}` : ''}
        </Text>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={qtd}
          onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))}
          className="w-24 p-2 border rounded-md"
        />
        <Button variant="primary" onClick={() => onAdd(insumo, qtd)}>
          Adicionar
        </Button>
      </div>
    </Card>
  );
}

function InsumoListRow({
  insumo,
  onAdd,
}: {
  insumo: Insumo;
  onAdd: (insumo: Insumo, quantidade: number) => void;
}) {
  const [qtd, setQtd] = useState(1);
  return (
    <tr className="border-t">
      <td className="px-4 py-2">{insumo.nome}</td>
      <td className="px-4 py-2">{insumo.unidade_medida}</td>
      <td className="px-4 py-2">
        {insumo.ultimo_valor ? `R$ ${insumo.ultimo_valor.toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={1}
          value={qtd}
          onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))}
          className="w-20 p-1 border rounded-md"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <Button variant="primary" onClick={() => onAdd(insumo, qtd)}>
          Adicionar
        </Button>
      </td>
    </tr>
  );
}
