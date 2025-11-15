'use client';

import React, { Suspense, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/Button';
import AlertasEstoque from '@/components/insumos/AlertasEstoque';
import PedidoCompraForm from '@/components/insumos/PedidoCompraForm';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { AlertTriangle } from 'lucide-react';

export default function AlertasPage() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Central de Alertas"
        description="Acompanhe alertas de estoque mínimo e validade dos insumos"
        icon={AlertTriangle}
      >
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Novo Pedido de Compra
        </Button>
      </PageHeader>

      <Card variant="default" className="mb-6">
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
