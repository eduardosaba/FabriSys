'use client';

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Usamos um tipo local para evitar dependência direta do shape do DB aqui
type SelectCategoria = { id: string; nome: string };

interface Props {
  value?: string;
  onChange: (categoriaId: string) => void;
  required?: boolean;
  className?: string;
}

export default function CategoriaSelector({ value, onChange, required, className }: Props) {
  const [categorias, setCategorias] = useState<SelectCategoria[]>([]);

  const fetchCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categorias').select('*').order('nome');
      if (error) throw error;
      const normalized = ((data as { id?: number | string; nome?: string }[] | null) || []).map(
        (r, idx) => ({ id: String(r?.id ?? `cat-${idx}`), nome: String(r?.nome ?? '') })
      );
      setCategorias(normalized);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  }, []);

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  const handleFocus = () => {
    if (categorias.length === 0) {
      void fetchCategorias();
    }
  };

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      required={required}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm 
        focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 sm:text-sm
        ${className || ''}`}
    >
      <option value="">Selecione uma categoria</option>
      {categorias.map((categoria, idx) => (
        <option key={String(categoria.id ?? `cat-${idx}`)} value={String(categoria.id ?? '')}>
          {categoria.nome}
        </option>
      ))}
    </select>
  );
}
