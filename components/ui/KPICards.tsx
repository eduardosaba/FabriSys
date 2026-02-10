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
      <TrendingUp className="h-4 w-4 text-trend-positive" />
    ) : (
      <TrendingDown className="h-4 w-4 text-trend-negative" />
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
                <Text
                  className={`text-sm ${isTrendPositive ? 'text-trend-positive' : 'text-trend-negative'}`}
                >
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
        {icon && <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-2">{icon}</div>}
      </div>
    </Card>
  );
}

interface FinancialKPIs {
  lucro: number;
  vendas: number;
  custo: number;
  perdas: number;
}

interface ProductionKPIs {
  producaoTotal: number;
  eficiencia: number;
  produtividade: number;
  perdas: number;
}

interface KPISectionProps {
  kpis: FinancialKPIs | ProductionKPIs;
  isLoading?: boolean;
  type?: 'financial' | 'production';
}

export function KPISection({ kpis, isLoading = false, type = 'production' }: KPISectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="flex items-start justify-between p-4">
              <div className="flex-1">
                <div className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="mb-1 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-200 p-2 dark:bg-gray-700"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'financial') {
    const financialKPIs = kpis as FinancialKPIs;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Lucro Líquido"
          value={`R$ ${financialKPIs.lucro.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          variant="success"
          description="Lucro total do período"
        />
        <KPICard
          title="Vendas Totais"
          value={`R$ ${financialKPIs.vendas.toLocaleString()}`}
          icon={<Target className="h-5 w-5 text-blue-600" />}
          variant="default"
          description="Receita bruta"
        />
        <KPICard
          title="Custos"
          value={`R$ ${financialKPIs.custo.toLocaleString()}`}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          variant="danger"
          description="Custos operacionais"
        />
        <KPICard
          title="Perdas"
          value={`R$ ${financialKPIs.perdas.toLocaleString()}`}
          icon={<TrendingDown className="h-5 w-5 text-orange-600" />}
          variant="warning"
          description="Perdas registradas"
        />
      </div>
    );
  }

  // Default: production KPIs
  const productionKPIs = kpis as ProductionKPIs;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Produção Total"
        value={productionKPIs.producaoTotal.toLocaleString()}
        icon={<Target className="h-5 w-5 text-primary" />}
        description="Unidades produzidas"
      />
      <KPICard
        title="Eficiência"
        value={`${productionKPIs.eficiencia}%`}
        trend={2.5}
        icon={<Percent className="h-5 w-5 text-primary" />}
        variant="success"
        description="Meta: 85%"
      />
      <KPICard
        title="Produtividade"
        value={productionKPIs.produtividade.toFixed(2)}
        trend={-1.2}
        description="Unidades por hora"
        variant="warning"
      />
      <KPICard
        title="Perdas/Sobras"
        value={`${productionKPIs.perdas}%`}
        trend={0.8}
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        variant="danger"
        description="Meta: < 2%"
      />
    </div>
  );
}
