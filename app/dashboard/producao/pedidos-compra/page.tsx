'use client';

import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import InsumoSelector from '@/components/insumos/InsumoSelector';
import Button from '@/components/Button';
import { useState } from 'react';
import { Insumo } from '@/lib/types/insumos';
import { useRouter } from 'next/navigation';
import { PedidoCompra } from '@/lib/types/pedidos';

interface ItemPedido {
  insumo: Insumo;
  quantidade: number;
}

export default function PedidosCompraPage() {
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Gerar PDF do pedido
  const gerarPDF = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/pdf/pedido-compra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itens: itensPedido }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      window.open(url, '_blank');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      window.alert('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      window.alert('Erro ao gerar PDF: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Text variant="h3" weight="semibold">
          Pedido de Compra
        </Text>
        <div className="flex gap-2">
          <Button onClick={gerarPDF} disabled={itensPedido.length === 0 || loading}>
            {loading ? 'Gerando PDF...' : 'Gerar PDF'}
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
          <InsumoSelector onSelect={(insumo) => adicionarItem(insumo, 1)} />
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
    </div>
  );
}
