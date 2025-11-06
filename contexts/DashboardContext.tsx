'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { WidgetConfig, DashboardContextType } from '@/lib/types/dashboard';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

const DashboardContext = createContext<DashboardContextType>({} as DashboardContextType);

export function DashboardProvider({
  children,
  defaultLayout = [],
}: {
  children: React.ReactNode;
  defaultLayout?: WidgetConfig[];
}) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultLayout);
  const { toast } = useToast();

  const saveLayout = async (newLayout: WidgetConfig[]) => {
    try {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'dashboard_layout',
        value: newLayout,
      });

      if (error) throw error;

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

  const addWidget = useCallback((widget: Omit<WidgetConfig, 'id' | 'ordem'>) => {
    setWidgets((prev) => {
      const newWidget: WidgetConfig = {
        ...widget,
        id: crypto.randomUUID(),
        ordem: prev.length,
      };
      const newLayout = [...prev, newWidget];
      void saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const newLayout = prev.filter((w) => w.id !== id);
      void saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const updateWidget = useCallback((id: string, config: Partial<WidgetConfig>) => {
    setWidgets((prev) => {
      const newLayout = prev.map((w) => (w.id === id ? { ...w, ...config } : w));
      void saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets((prev) => {
      const newWidgets = Array.from(prev);
      const [reorderedWidget] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, reorderedWidget);

      const updatedWidgets = newWidgets.map((widget, index) => ({
        ...widget,
        ordem: index,
      }));

      void saveLayout(updatedWidgets);
      return updatedWidgets;
    });
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        widgets,
        addWidget,
        removeWidget,
        updateWidget,
        moveWidget,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
