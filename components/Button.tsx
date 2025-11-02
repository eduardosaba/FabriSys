import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  variant?: 'primary' | 'secondary';
};

export default function Button({ label, children, variant = 'primary', ...rest }: Props) {
  const baseClasses = 'inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium';
  
  const variantClasses = {
    primary: 'bg-foreground text-background',
    secondary: 'bg-transparent text-foreground',
  };

  return (
    <button
      {...rest}
      className={`${baseClasses} ${variantClasses[variant]} ${
        rest.className ?? ''
      }`}
    >
      {label ?? children}
    </button>
  );
}
