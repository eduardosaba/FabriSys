import { Metadata } from 'next';
import DashboardHeader from '@/components/ui/DashboardHeader';
import Panel from '@/components/ui/Panel';

export const metadata: Metadata = {
  title: 'Pedidos de Compra | Sistema Lari',
  description: 'Gerenciamento de pedidos de compra',
};

export default function PedidosCompraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Pedidos de Compra"
        description="Gerencie os pedidos de compra de insumos"
      />
      <main className="p-4">
        <Panel>{children}</Panel>
      </main>
    </div>
  );
}
