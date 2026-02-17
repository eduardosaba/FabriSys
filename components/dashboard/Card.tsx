import { cn } from '@/lib/utils';
import { Grip, X, MoreHorizontal } from 'lucide-react';
import { ReactNode } from 'react';
import { WidgetSize, WidgetTheme } from '@/lib/types/dashboard';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
  onRemove?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any; // Tipagem relaxada para aceitar props de lib de DND
  size?: WidgetSize;
  theme?: WidgetTheme;
  action?: ReactNode; // NOVO: Botões extras no cabeçalho
  loading?: boolean;  // NOVO: Estado de carregamento automático
}

export function Card({
  title,
  children,
  className,
  onRemove,
  isDragging,
  dragHandleProps,
  theme = 'default',
  size = '1x1',
  action,
  loading = false,
}: CardProps) {

  // Mapas de Estilo
  const themeClasses = {
    default: 'bg-white border-slate-200 text-slate-800',
    light: 'bg-slate-50 border-slate-200 text-slate-800',
    dark: 'bg-slate-900 border-slate-800 text-slate-100',
    colored: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 text-blue-900',
  };

  const sizeClasses = {
    '1x1': 'col-span-1 row-span-1',
    '2x1': 'col-span-1 md:col-span-2 row-span-1', // Responsivo
    '1x2': 'col-span-1 row-span-2',
    '2x2': 'col-span-1 md:col-span-2 row-span-2',
    '4x1': 'col-span-1 md:col-span-4 row-span-1', // Full width row
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border p-5 shadow-sm transition-all duration-200',
        'hover:shadow-md', // Elevação suave ao passar o mouse
        themeClasses[theme],
        sizeClasses[size],
        isDragging && 'shadow-xl ring-2 ring-blue-500/50 scale-[1.02] z-50 rotate-1', // Efeito "pegando" o card
        className
      )}
      style={{
        // Garante que o card ocupe a altura da grid se for maior que 1 linha
        minHeight: size.includes('x2') ? '320px' : 'auto', 
      }}
    >
      {/* --- CABEÇALHO DO CARD --- */}
      <div className="mb-4 flex items-center justify-between shrink-0 h-8">
        <div className="flex items-center gap-3 overflow-hidden">
          
          {/* Drag Handle: Só aparece no hover (group-hover) ou se estiver arrastando */}
          {dragHandleProps && (
            <div 
              {...dragHandleProps}
              className={cn(
                "cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-slate-100 transition-opacity duration-200",
                isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100", // "Clean UI" logic
                theme === 'dark' && "hover:bg-slate-800 text-slate-400"
              )}
            >
              <Grip className="h-4 w-4 text-slate-400" />
            </div>
          )}
          
          <h3 className="font-bold text-sm tracking-tight truncate" title={title}>
            {title}
          </h3>
        </div>

        {/* Ações (Direita) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Slot para ações customizadas do Widget */}
          {action && (
            <div className="mr-1">
              {action}
            </div>
          )}

          {/* Botão de Remover (se existir) */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evita ativar drag ao clicar
                onRemove();
              }}
              className={cn(
                "p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors",
                theme === 'dark' && "hover:bg-red-900/30 hover:text-red-400"
              )}
              title="Remover widget"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* --- CONTEÚDO --- */}
      <div className="flex-1 relative min-h-0 flex flex-col">
        {loading ? (
          <CardSkeleton />
        ) : (
          <div className="h-full w-full animate-in fade-in duration-500">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponente de Loading Simples e Elegante
function CardSkeleton() {
  return (
    <div className="h-full w-full flex flex-col gap-3 animate-pulse">
      <div className="h-8 w-1/3 bg-slate-100 rounded-md" />
      <div className="h-full w-full bg-slate-50 rounded-lg border border-slate-100 border-dashed" />
    </div>
  );
}