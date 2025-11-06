'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from './Header';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    title: 'MÓDULO 1 - CADASTROS BÁSICOS',
    href: '#',
    icon: '📝',
    isSection: true,
  },
  {
    title: 'Insumos',
    href: '/dashboard/insumos',
    icon: '📦',
  },
  {
    title: 'Lotes',
    href: '/dashboard/insumos/lotes',
    icon: '📥',
  },
  {
    title: 'Fornecedores',
    href: '/dashboard/fornecedores',
    icon: '🏭',
  },
  {
    title: 'MÓDULO 2 - PRODUÇÃO COMPLETA',
    href: '#',
    icon: '🏭',
    isSection: true,
  },
  {
    title: 'Dashboard Produção',
    href: '/dashboard/producao',
    icon: '📊',
  },
  {
    title: 'Produtos Finais',
    href: '/dashboard/producao/produtos',
    icon: '🍽️',
  },
  {
    title: 'Ordens de Produção',
    href: '/dashboard/producao/ordens',
    icon: '📋',
  },
  {
    title: 'Fichas Técnicas',
    href: '/dashboard/producao/fichas-tecnicas',
    icon: '📄',
  },
  {
    title: 'Relatórios',
    href: '/dashboard/producao/relatorios',
    icon: '📈',
  },
];

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar para mobile - overlay */}
      <div
        className={`fixed inset-0 bg-gray-800/60 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-white dark:bg-gray-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b px-4 dark:border-gray-700">
          <h1 className="text-xl font-bold">FabriSys</h1>
        </div>
        <nav className="space-y-1 px-2 py-4">
          {menuItems.map((item) => {
            if (item.isSection) {
              return (
                <div
                  key={item.href}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 first:mt-0 first:pt-0 first:border-t-0"
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.title}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-lg px-4 py-2 text-sm font-medium ml-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
