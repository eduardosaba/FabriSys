'use client';

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration = 3000 } = options;

    switch (variant) {
      case 'success':
        sonnerToast.success(title, {
          description,
          duration,
        });
        break;
      case 'error':
        sonnerToast.error(title, {
          description,
          duration,
        });
        break;
      case 'warning':
        sonnerToast.warning(title, {
          description,
          duration,
        });
        break;
      case 'info':
        sonnerToast.info(title, {
          description,
          duration,
        });
        break;
      default:
        sonnerToast(title, {
          description,
          duration,
        });
    }
  };

  return {
    toast,
  };
}
