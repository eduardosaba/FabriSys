'use client';

import { ReactNode } from 'react';

type CardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  hover?: boolean;
  withProgress?: {
    value: number;
    max: number;
  };
  progress?: number;
  progressVariant?: CardVariant;
}

export default function Card({ 
  children, 
  variant = 'default', 
  className = '',
  hover = true,
  withProgress,
  progress,
  progressVariant
}: CardProps) {
  const baseStyles = `
    relative overflow-hidden rounded-lg border p-4
    ${hover ? 'transition-all duration-300 hover:shadow-lg' : ''}
  `;

  const variantStyles = {
    default: 'border-gray-200 bg-background dark:border-gray-700',
    success: 'border-green-500 bg-green-50 dark:border-green-500/30 dark:bg-green-900/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-900/20',
    danger: 'border-red-500 bg-red-50 dark:border-red-500/30 dark:bg-red-900/20',
    info: 'border-primary bg-primary/5 dark:border-primary/30 dark:bg-primary/20'
  };

  const progressColors = {
    default: 'bg-blue-500 dark:bg-blue-500',
    success: 'bg-green-500 dark:bg-green-500',
    warning: 'bg-yellow-500 dark:bg-yellow-500',
    danger: 'bg-red-500 dark:bg-red-500',
    info: 'bg-blue-500 dark:bg-blue-500'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {(withProgress || progress !== undefined) && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-200 dark:bg-gray-700">
          <div 
            className={`h-full transition-all duration-500 ease-out ${progressColors[progressVariant || variant]}`}
            style={{ width: `${Math.min(progress !== undefined ? progress : (withProgress ? (withProgress.value / withProgress.max) * 100 : 0), 100)}%` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}