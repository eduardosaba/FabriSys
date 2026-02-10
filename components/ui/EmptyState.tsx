'use client';

import { FileText, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-data' | 'no-results';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export default function EmptyState({
  type,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const iconColor = type === 'no-data' ? 'text-blue-600' : 'text-gray-400';
  const bgColor = type === 'no-data' ? 'bg-blue-100' : 'bg-gray-100';

  return (
    <div className={`p-8 text-center ${className}`}>
      <div className={`mx-auto h-12 w-12 rounded-full ${bgColor} flex items-center justify-center`}>
        <div className={iconColor}>
          {action?.icon ||
            (type === 'no-data' ? (
              <FileText className="h-6 w-6" />
            ) : (
              <Search className="h-6 w-6" />
            ))}
        </div>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            aria-label={action.label}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
