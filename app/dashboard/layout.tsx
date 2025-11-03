'use client';

import Sidebar from '@/components/ui/Sidebar';
import DashboardHeader from '@/components/ui/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 lg:ml-64 transition-all duration-300 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
