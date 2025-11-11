'use client';

import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin', 'fabrica', 'master']}>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 lg:ml-64 transition-all duration-300 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
