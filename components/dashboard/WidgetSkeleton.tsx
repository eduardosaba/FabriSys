'use client';

import { cn } from '@/lib/utils';

type SkeletonVariant = 'default' | 'metric' | 'graph' | 'list' | 'table';

interface WidgetSkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

export default function WidgetSkeleton({ variant = 'default', className }: WidgetSkeletonProps) {
  return (
    <div className={cn("w-full h-full animate-pulse flex flex-col", className)}>
      
      {/* HEADER (Título) - Comum a todos */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="h-5 w-1/3 bg-slate-200 rounded-md" />
        <div className="h-4 w-4 bg-slate-100 rounded-full" /> {/* Ícone/Ação */}
      </div>

      {/* CONTEÚDO VARIÁVEL */}
      <div className="flex-1 min-h-0">
        
        {/* VARIANTE: MÉTRICA (Ex: Faturamento, Ticket Médio) */}
        {variant === 'metric' && (
          <div className="h-full flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-slate-100" /> {/* Ícone */}
              <div className="h-5 w-12 rounded-full bg-slate-100" /> {/* Badge % */}
            </div>
            <div className="h-8 w-2/3 bg-slate-200 rounded-lg mb-2" /> {/* Valor Grande */}
            <div className="h-3 w-1/2 bg-slate-100 rounded" /> {/* Subtítulo */}
          </div>
        )}

        {/* VARIANTE: GRÁFICO (Ex: Vendas) */}
        {variant === 'graph' && (
          <div className="h-full flex flex-col justify-end gap-2">
            <div className="flex items-end justify-between h-full gap-2 px-1 pb-1">
              <div className="w-full bg-slate-100 rounded-t-sm h-[30%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[50%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[70%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[40%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[60%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[80%]" />
              <div className="w-full bg-slate-100 rounded-t-sm h-[45%]" />
            </div>
            <div className="h-3 w-full bg-slate-50 rounded-full" /> {/* Eixo X */}
          </div>
        )}

        {/* VARIANTE: LISTA (Ex: Estoque, Fila Produção) */}
        {variant === 'list' && (
          <div className="h-full flex flex-col gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-slate-100 shrink-0" /> {/* Ícone/Avatar */}
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="h-2 w-1/2 bg-slate-50 rounded" />
                </div>
                <div className="h-4 w-10 bg-slate-100 rounded shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* VARIANTE: PADRÃO (Texto genérico) */}
        {variant === 'default' && (
          <div className="space-y-3">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/6" />
            <div className="h-20 bg-slate-50 rounded-lg w-full mt-4" />
          </div>
        )}

      </div>
    </div>
  );
}