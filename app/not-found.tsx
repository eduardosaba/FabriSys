'use client';

import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="p-6">
      <PageHeader
        title="Página não encontrada"
        description="Ops — esta página não existe."
        icon={AlertCircle}
      />

      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-6 text-center">
          <div className="mx-auto w-[260px]">
            <Image src="/404.png" alt="404" width={260} height={180} className="object-contain" />
          </div>

          <h3 className="text-lg font-bold text-slate-800">Hmm... não encontramos esta página</h3>
          <p className="text-slate-500">
            Verifique o link ou volte para a área principal do sistema.
          </p>

          <div className="flex items-center justify-center">
            <Link href="/dashboard">
              <Button>Voltar ao Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
