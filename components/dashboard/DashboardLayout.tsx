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
import { Card } from './Card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

import { WidgetConfig } from '@/lib/types/dashboard';

const DASHBOARD_STYLES = {
  container:
    'grid auto-rows-[minmax(250px,auto)] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-lg',
  widget: 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300',
  placeholder: 'h-64 bg-gray-200 rounded-lg animate-pulse',
};

interface DashboardLayoutProps {
  widgetComponents: Record<string, React.ComponentType<{ config?: WidgetConfig }>>;
  defaultLayout?: WidgetConfig[];
  context: 'principal' | 'producao'; // Adicionado para diferenciar dashboards
}

export function DashboardLayout({
  widgetComponents,
  defaultLayout = [],
  context,
}: DashboardLayoutProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultLayout);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadLayout = useCallback(async () => {
    try {
      setLoading(true);
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'dashboard_layout')
        .single();

      let widgets = defaultLayout;

      if (settings?.value) {
        widgets = settings.value as WidgetConfig[];
      }

      // Filtrar widgets com base no contexto
      const filteredWidgets = widgets.filter((widget) => {
        if (context === 'principal') {
          return ['kpi_mercadoria', 'kpi_producao', 'kpi_vendas', 'kpi_financeiro'].includes(
            widget.type
          );
        } else if (context === 'producao') {
          return ['kpi_producao', 'produtos_finais', 'status_producao'].includes(widget.type);
        }
        return false;
      });

      setWidgets(filteredWidgets);
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

  const saveLayout = async (newLayout: WidgetConfig[]) => {
    try {
      console.log('Iniciando salvamento do layout...');

      // Verificar se o registro já existe
      const { data: existingRecord, error: fetchError } = await supabase
        .from('system_settings')
        .select('id, key')
        .eq('key', `dashboard_layout_${context}`) // Contexto adicionado para diferenciar dashboards
        .single();

      console.log('Resultado da verificação:', { existingRecord, fetchError });

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Código para "registro não encontrado"
        console.error('Erro ao verificar existência do registro:', fetchError);
        throw fetchError;
      }

      if (existingRecord) {
        console.log('Registro existente encontrado, atualizando...');
        // Atualizar o registro existente
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({
            value: newLayout,
            updated_at: new Date().toISOString(),
          })
          .eq('key', `dashboard_layout_${context}`);

        if (updateError) {
          console.error('Erro ao atualizar registro:', updateError);
          throw updateError;
        }
      } else {
        console.log('Registro não encontrado, inserindo novo...');
        // Inserir um novo registro
        const { error: insertError } = await supabase.from('system_settings').insert({
          key: `dashboard_layout_${context}`,
          value: newLayout,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('Erro ao inserir novo registro:', insertError);
          throw insertError;
        }
      }

      toast({
        title: 'Layout salvo',
        description: 'As alterações foram salvas com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações do layout.',
        variant: 'error',
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newWidgets = Array.from(widgets);
    const [reorderedWidget] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, reorderedWidget);

    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      ordem: index,
    }));

    setWidgets(updatedWidgets);
    void saveLayout(updatedWidgets);
  };

  const removeWidget = (widgetId: string) => {
    const newWidgets = widgets.filter((w) => w.id !== widgetId);
    setWidgets(newWidgets);
    void saveLayout(newWidgets);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={DASHBOARD_STYLES.placeholder} // Aplicando o estilo centralizado
          />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard" direction="horizontal">
        {(provided: DroppableProvided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={DASHBOARD_STYLES.container} // Aplicando o estilo centralizado
          >
            {widgets.map((widget, index) => {
              const WidgetComponent = widgetComponents[widget.type];

              if (!WidgetComponent) return null;

              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={DASHBOARD_STYLES.widget} // Aplicando o estilo centralizado
                    >
                      <Card
                        title={widget.title}
                        isDragging={snapshot.isDragging}
                        dragHandleProps={provided.dragHandleProps || undefined}
                        onRemove={() => removeWidget(widget.id)}
                      >
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
