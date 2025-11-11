'use client';

import { useState, useMemo } from 'react';

export interface FilterOptions {
  searchFields?: string[];
  statusField?: string;
  statusOptions?: Array<{ value: string; label: string }>;
}

export interface UseTableFiltersReturn<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  filteredItems: T[];
  resultCount: number;
  totalCount: number;
}

export function useTableFilters<T>(
  items: T[],
  options: FilterOptions = {}
): UseTableFiltersReturn<T> {
  const {
    searchFields = ['nome', 'descricao'],
    statusField = 'ativo',
    statusOptions = [
      { value: 'todos', label: 'Todos os status' },
      { value: 'ativo', label: 'Ativos' },
      { value: 'inativo', label: 'Inativos' },
    ],
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de busca
      const matchesSearch =
        searchTerm === '' ||
        searchFields.some((field) => {
          const value = (item as any)[field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });

      // Filtro de status
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativo' && (item as any)[statusField]) ||
        (statusFilter === 'inativo' && !(item as any)[statusField]);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter, searchFields, statusField]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredItems,
    resultCount: filteredItems.length,
    totalCount: items.length,
  };
}
