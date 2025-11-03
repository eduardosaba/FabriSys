'use client';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import { TrendingUp, TrendingDown, AlertCircle, Target, Percent } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function KPICard({
  title,
  value,
  trend,
  icon,
  description,
  variant = 'default',
}: KPICardProps) {
  const isTrendPositive = trend && trend > 0;
  const trendIcon = trend ? (
    isTrendPositive ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  ) : null;

  return (
    <Card variant={variant} className="relative">
      <div className="flex items-start justify-between p-4">
        <div>
          <Text color="muted" className="mb-1 text-sm">
            {title}
          </Text>
          <div className="flex items-baseline gap-2">
            <Text variant="h3" weight="semibold">
              {value}
            </Text>
            {trend && (
              <div className="flex items-center gap-1">
                {trendIcon}
                <Text className={`text-sm ${isTrendPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend)}%
                </Text>
              </div>
            )}
          </div>
          {description && (
            <Text color="muted" className="mt-1 text-sm">
              {description}
            </Text>
          )}
        </div>
        {icon && <div className="p-2 bg-primary/10 rounded-lg dark:bg-primary/20">{icon}</div>}
      </div>
    </Card>
  );
}

interface KPISectionProps {
  kpis: {
    producaoTotal: number;
    eficiencia: number;
    produtividade: number;
    perdas: number;
  };
}

export function KPISection({ kpis }: KPISectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Produção Total"
        value={kpis.producaoTotal.toLocaleString()}
        icon={<Target className="h-5 w-5 text-primary" />}
        description="Unidades produzidas"
      />
      <KPICard
        title="Eficiência"
        value={`${kpis.eficiencia}%`}
        trend={2.5}
        icon={<Percent className="h-5 w-5 text-primary" />}
        variant="success"
        description="Meta: 85%"
      />
      <KPICard
        title="Produtividade"
        value={kpis.produtividade.toFixed(2)}
        trend={-1.2}
        description="Unidades por hora"
        variant="warning"
      />
      <KPICard
        title="Perdas/Sobras"
        value={`${kpis.perdas}%`}
        trend={0.8}
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        variant="danger"
        description="Meta: < 2%"
      />
    </div>
  );
}
