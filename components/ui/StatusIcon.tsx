'use client';

import { SVGProps } from 'react';

type StatusIconVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type StatusIconSize = 'sm' | 'md' | 'lg';

const DefaultIcon = ({ className }: SVGProps<SVGSVGElement>) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface StatusIconProps {
  variant?: StatusIconVariant;
  size?: StatusIconSize;
  className?: string;
  icon?: (props: SVGProps<SVGSVGElement>) => React.ReactNode;
}

export default function StatusIcon({ 
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon
}: StatusIconProps) {
  const baseStyles = 'flex items-center justify-center rounded-full';

  const variantStyles = {
    default: 'bg-foreground/10 text-foreground/60',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    info: 'bg-primary/10 text-primary dark:bg-primary/20'
  };

  const sizeStyles = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const IconComponent = Icon || DefaultIcon;

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      <IconComponent className={iconSizes[size]} />
    </div>
  );
}