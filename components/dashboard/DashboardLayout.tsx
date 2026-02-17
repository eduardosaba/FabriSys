'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import { Card } from './Card'; // Seu novo Card atualizado
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { WIDGET_REGISTRY } from './index'; // Importa o registro central de widgets

import { WidgetConfig } from '@/lib/types/dashboard';

interface DashboardLayoutProps {
  // context define a chave única de salvamento (ex: dashboard_admin, dashboard_fabrica)
  context: 'principal' | 'producao' | string; 
  defaultLayout?: WidgetConfig[];
}

// Mapeamento de classes de Grid para o container do Draggable
const sizeClasses = {
  '1x1': 'col-span-1 row-span-1',
  '2x1': 'col-span-1 md:col-span-2 row-span-1', // Ocupa 2 colunas em telas médias+
  '1x2': 'col-span-1 row-span-2',
  '2x2': 'col-span-1 md:col-span-2 row-span-2',
  '4x1': 'col-span-1 md:col-span-4 row-span-1', // Linha inteira (ex: Financeiro)
};

export function DashboardLayout({
  context,
  defaultLayout = [],
}: DashboardLayoutProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultLayout);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 1. CARREGAR LAYOUT DO BANCO
  const loadLayout = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `dashboard_layout_${context}`)
        .maybeSingle();

      if (settings?.value) {
        const savedWidgets = settings.value as WidgetConfig[];
        
        // Validação de Segurança: Filtra widgets que não existem mais no código
        // Isso evita que o dashboard quebre se você deletar um arquivo de widget antigo
        const validWidgets = savedWidgets.filter(w => WIDGET_REGISTRY[w.type]);
        
        setWidgets(validWidgets.length > 0 ? validWidgets : defaultLayout);
      } else {
        // Se não tem nada salvo, usa o padrão
        setWidgets(defaultLayout);
      }
    } catch (error) {
      console.error('Erro ao carregar layout:', error);
      setWidgets(defaultLayout);
    } finally {
      setLoading(false);
    }
  }, [defaultLayout, context]);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  // 2. SALVAR LAYOUT NO BANCO
  const saveLayout = async (newLayout: WidgetConfig[]) => {
    try {
      // Upsert: Atualiza se existir, cria se não existir
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: `dashboard_layout_${context}`,
          value: newLayout,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível salvar a posição dos widgets.',
        variant: 'error',
      });
    }
  };

  // 3. GERENCIAR ARRASTAR E SOLTAR
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newWidgets = Array.from(widgets);
    const [reorderedWidget] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, reorderedWidget);

    // Atualiza a propriedade 'ordem' (útil se precisarmos ordenar no backend depois)
    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      ordem: index,
    }));

    setWidgets(updatedWidgets); // Atualiza UI instantaneamente
    void saveLayout(updatedWidgets); // Salva no banco em background
  };

  // 4. REMOVER WIDGET
  const removeWidget = (widgetId: string) => {
    const newWidgets = widgets.filter((w) => w.id !== widgetId);
    setWidgets(newWidgets);
    void saveLayout(newWidgets);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard" direction="horizontal">
        {(provided: DroppableProvided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // GRID MASTER: 4 Colunas no desktop para máxima flexibilidade
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20"
          >
            {widgets.map((widget, index) => {
              // Busca o componente no registro usando a chave (ex: 'admin-financial')
              const registryItem = WIDGET_REGISTRY[widget.type];
              
              // Se o widget não existe no registro, não renderiza (evita crash)
              if (!registryItem) return null;

              const WidgetComponent = registryItem.component;

              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "h-full min-h-[150px] transition-all duration-200", 
                        // Aplica a classe de tamanho baseada na config do widget
                        sizeClasses[widget.size || registryItem.defaultSize || '1x1'],
                        // Z-Index alto enquanto arrasta para passar por cima dos outros
                        snapshot.isDragging && "z-50 scale-[1.02]"
                      )}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      <Card
                        title={widget.title || registryItem.title}
                        size={widget.size}
                        theme={widget.theme}
                        isDragging={snapshot.isDragging}
                        dragHandleProps={provided.dragHandleProps}
                        onRemove={() => removeWidget(widget.id)}
                      >
                        {/* Passa as configurações para o componente interno */}
                        <WidgetComponent config={widget} />
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

// Skeleton para o carregamento inicial da página
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {/* Simula um card 4x1 (Financeiro) */}
      <div className="h-40 bg-slate-200 rounded-xl col-span-1 md:col-span-4"></div>
      
      {/* Simula cards variados */}
      <div className="h-64 bg-slate-200 rounded-xl col-span-1 md:col-span-2"></div>
      <div className="h-64 bg-slate-200 rounded-xl col-span-1"></div>
      <div className="h-64 bg-slate-200 rounded-xl col-span-1"></div>
    </div>
  );
}