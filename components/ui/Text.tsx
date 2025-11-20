'use client';

import { ElementType, ReactNode } from 'react';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
type TextColor = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
  className?: string;
  children: ReactNode;
  as?: ElementType;
}

export default function Text({
  variant = 'body',
  weight = 'normal',
  color = 'default',
  className = '',
  children,
  as: Component = 'p',
  ...props
}: TextProps) {
  const variantStyles = {
    h1: 'text-4xl leading-tight',
    h2: 'text-3xl leading-tight',
    h3: 'text-2xl leading-snug',
    h4: 'text-xl leading-snug',
    body: 'text-base leading-relaxed',
    'body-sm': 'text-sm leading-relaxed',
    caption: 'text-xs leading-relaxed',
  };

  const weightStyles = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colorStyles = {
    default: 'text-foreground',
    muted: 'text-foreground/60',
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <Component
      className={`
        ${variantStyles[variant]}
        ${weightStyles[weight]}
        ${colorStyles[color]}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
}
