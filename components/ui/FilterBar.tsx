'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import { CalendarIcon, Download, Filter } from 'lucide-react';

interface DateRange {
  start: Date;
  end: Date;
}

interface FilterBarProps {
  onFilterChange: (filters: {
    dateRange: DateRange;
    productType?: string;
    comparison?: 'previous_period' | 'previous_year' | 'none';
  }) => void;
  onExport?: () => void;
}

const productTypes = ['Todos os Produtos', 'Produto 1', 'Produto 2', 'Produto 3'];

const comparisonOptions = [
  { value: 'none', label: 'Sem Comparação' },
  { value: 'previous_period', label: 'Período Anterior' },
  { value: 'previous_year', label: 'Ano Anterior' },
];

export default function FilterBar({ onFilterChange, onExport }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('Todos os Produtos');
  const [selectedComparison, setSelectedComparison] = useState<string>('none');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Último mês
    end: new Date(),
  });

  const handleFilterChange = () => {
    onFilterChange({
      dateRange,
      productType: selectedProduct === 'Todos os Produtos' ? undefined : selectedProduct,
      comparison: selectedComparison as 'previous_period' | 'previous_year' | 'none',
    });
    setIsOpen(false);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </span>
          </div>
        </div>

        {onExport && (
          <Button variant="secondary" onClick={onExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: new Date(e.target.value) }))
                }
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: new Date(e.target.value) }))
                }
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Produto
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comparação
              </label>
              <select
                value={selectedComparison}
                onChange={(e) => setSelectedComparison(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                {comparisonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleFilterChange}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
