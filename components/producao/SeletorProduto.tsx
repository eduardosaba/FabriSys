'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Button from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { cn } from '@/lib/utils';

interface SeletorProdutoProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function SeletorProduto({ value, onChange }: SeletorProdutoProps) {
  const [open, setOpen] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoFinal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadProdutos();
  }, []);

  async function loadProdutos() {
    try {
      const { data, error } = await supabase
        .from('produtos_finais')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      setProdutos(data || []);
    } catch (err) {
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Não foi possível carregar a lista de produtos.',
        variant: 'error',
      });
    }
  }

  const selectedProduct = produtos.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? selectedProduct?.nome : 'Selecione um produto...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Procurar produto..." />
          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
          <CommandGroup>
            {produtos.map((produto) => (
              <CommandItem
                key={produto.id}
                onSelect={() => {
                  onChange(produto.id === value ? '' : produto.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', value === produto.id ? 'opacity-100' : 'opacity-0')}
                />
                {produto.nome}
                {produto.codigo_interno && (
                  <span className="ml-2 text-sm text-gray-500">
                    (Cód: {produto.codigo_interno})
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
