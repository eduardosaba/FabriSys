import React from 'react';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import { AlertTriangle, Package, TrendingDown, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  product: string;
  message: string;
  quantity: number;
  threshold: number;
  daysUntilExpiry?: number;
}

const AlertasEstoque = () => {
  // Dados simulados de alertas baseados nos filtros
  const alerts: Alert[] = [
    {
      id: '1',
      type: 'critical',
      product: 'Farinha de Trigo',
      message: 'Estoque crítico - abaixo do mínimo',
      quantity: 15,
      threshold: 50,
    },
    {
      id: '2',
      type: 'warning',
      product: 'Açúcar Refinado',
      message: 'Estoque baixo',
      quantity: 75,
      threshold: 100,
    },
    {
      id: '3',
      type: 'info',
      product: 'Óleo de Soja',
      message: 'Vence em 7 dias',
      quantity: 200,
      threshold: 150,
      daysUntilExpiry: 7,
    },
    {
      id: '4',
      type: 'warning',
      product: 'Leite Condensado',
      message: 'Vence em 3 dias',
      quantity: 45,
      threshold: 60,
      daysUntilExpiry: 3,
    },
  ];

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <TrendingDown className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
            <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <Text variant="h4" weight="medium" className="text-green-800 dark:text-green-200">
              Nenhum alerta ativo
            </Text>
            <Text color="muted" className="text-green-600 dark:text-green-300">
              Todos os produtos estão com estoque adequado.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className={`p-4 ${getAlertColor(alert.type)} border`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <Text variant="h4" weight="medium" className="text-sm">
                  {alert.product}
                </Text>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/50 dark:bg-gray-800/50">
                  {alert.quantity} un
                </span>
              </div>
              <Text className="text-sm mb-2">{alert.message}</Text>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>Mínimo: {alert.threshold}</span>
                {alert.daysUntilExpiry && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.daysUntilExpiry} dias
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AlertasEstoque;
