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
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
  showPaginationInfo?: boolean;
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
  currentPage: propCurrentPage,
  totalPages: propTotalPages,
  itemsPerPage: propItemsPerPage,
  searchPlaceholder = 'Buscar...',
  showStatusFilter = true,
  showPaginationInfo = true,
  className = '',
}: TableControlsProps<T>) {
  // Usar propriedades do objeto filters se fornecido, senão usar as propriedades individuais
  const searchTerm = filters?.searchTerm ?? propSearchTerm ?? '';
  const setSearchTerm = filters?.setSearchTerm ?? onSearchChange ?? (() => {});
  const statusFilter = filters?.statusFilter ?? propStatusFilter ?? 'todos';
  const setStatusFilter = filters?.setStatusFilter ?? onStatusChange ?? (() => {});
  const resultCount = filters?.resultCount ?? propResultCount ?? 0;
  const totalCount = filters?.totalCount ?? propTotalCount ?? 0;
  const currentPage = filters?.currentPage ?? propCurrentPage ?? 1;
  const totalPages = filters?.totalPages ?? propTotalPages ?? 1;
  const itemsPerPage = filters?.itemsPerPage ?? propItemsPerPage ?? 10;

  return (
    <div className={`border-b border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            aria-label="Buscar itens"
          />
        </div>
        {showStatusFilter && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
      {(searchTerm || statusFilter !== 'todos') && showPaginationInfo && (
        <div className="mt-2 text-sm text-gray-600">
          {resultCount} de {totalCount} itens
          {totalPages > 1 && (
            <span className="ml-2">
              • Página {currentPage} de {totalPages} ({itemsPerPage} por página)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
