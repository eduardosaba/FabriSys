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
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
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
