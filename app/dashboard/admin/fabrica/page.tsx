'use client';

import PageHeader from '@/components/ui/PageHeader';
import GraficoPerdasEstoque from '@/app/dashboard/admin/GraficoPerdasEstoque';

export default function FabricaPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fábrica"
        description="Visão da produção, perdas e movimentações da fábrica"
        icon={undefined}
      />

      <div className="grid grid-cols-1 gap-6">
        <GraficoPerdasEstoque />
      </div>
    </div>
  );
}
