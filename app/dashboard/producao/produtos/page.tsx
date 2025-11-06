'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import ListaProdutos from '@/components/producao/ListaProdutos';
import Loading from '@/components/ui/Loading';

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<ProdutoFinal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase.from('produtos_finais').select('*').order('nome');

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      setProdutos(data || []);
    } catch (error) {
      console.error('Erro completo ao carregar produtos:', error);
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Ocorreu um erro ao carregar a lista de produtos.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProdutos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading)
    return (
      <Loading
        message="Carregando produtos..."
        showRetry={true}
        onRetry={() => {
          setLoading(true);
          void loadProdutos();
        }}
        overlay={true}
      />
    );

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Produto Final" description="Gerenciamento de produtos finais">
        <Button onClick={() => (window.location.href = '/dashboard/producao/produtos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto Final
        </Button>
      </PageHeader>

      <ListaProdutos produtos={produtos} onUpdate={loadProdutos} />
    </div>
  );
}
