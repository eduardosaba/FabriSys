'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type CardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface CardProps {
  children: React.ReactNode;
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

function Card({
  children,
  variant = 'default',
  className = '',
  hover = true,
  withProgress,
  progress,
  progressVariant,
}: CardProps) {
  const progressColors = {
    default: 'bg-blue-500 dark:bg-blue-500',
    success: 'bg-green-500 dark:bg-green-500',
    warning: 'bg-yellow-500 dark:bg-yellow-500',
    danger: 'bg-red-500 dark:bg-red-500',
    info: 'bg-blue-500 dark:bg-blue-500',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4',
        hover && 'transition-all duration-300 hover:shadow-lg',
        {
          'border-gray-200 bg-background dark:border-gray-700': variant === 'default',
          'border-green-500 bg-green-50 dark:border-green-500/30 dark:bg-green-900/20':
            variant === 'success',
          'border-yellow-500 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-900/20':
            variant === 'warning',
          'border-red-500 bg-red-50 dark:border-red-500/30 dark:bg-red-900/20':
            variant === 'danger',
          'bg-primary/5 dark:border-primary/30 dark:bg-primary/20 border-primary':
            variant === 'info',
        },
        className
      )}
    >
      {(withProgress || progress !== undefined) && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              progressColors[progressVariant || variant]
            )}
            style={{
              width: `${Math.min(progress !== undefined ? progress : withProgress ? (withProgress.value / withProgress.max) * 100 : 0, 100)}%`,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
    {children}
  </div>
);
CardHeader.displayName = 'CardHeader';

const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props}>
    {children}
  </h3>
);
CardTitle.displayName = 'CardTitle';

const CardDescription = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-muted-foreground text-sm', className)} {...props}>
    {children}
  </p>
);
CardDescription.displayName = 'CardDescription';

const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
);
CardContent.displayName = 'CardContent';

const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
    {children}
  </div>
);
CardFooter.displayName = 'CardFooter';

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card };
export default Card;
