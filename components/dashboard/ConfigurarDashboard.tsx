'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import Button from '@/components/Button';
import { Settings } from 'lucide-react';
import { WidgetConfig, WidgetType, WidgetSize, WidgetTheme } from '@/lib/types/dashboard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface ConfigurarDashboardProps {
  widgets: WidgetConfig[];
  onAddWidget: (widget: Omit<WidgetConfig, 'id' | 'ordem'>) => void;
}

const tiposWidget = [
  { value: 'producao', label: 'Status de Produção' },
  { value: 'alertas', label: 'Alertas' },
  { value: 'kpis', label: 'Indicadores (KPIs)' },
  { value: 'grafico-producao', label: 'Gráfico de Produção' },
  { value: 'ranking-produtos', label: 'Ranking de Produtos' },
  { value: 'avaliacao', label: 'Avaliação do Sistema' },
];

export function ConfigurarDashboard({ widgets, onAddWidget }: ConfigurarDashboardProps) {
  const [open, setOpen] = useState(false);
  const [novoWidget, setNovoWidget] = useState<{
    title: string;
    type: WidgetType;
    size: WidgetSize;
    theme: WidgetTheme;
    config: {
      periodo: 'dia' | 'semana' | 'mes' | 'ano';
      limite: number;
      atualizacaoAutomatica: boolean;
      intervaloAtualizacao: number;
      exibirLegenda: boolean;
      alertasSonoros: boolean;
      destacarValores: boolean;
    };
  }>({
    title: '',
    type: '' as WidgetType,
    size: '1x1' as WidgetSize,
    theme: 'default' as WidgetTheme,
    config: {
      periodo: 'dia',
      limite: 5,
      atualizacaoAutomatica: true,
      intervaloAtualizacao: 300,
      exibirLegenda: true,
      alertasSonoros: false,
      destacarValores: true,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWidget(novoWidget);
    setNovoWidget({
      title: '',
      type: '' as WidgetType,
      size: '1x1' as WidgetSize,
      theme: 'default' as WidgetTheme,
      config: {
        periodo: 'dia',
        limite: 5,
        atualizacaoAutomatica: true,
        intervaloAtualizacao: 300,
        exibirLegenda: true,
        alertasSonoros: false,
        destacarValores: true,
      },
    });
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings className="w-4 h-4 mr-2" />
        Configurar Dashboard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Configurar Dashboard"
          description="Adicione e configure widgets para personalizar seu dashboard."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Widget</label>
              <Select
                value={novoWidget.type}
                onChange={(e) =>
                  setNovoWidget((prev) => ({
                    ...prev,
                    type: e.target.value as WidgetType,
                  }))
                }
                required
              >
                <option value="">Selecione um tipo</option>
                {tiposWidget.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input
                value={novoWidget.title}
                onChange={(e) =>
                  setNovoWidget((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Ex: Produção Diária"
                required
              />
            </div>

            {(novoWidget.type === 'grafico-producao' || novoWidget.type === 'ranking-produtos') && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Período</label>
                  <Select
                    value={novoWidget.config.periodo}
                    onChange={(e) =>
                      setNovoWidget((prev) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          periodo: e.target.value as 'dia' | 'semana' | 'mes' | 'ano',
                        },
                      }))
                    }
                  >
                    <option value="dia">Diário</option>
                    <option value="semana">Semanal</option>
                    <option value="mes">Mensal</option>
                    <option value="ano">Anual</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Limite de Itens</label>
                  <Input
                    type="number"
                    value={novoWidget.config.limite}
                    onChange={(e) =>
                      setNovoWidget((prev) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          limite: parseInt(e.target.value),
                        },
                      }))
                    }
                    min={1}
                    max={20}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Widget</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
