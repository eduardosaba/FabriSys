'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Store, BarChart3, Lock, Package } from 'lucide-react';

export default function MobileQuickActionBar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  // Barra fixa mobile exclusiva para perfil express
  const userRole = (profile?.role ?? '') as string;

  if (!profile || userRole !== 'express') {
    return null;
  }

  const items = [
    {
      id: 'auditoria',
      label: 'Auditoria',
      href: '/dashboard/acerto-diario/auditoria',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: 'lancar',
      label: 'Novo Romaneio',
      href: '/dashboard/acerto-diario',
      icon: <Store className="h-5 w-5" />,
      exact: true,
    },
    {
      id: 'fechamento',
      label: 'Fechamento',
      href: '/dashboard/acerto-diario/fechamento',
      icon: <Lock className="h-5 w-5" />,
    },
    {
      id: 'produtos',
      label: 'Produtos',
      href: '/dashboard/producao/produtos',
      icon: <Package className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-primary/20 px-2 py-1.5 shadow-2xl backdrop-blur-md"
      style={{ backgroundColor: 'var(--secondary)', color: 'var(--text)' }}
    >
      <nav className="flex items-center justify-around gap-1">
        {items.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'text-[var(--text)] opacity-80 hover:opacity-100 hover:bg-black/5'
              }`}
            >
              <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
