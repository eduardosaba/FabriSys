"use client";

import PermissoesTab from '../PermissoesTab';
import PageHeader from '@/components/ui/PageHeader';
import { Shield } from 'lucide-react';

export default function PermissoesPage() {
  return (
    <div className="p-4">
      <PageHeader
        title="Permissões"
        description="Controle de acessos por perfil e módulos do sistema"
        icon={Shield}
      />
      <PermissoesTab />
    </div>
  );
}
