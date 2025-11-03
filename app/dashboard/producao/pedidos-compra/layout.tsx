import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedidos de Compra - Sistema Lari',
  description: 'Gerenciamento de pedidos de compra de insumos',
};

export default function PedidosCompraLayout({ children }: { children: React.ReactNode }) {
  return children;
}
