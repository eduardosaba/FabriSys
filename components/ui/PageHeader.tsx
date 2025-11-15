'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}

export default function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-800 overflow-x-auto">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
            <Icon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
