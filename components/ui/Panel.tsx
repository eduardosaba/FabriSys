'use client';

import { ReactNode } from 'react';

type PanelVariant = 'default' | 'bordered' | 'flat';

interface PanelProps {
  variant?: PanelVariant;
  className?: string;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export default function Panel({
  variant = 'default',
  className = '',
  children,
  header,
  footer,
}: PanelProps) {
  const baseStyles = 'w-full';

  const variantStyles = {
    default: 'bg-background shadow-sm rounded',
    bordered: 'bg-background border border-gray-200 dark:border-gray-700 rounded',
    flat: 'bg-background/50',
  };

  const headerStyles = 'px-6 py-4 border-b border-gray-200 dark:border-gray-700';
  const bodyStyles = 'px-6 py-4';
  const footerStyles = 'px-6 py-4 border-t border-gray-200 dark:border-gray-700';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {header && <div className={headerStyles}>{header}</div>}
      <div className={bodyStyles}>{children}</div>
      {footer && <div className={footerStyles}>{footer}</div>}
    </div>
  );
}
