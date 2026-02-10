'use client';

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
// Usamos um tipo local para evitar dependência direta do shape do DB aqui
type SelectCategoria = { id: string; nome: string };

interface Props {
  value?: string;
  onChange: (categoriaId: string) => void;
  required?: boolean;
  className?: string;
}

export default function CategoriaSelector({ value, onChange, required, className }: Props) {
  const { profile, loading: authLoading } = useAuth();
  const [categorias, setCategorias] = useState<SelectCategoria[]>([]);

  const fetchCategorias = useCallback(async () => {
    if (authLoading) return;
    if (!profile) {
      setCategorias([]);
      return;
    }

    try {
      let query = supabase.from('categorias').select('id, nome').order('nome');
      query = query.eq('organization_id', profile.organization_id);
      const { data, error } = await query;
      if (error) throw error;
      const normalized = ((data as { id?: number | string; nome?: string }[] | null) || []).map(
        (r, idx) => ({ id: String(r?.id ?? `cat-${idx}`), nome: String(r?.nome ?? '') })
      );
      setCategorias(normalized);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setCategorias([]);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  const handleFocus = () => {
    if (categorias.length === 0 && !authLoading && profile) {
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
