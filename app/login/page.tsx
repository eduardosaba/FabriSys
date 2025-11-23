'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Página /login redireciona para a raiz, onde o login centralizado está em `app/page.tsx`
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-600">Redirecionando para a página de login...</p>
    </div>
  );
}
