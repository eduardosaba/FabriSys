'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import Button from '@/components/Button';
import { Settings, LayoutGrid, Palette, BarChart3, Activity } from 'lucide-react';
import { WidgetConfig, WidgetType, WidgetSize, WidgetTheme } from '@/lib/types/dashboard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

interface ConfigurarDashboardProps {
  widgets: WidgetConfig[];
  onAddWidget: (widget: Omit<WidgetConfig, 'id' | 'ordem'>) => void;
}

// Lista atualizada com os novos widgets que criamos
const categoriasWidgets = [
  {
    label: 'Estratégia & Análise',
    options: [
      { value: 'profit-margin', label: 'Margem de Lucro (Especial)' },
      { value: 'accounts-payable', label: 'Contas a Pagar' },
      { value: 'admin-financial', label: 'Resumo Financeiro (Cards)' },
      { value: 'sales-chart', label: 'Gráfico de Vendas' },
      { value: 'peak-hours', label: 'Horários de Pico (Gráfico)' }, // NOVO
      { value: 'ranking-produtos', label: 'Ranking de Produtos' }, // NOVO
      { value: 'kpis', label: 'Metas por Loja' },
    ]
  },
  {
    label: 'Operacional & Loja',
    options: [
      { value: 'caixa-status', label: 'Monitor de Caixas' },
      { value: 'pdv-status', label: 'Controle de Caixa' }, // NOVO
      { value: 'pdv-meta', label: 'Minha Meta Diária' }, // NOVO
    ]
  },
  {
    label: 'Estoque & Compras',
    options: [
      { value: 'inventory-value', label: 'Valor de Estoque ($)' }, // NOVO
      { value: 'purchase-orders', label: 'Pedidos de Compra' }, // NOVO
      { value: 'low-stock', label: 'Alertas de Estoque' },
      { value: 'producao', label: 'Fila de Produção' },
      { value: 'losses', label: 'Perdas e Quebras (Gráfico)' }, // NOVO
    ]
  }
];

const tamanhos: { value: WidgetSize; label: string; class: string }[] = [
  { value: '1x1', label: 'Pequeno', class: 'col-span-1 row-span-1' },
  { value: '2x1', label: 'Médio (Largo)', class: 'col-span-2 row-span-1' },
  { value: '1x2', label: 'Médio (Alto)', class: 'col-span-1 row-span-2' },
  { value: '2x2', label: 'Grande', class: 'col-span-2 row-span-2' },
];

const temas: { value: WidgetTheme; color: string }[] = [
  { value: 'default', color: 'bg-white border-slate-200' },
  { value: 'light', color: 'bg-slate-50 border-slate-200' },
  { value: 'dark', color: 'bg-slate-900 border-slate-800' },
  { value: 'colored', color: 'bg-blue-50 border-blue-100' },
];

export function ConfigurarDashboard({ widgets: _widgets, onAddWidget }: ConfigurarDashboardProps) {
  const [open, setOpen] = useState(false);
  const [novoWidget, setNovoWidget] = useState<{
    title: string;
    type: string; // string genérica para aceitar os tipos do select
    size: WidgetSize;
    theme: WidgetTheme;
    config: any;
  }>({
    title: '',
    type: '',
    size: '1x1',
    theme: 'default',
    config: {
      periodo: 'mes',
      limite: 5,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWidget({
      ...novoWidget,
      type: novoWidget.type as WidgetType,
    });
    
    // Reset form
    setNovoWidget({
      title: '',
      type: '',
      size: '1x1',
      theme: 'default',
      config: { periodo: 'mes', limite: 5 },
    });
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Settings size={16} />
        Personalizar Dashboard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Adicionar Novo Widget"
          description="Escolha o tipo de informação e a aparência do card."
          className="max-w-2xl" // Modal mais largo
        >
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COLUNA ESQUERDA: DADOS */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Activity size={16} /> Tipo de Informação
                  </label>
                  <Select
                    value={novoWidget.type}
                    onChange={(e) => setNovoWidget((prev) => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {categoriasWidgets.map((cat, idx) => (
                      <optgroup key={idx} label={cat.label}>
                        {cat.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Título do Card</label>
                  <Input
                    value={novoWidget.title}
                    onChange={(e) => setNovoWidget((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Minhas Vendas"
                    required
                  />
                </div>

                {/* Configurações Específicas (Condicionais) */}
                {(novoWidget.type.includes('chart') || novoWidget.type.includes('ranking')) && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase">Configurações do Gráfico</p>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Período</label>
                      <Select
                        value={novoWidget.config.periodo}
                        onChange={(e) => setNovoWidget(prev => ({...prev, config: {...prev.config, periodo: e.target.value}}))}
                      >
                        <option value="dia">Hoje</option>
                        <option value="semana">Últimos 7 dias</option>
                        <option value="mes">Este Mês</option>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: APARÊNCIA */}
              <div className="space-y-4">
                
                {/* Seletor de Tamanho Visual */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <LayoutGrid size={16} /> Tamanho
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {tamanhos.map((t) => (
                      <div
                        key={t.value}
                        onClick={() => setNovoWidget(prev => ({ ...prev, size: t.value }))}
                        className={cn(
                          "cursor-pointer border rounded-lg p-2 text-center transition-all hover:bg-slate-50",
                          novoWidget.size === t.value ? "ring-2 ring-blue-500 border-transparent bg-blue-50/50" : "border-slate-200"
                        )}
                      >
                        {/* Representação Visual do Grid */}
                        <div className="flex justify-center mb-1">
                          <div className={cn(
                            "bg-slate-300 rounded-sm",
                            t.value === '1x1' && "w-6 h-6",
                            t.value === '2x1' && "w-12 h-6",
                            t.value === '1x2' && "w-6 h-12",
                            t.value === '2x2' && "w-12 h-12",
                          )} />
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seletor de Tema Visual */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Palette size={16} /> Tema
                  </label>
                  <div className="flex gap-3">
                    {temas.map((t) => (
                      <div
                        key={t.value}
                        onClick={() => setNovoWidget(prev => ({ ...prev, theme: t.value }))}
                        className={cn(
                          "w-8 h-8 rounded-full cursor-pointer shadow-sm border-2 transition-transform hover:scale-110",
                          t.color,
                          novoWidget.theme === t.value ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent"
                        )}
                        title={t.value}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Adicionar Widget
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}