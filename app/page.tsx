'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Button from '@/components/Button';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [cards] = useState([
    { id: 1, title: 'Receita', value: 5000, type: 'positive' },
    { id: 2, title: 'Despesas', value: 3000, type: 'negative' },
    { id: 3, title: 'Perdas', value: 500, type: 'loss' },
  ]);

  const getCardColor = (type) => {
    switch (type) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      case 'loss':
        return 'bg-orange-500';
      default:
        return 'bg-gray-200';
    }
  };

  useEffect(() => {
    if (loading) return;

    if (user && profile) {
      // Redirecionar baseado no role
      switch (profile.role) {
        case 'admin':
        case 'fabrica':
          router.push('/dashboard');
          break;
        case 'pdv':
          router.push('/dashboard/pedidos-compra');
          break;
        default:
          router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Fallback - não deve chegar aqui
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <main className="flex flex-col items-center text-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
          Bem-vindo ao Sistema Lari
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Gerencie seus insumos, produção e pedidos de forma integrada e eficiente.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/login')}>Fazer Login</Button>
        </div>
      </main>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {cards.map((card) => (
          <div key={card.id} className={`p-4 rounded shadow text-white ${getCardColor(card.type)}`}>
            <h2 className="text-xl font-bold">{card.title}</h2>
            <p className="text-lg">R$ {card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
