'use client';

import CustomizacaoTab from '../CustomizacaoTab';
import PageHeader from '@/components/ui/PageHeader';
import { Sliders, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function CustomizacaoPage() {
  const { profile } = useAuth();
  const roleStr = String(profile?.role ?? '');
  const isExpress = roleStr === 'express' || roleStr === 'pdv_simples' || roleStr === 'pdv';

  if (isExpress) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="font-bold text-base">Acesso Restrito às Configurações de Tema</h3>
              <p className="text-xs mt-1 text-amber-800 dark:text-amber-300">
                O perfil <strong>Express / PDV Operador</strong> não tem permissão para alterar as regras de aparência e temas visuais do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <PageHeader
        title="Customização do Sistema 🎨 "
        description="Configure todas as cores e elementos visuais do sistema. Suas mudanças afetam toda a interface."
        icon={Sliders}
      />
      <CustomizacaoTab />
    </div>
  );
}
