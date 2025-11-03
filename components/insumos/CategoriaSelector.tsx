'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Categoria } from '@/lib/types/insumos';
import { useToast } from '@/hooks/useToast';

interface Props {
  value?: string;
  onChange: (categoriaId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CategoriaSelector({
  value,
  onChange,
  required,
  disabled,
  className,
}: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  async function fetchCategorias() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('categorias').select('*').order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      toast({
        title: 'Erro ao carregar categorias',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      required={required}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm 
        focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100
        ${className || ''}`}
    >
      <option value="">Selecione uma categoria</option>
      {categorias.map((categoria) => (
        <option key={categoria.id} value={categoria.id}>
          {categoria.nome}
        </option>
      ))}
    </select>
  );
}
