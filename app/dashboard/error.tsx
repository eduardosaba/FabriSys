'use client';

import { useEffect } from 'react';
import Button from '@/components/Button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro detectado:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={40} />
      </div>

      <h2 className="text-2xl font-bold text-slate-800">Ops! Algo deu errado.</h2>
      <p className="max-w-md text-slate-500">
        Ocorreu um erro inesperado na interface. Mas não se preocupe, seus dados estão seguros.
      </p>

      <div className="flex gap-3 mt-4">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RefreshCcw size={18} /> Tentar novamente
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Voltar ao Início
        </Button>
      </div>

      <p className="mt-10 text-[10px] uppercase tracking-widest text-slate-400">
        ID do Erro: {error.digest || 'Desconhecido'}
      </p>
    </div>
  );
}
