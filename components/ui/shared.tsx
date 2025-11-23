'use client';
import React from 'react';
import { Loader2, X } from 'lucide-react';

// --- BOTÃO ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'cancel' | 'camposNaoObrigatorios';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ElementType;
}

export const Button = ({
  children,
  className,
  disabled,
  variant = 'primary',
  size = 'md',
  loading,
  onClick,
  icon: Icon,
  ...props
}: ButtonProps) => {
  const baseStyles =
    'flex items-center justify-center rounded-lg transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed font-semibold';
  const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    // usar classes utilitárias que leem as variáveis de tema definidas em `globals.css`
    // primary: cor principal
    primary: 'btn-primary text-white shadow-md',
    // secondary: usa cor principal (padronizado)
    secondary: 'btn-primary',
    // cancel: botão de cancelar usa cor específica do tema
    cancel: 'btn-cancel',
    // danger: manter cor atual
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    // success: usa cor principal
    success: 'btn-primary shadow-md',
    // camposNaoObrigatorios: usa variável CSS definida no tema
    camposNaoObrigatorios:
      'bg-[var(--campos-nao-obrigatorios)] text-slate-800 hover:bg-[var(--campos-nao-obrigatorios)]/90 border border-transparent',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeMap[size || 'md']} ${variants[variant]} ${className || ''}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin mr-2" size={18} />
      ) : (
        Icon && <Icon size={18} className="mr-2" />
      )}
      {children}
    </button>
  );
};

// --- INPUT ---
interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: React.ReactNode;
  error?: boolean | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
}

export const InputField = ({
  label,
  error,
  prefix,
  suffix,
  className,
  ...props
}: InputFieldProps) => (
  <div className="w-full">
    {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-gray-500 text-sm">{prefix}</span>}
      <input
        className={`w-full rounded-lg border bg-white px-3 py-2 text-gray-900 outline-none transition-all 
          placeholder:text-gray-400 focus:ring-2 disabled:bg-gray-50
          ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-8' : ''}
          ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}
          ${className}
        `}
        {...props}
      />
      {suffix && <span className="absolute right-3 text-gray-500 text-sm">{suffix}</span>}
    </div>
  </div>
);

// --- SELECT ---
type SelectOption = { value: string; label: string };

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  options?: Array<string | SelectOption>;
  className?: string;
}

export const SelectField = ({
  label,
  options = [],
  className = '',
  ...props
}: SelectFieldProps) => (
  <div className="w-full">
    {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all ${className}`}
        {...props}
      >
        <option value="" disabled>
          Selecione...
        </option>
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
    </div>
  </div>
);

// --- BADGE STATUS ---
export const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ok: 'bg-green-100 text-green-700 border-green-200',
    alerta: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critico: 'bg-red-100 text-red-700 border-red-200',
    Rascunho: 'bg-gray-100 text-gray-600 border-gray-200',
    Enviado: 'bg-blue-100 text-blue-700 border-blue-200',
    Entregue: 'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.ok}`}
    >
      {status}
    </span>
  );
};

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, size = 'md', children }: ModalProps) => {
  if (!isOpen) return null;
  const desktopSizes: Record<string, string> = {
    sm: 'md:max-w-md',
    md: 'md:max-w-lg',
    lg: 'md:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={`
        relative w-full h-full bg-white shadow-2xl flex flex-col animate-zoom
        md:h-auto md:rounded-xl md:border md:border-gray-200
        ${desktopSizes[size]}
      `}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-slate-50 md:rounded-t-xl flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1.5 shadow-sm hover:shadow border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
