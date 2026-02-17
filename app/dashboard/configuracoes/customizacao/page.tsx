"use client";

import CustomizacaoTab from '../CustomizacaoTab';
import PageHeader from '@/components/ui/PageHeader';
import { Sliders } from 'lucide-react';

export default function CustomizacaoPage() {
  return (
    <div className="p-4">
      <PageHeader
        title="Customização do Sistema 🎨 "
        description="Configure todas as cores e elementos visuais do sistema. Suas mudanças afetam toda a interface.
                : Personalize suas cores padrão que serão aplicadas em toda a interface do sistema"
        icon={Sliders}
      />
      <CustomizacaoTab />
    </div>
  );
}
