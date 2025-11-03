'use client';

import React, { Suspense, useState } from 'react';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import Button from '@/components/Button';
import AlertasEstoque from '@/components/insumos/AlertasEstoque';
import PedidoCompraForm from '@/components/insumos/PedidoCompraForm';
import Modal from '@/components/Modal';

export default function AlertasPage() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Panel variant="default" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Text variant="h2" weight="semibold">
              Central de Alertas
            </Text>
            <Text variant="body" color="muted" className="mt-2">
              Acompanhe alertas de estoque mínimo e validade dos insumos
            </Text>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Novo Pedido de Compra
          </Button>
        </div>
      </Panel>

      <Card variant="default" className="mb-6">
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            }
          >
            <AlertasEstoque />
          </Suspense>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Novo Pedido de Compra">
        <div className="mt-4">
          <PedidoCompraForm itens={[]} />
        </div>
      </Modal>
    </>
  );
}
