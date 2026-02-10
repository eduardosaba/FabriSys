'use client';

import { useRouter } from 'next/navigation';
import { Lock, AlertTriangle, CreditCard, Phone } from 'lucide-react';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import { useLicense } from '@/hooks/useLicense';
import { useEffect } from 'react';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { status, daysRemaining } = useLicense();
  const router = useRouter();

  useEffect(() => {
    // Caso queiramos forçar redirecionamento em certas condições, podemos usar router.push
    // Mas aqui preferimos mostrar a tela de bloqueio inline. Mantemos o hook para efeitos colaterais futuros.
  }, [status, daysRemaining, router]);

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // TELA DE BLOQUEIO: SUSPENSO
  if (status === 'suspended') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Suspenso</h1>
          <p className="text-slate-500 mb-6">
            Esta conta foi temporariamente suspensa pelo administrador. Entre em contato para
            regularizar o acesso.
          </p>
          <Button
            className="w-full justify-center"
            onClick={() => window.open('https://wa.me/55000000000', '_blank')}
          >
            <Phone size={18} className="mr-2" /> Falar com Suporte
          </Button>
        </div>
      </div>
    );
  }

  // TELA DE BLOQUEIO: VENCIDO
  if (status === 'expired') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-orange-100 max-w-md text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Licença Expirada</h1>
          <p className="text-slate-500 mb-6">
            Sua assinatura do Confectio venceu. Renove seu plano para continuar acessando os
            recursos do sistema.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full justify-center bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/dashboard/billing')}
            >
              <CreditCard size={18} className="mr-2" /> Renovar Agora
            </Button>
            <p className="text-xs text-slate-400">Dúvidas? Contate o suporte.</p>
          </div>
        </div>
      </div>
    );
  }

  // SE ESTIVER ATIVO: MOSTRA O SISTEMA
  return (
    <>
      {/* Aviso discreto se estiver vencendo em breve (< 5 dias) */}
      {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 5 && (
        <div className="bg-orange-500 text-white text-center text-xs py-1 font-bold px-4">
          Atenção: Sua licença expira em {daysRemaining} dias. Evite o bloqueio renovando hoje.
        </div>
      )}

      {children}
    </>
  );
}
