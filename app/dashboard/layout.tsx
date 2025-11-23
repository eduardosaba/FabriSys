'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';
import Footer from '@/components/ui/Footer';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard requiredRoles={['admin', 'fabrica', 'master', 'pdv']}>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Overlay Mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar isOpen={isSidebarOpen} />

        {/* Container Principal */}
        {/* lg:ml-64 compensa a sidebar fixa. flex-1 ocupa o resto. min-w-0 evita overflow flex. */}
        <div className="flex flex-1 flex-col min-h-screen min-w-0 transition-all duration-300 lg:ml-64">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

          {/* Área de scroll interna para o conteúdo + footer */}
          <div className="flex flex-col flex-1 w-full">
            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto animate-fade-up">
              {children}
            </main>

            {/* O Footer agora está dentro do fluxo com margem correta */}
            <Footer />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
