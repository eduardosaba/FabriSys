import React from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'save' | 'cancel' | 'search';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Indica se o usuário é master admin (para aplicar cores customizadas) */
  isMaster?: boolean;
}

function BaseButton({
  label,
  children,
  variant = 'primary',
  loading,
  size = 'md',
  className,
  disabled,
  isMaster = false,
  ...rest
}: ButtonProps) {
  // Para master admin, obter cores específicas de botão quando disponíveis
  const getCustomButtonStyles = () => {
    if (!isMaster || typeof window === 'undefined') return null;

    const rootStyles = getComputedStyle(document.documentElement);

    switch (variant) {
      case 'save':
      case 'primary': {
        const saveColor = rootStyles.getPropertyValue('--botao-salvar').trim();
        const saveActiveColor = rootStyles.getPropertyValue('--botao-salvar-ativo').trim();
        if (saveColor && saveActiveColor) {
          return {
            backgroundColor: saveColor,
            '--hover-color': saveActiveColor,
          };
        }
        break;
      }
      case 'cancel': {
        const cancelColor = rootStyles.getPropertyValue('--botao-cancelar').trim();
        const cancelActiveColor = rootStyles.getPropertyValue('--botao-cancelar-ativo').trim();
        if (cancelColor && cancelActiveColor) {
          return {
            backgroundColor: cancelColor,
            '--hover-color': cancelActiveColor,
          };
        }
        break;
      }
      case 'search': {
        const searchColor = rootStyles.getPropertyValue('--botao-pesquisar').trim();
        const searchActiveColor = rootStyles.getPropertyValue('--botao-pesquisar-ativo').trim();
        if (searchColor && searchActiveColor) {
          return {
            backgroundColor: searchColor,
            '--hover-color': searchActiveColor,
          };
        }
        break;
      }
    }
    return null;
  };

  const customStyles = getCustomButtonStyles();
  const hasCustomStyles = customStyles !== null;

  return (
    <button
      disabled={loading || disabled}
      style={
        hasCustomStyles
          ? {
              ...customStyles,
              color: 'white',
              transition: 'background-color 0.2s',
            }
          : undefined
      }
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          // Estilos padrão (usados quando não há cores customizadas)
          'hover:bg-primary/90 bg-primary text-white': !hasCustomStyles && variant === 'primary',
          'hover:bg-secondary/90 bg-secondary text-white':
            !hasCustomStyles && variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700': !hasCustomStyles && variant === 'danger',
          'border-input hover:text-accent-foreground border bg-background hover:bg-accent':
            variant === 'outline',
          'hover:text-accent-foreground hover:bg-accent': variant === 'ghost',

          // Estilos customizados para master (quando há cores específicas definidas)
          'hover:opacity-90': hasCustomStyles,
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 py-2': size === 'md',
          'h-12 px-8': size === 'lg',
        },
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        (label ?? children)
      )}
    </button>
  );
}

// Componente principal que usa o hook useAuth
function Button(props: Omit<ButtonProps, 'isMaster'>) {
  const { user } = useAuth();
  const isMaster = user?.role === 'master';

  return <BaseButton {...props} isMaster={isMaster} />;
}

// Exporta ambos os componentes
export { Button, BaseButton };
export default Button;
