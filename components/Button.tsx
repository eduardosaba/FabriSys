import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

export default function Button({ label, children, variant = 'primary', loading, ...rest }: Props) {
  const baseClasses = 'inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 disabled:bg-primary/50',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 disabled:bg-secondary/50',
  };

  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${
        rest.className ?? ''
      }`}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        label ?? children
      )}
    </button>
  );
}
