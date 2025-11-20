'use client';

import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';
import Footer from '@/components/ui/Footer';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin', 'fabrica', 'master', 'pdv']}>
      <div className="flex min-h-screen min-w-0 w-screen overflow-x-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col min-h-0 transition-all duration-300 lg:ml-64 w-full">
          <DashboardHeader />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <main className="flex-1 overflow-auto p-6 w-full">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
