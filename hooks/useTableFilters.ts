'use client';

import { useState, useMemo } from 'react';

export interface FilterOptions {
  searchFields?: string[];
  statusField?: string;
  statusOptions?: Array<{ value: string; label: string }>;
  itemsPerPage?: number;
  enablePagination?: boolean;
}

export interface UseTableFiltersReturn<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  filteredItems: T[];
  paginatedItems: T[];
  resultCount: number;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
}

export function useTableFilters<T>(
  items: T[],
  options: FilterOptions = {}
): UseTableFiltersReturn<T> {
  const {
    searchFields = ['nome', 'descricao'],
    statusField = 'ativo',
    itemsPerPage: initialItemsPerPage = 10,
    enablePagination = true,
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de busca
      const matchesSearch =
        searchTerm === '' ||
        searchFields.some((field) => {
          const value = (item as Record<string, unknown>)[field];
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });

      // Filtro de status
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativo' && Boolean((item as Record<string, unknown>)[statusField])) ||
        (statusFilter === 'inativo' && !(item as Record<string, unknown>)[statusField]);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter, searchFields, statusField]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    if (!enablePagination) return filteredItems;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage, enablePagination]);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  return {
    searchTerm,
    setSearchTerm: (term: string) => {
      setSearchTerm(term);
      resetPage();
    },
    statusFilter,
    setStatusFilter: (filter: string) => {
      setStatusFilter(filter);
      resetPage();
    },
    filteredItems,
    paginatedItems,
    resultCount: filteredItems.length,
    totalCount: items.length,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage: (items: number) => {
      setItemsPerPage(items);
      resetPage();
    },
  };
}
