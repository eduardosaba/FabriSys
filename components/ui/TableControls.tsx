'use client';

import { Search, Filter } from 'lucide-react';
import { UseTableFiltersReturn } from '@/hooks/useTableFilters';

interface TableControlsProps<T> {
  // Interface antiga - objeto filters completo
  filters?: UseTableFiltersReturn<T>;
  // Interface nova - propriedades individuais
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  resultCount?: number;
  totalCount?: number;
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
  className?: string;
}

export default function TableControls<T>({
  filters,
  searchTerm: propSearchTerm,
  onSearchChange,
  statusFilter: propStatusFilter,
  onStatusChange,
  resultCount: propResultCount,
  totalCount: propTotalCount,
  searchPlaceholder = 'Buscar...',
  showStatusFilter = true,
  className = '',
}: TableControlsProps<T>) {
  // Usar propriedades do objeto filters se fornecido, senão usar as propriedades individuais
  const searchTerm = filters?.searchTerm ?? propSearchTerm ?? '';
  const setSearchTerm = filters?.setSearchTerm ?? onSearchChange ?? (() => {});
  const statusFilter = filters?.statusFilter ?? propStatusFilter ?? 'todos';
  const setStatusFilter = filters?.setStatusFilter ?? onStatusChange ?? (() => {});
  const resultCount = filters?.resultCount ?? propResultCount ?? 0;
  const totalCount = filters?.totalCount ?? propTotalCount ?? 0;

  return (
    <div className={`p-4 border-b border-gray-200 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Buscar itens"
          />
        </div>
        {showStatusFilter && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        )}
      </div>
      {(searchTerm || statusFilter !== 'todos') && (
        <div className="mt-2 text-sm text-gray-600">
          {resultCount} de {totalCount} itens
        </div>
      )}
    </div>
  );
}
