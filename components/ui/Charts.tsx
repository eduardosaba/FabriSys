'use client';

import { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface ChartProps {
  data: Record<string, string | number>[];
  type: 'bar' | 'line';
  series?: ChartSeries[];
  xAxisKey?: string;
  height?: number;
  className?: string;
  title?: string;
  loading?: boolean;
}

export default function Chart({
  data,
  type,
  series = [],
  xAxisKey = 'name',
  height = 300,
  className = '',
  title,
  loading,
}: ChartProps) {
  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    className,
  };

  // Se não houver séries definidas, tenta encontrar a primeira propriedade numérica
  const defaultSeries = useMemo(() => {
    if (series && series.length > 0) return series;

    if (!data || data.length === 0) return [];

    // Encontra a primeira propriedade numérica nos dados
    const firstItem = data[0];
    const numericKey = Object.keys(firstItem).find(
      (key) => key !== xAxisKey && typeof firstItem[key] === 'number'
    );

    if (!numericKey) return [];

    return [
      {
        dataKey: numericKey,
        name: numericKey,
        color: 'var(--color-1)',
      },
    ];
  }, [data, series, xAxisKey]);

  const content =
    type === 'bar' ? (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={12} />
          <YAxis stroke="#888888" fontSize={12} />
          <Tooltip />
          <Legend />
          {defaultSeries.map((s, index) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color || `var(--color-${index + 1})`}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    ) : (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={12} />
          <YAxis stroke="#888888" fontSize={12} />
          <Tooltip />
          <Legend />
          {defaultSeries.map((s, index) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color || `var(--color-${index + 1})`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      )}
      {content}
    </div>
  );
}
