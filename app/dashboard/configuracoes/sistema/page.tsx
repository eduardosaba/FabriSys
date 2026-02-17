"use client";

import SistemaTab from '../SistemaTab';
import PageHeader from '@/components/ui/PageHeader';
import { Settings } from 'lucide-react';

export default function SistemaPage() {
  return (
    <div className="p-4">
      <PageHeader
        title="Sistema e Regras"
        description="Configurações gerais e regras do sistema"
        icon={Settings}
      />
      <SistemaTab />
    </div>
  );
}
