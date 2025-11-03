import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  label,
  children,
  variant = 'primary',
  loading,
  size = 'md',
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-primary text-white hover:bg-primary/90': variant === 'primary',
          'bg-secondary text-white hover:bg-secondary/90': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground':
            variant === 'outline',
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 py-2': size === 'md',
          'h-12 px-8': size === 'lg',
        },
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        (label ?? children)
      )}
    </button>
  );
}
