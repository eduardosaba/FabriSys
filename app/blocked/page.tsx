'use client';

import { Shield } from 'lucide-react';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BlockedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-xl border p-8 shadow-sm text-center max-w-xl">
        <Shield size={56} className="mx-auto text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Bloqueado</h1>
        <p className="text-slate-600 mb-4">
          Sua conta não tem permissão de acesso ao sistema no momento. Verifique sua licença ou
          entre em contato com o suporte.
        </p>

        <div className="flex justify-center gap-3 mt-4">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Voltar ao Dashboard
          </Button>
          <Button onClick={handleLogout}>Sair / Trocar Conta</Button>
        </div>
      </div>
    </div>
  );
}
