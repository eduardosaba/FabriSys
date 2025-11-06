import { cn } from '@/lib/utils';
import { Grip, X } from 'lucide-react';
import { ReactNode } from 'react';

import { WidgetSize, WidgetTheme } from '@/lib/types/dashboard';

interface WidgetProps {
  title: string;
  children: ReactNode;
  className?: string;
  onRemove?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  size?: WidgetSize;
  theme?: WidgetTheme;
}

export function Widget({
  title,
  children,
  className,
  onRemove,
  isDragging,
  dragHandleProps,
  theme,
  size,
}: WidgetProps) {
  const themeClasses = {
    default: 'bg-white',
    light: 'bg-gray-50',
    dark: 'bg-gray-800 text-white',
    colored: 'bg-blue-50',
  };

  const sizeClasses = {
    '1x1': 'col-span-1 row-span-1',
    '2x1': 'col-span-2 row-span-1',
    '1x2': 'col-span-1 row-span-2',
    '2x2': 'col-span-2 row-span-2',
  };

  return (
    <div
      className={cn(
        'rounded-lg shadow-sm border p-4',
        themeClasses[theme || 'default'],
        sizeClasses[size || '1x1'],
        isDragging && 'shadow-lg border-blue-500',
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
        className
      )}
      style={{
        height: size?.includes('2') ? '100%' : undefined,
      }}
    >
      <div
        className={cn(
          'flex items-center justify-between mb-4',
          theme === 'dark' && 'border-gray-700'
        )}
      >
        <div className="flex items-center gap-2">
          <div {...dragHandleProps}>
            <Grip
              className={cn(
                'w-4 h-4 cursor-grab',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}
            />
          </div>
          <h3 className="font-medium">{title}</h3>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className={cn(
              'hover:text-gray-600',
              theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
