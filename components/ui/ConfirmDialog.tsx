'use client';

import { Modal } from './shared';
import Button from '../Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  size = 'md',
}: ConfirmDialogProps) {
  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-red-600 hover:bg-red-700';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="p-2 space-y-4">
        {typeof message === 'string' ? (
          <div className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-line leading-relaxed">
            {message}
          </div>
        ) : (
          <div className="text-sm">{message}</div>
        )}

        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} className="w-full md:w-auto min-h-[44px]">
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full md:w-auto min-h-[44px] text-white font-bold ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
