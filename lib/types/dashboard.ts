import {
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult,
} from '@hello-pangea/dnd';

export interface WidgetBaseProps {
  config?: WidgetConfig;
}

export type WidgetSize = '1x1' | '2x1' | '2x2' | '1x2';
export type WidgetTheme = 'default' | 'light' | 'dark' | 'colored';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  ordem: number;
  size?: WidgetSize;
  theme?: WidgetTheme;
  config?: {
    periodo?: 'dia' | 'semana' | 'mes' | 'ano';
    limite?: number;
    mostrarDetalhes?: boolean;
    produto_id?: string;
    categoria_id?: string;
    atualizacaoAutomatica?: boolean;
    intervaloAtualizacao?: number; // em segundos
    exibirLegenda?: boolean;
    alertasSonoros?: boolean;
    destacarValores?: boolean;
  };
}

export type WidgetType =
  | 'producao'
  | 'alertas'
  | 'kpis'
  | 'grafico-producao'
  | 'ranking-produtos'
  | 'avaliacao';

export interface DashboardContextType {
  widgets: WidgetConfig[];
  addWidget: (widget: Omit<WidgetConfig, 'id' | 'ordem'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, config: Partial<WidgetConfig>) => void;
  moveWidget: (fromIndex: number, toIndex: number) => void;
}
