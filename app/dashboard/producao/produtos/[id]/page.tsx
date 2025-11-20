'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProdutoForm from '@/components/producao/ProdutoForm';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { ProdutoFinal } from '@/lib/types/producao';
import { useAuth } from '@/lib/auth';

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [produto, setProduto] = useState<ProdutoFinal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduto = async () => {
      console.log('=== DEBUG LOAD PRODUTO ===');
      console.log('ID do produto:', params.id);

      try {
        const { data, error } = (await supabase
          .from('produtos_finais')
          .select('*')
          .eq('id', params.id)
          .single()) as { data: ProdutoFinal | null; error: Error | null };

        console.log('Resposta do Supabase:', { data: data ? 'encontrado' : null, error });

        if (error) {
          console.error('Erro ao buscar produto:', error);
          throw error;
        }

        if (!data) {
          console.log('Produto não encontrado, redirecionando...');
          router.push('/dashboard/producao/produtos');
          return;
        }

        console.log('Produto encontrado:', data);
        setProduto(data);
      } catch (err) {
        console.error('Erro geral ao carregar produto:', err);
        toast({
          title: 'Erro ao carregar produto',
          description: 'Não foi possível carregar as informações do produto.',
          variant: 'error',
        });
        router.push('/dashboard/producao/produtos');
      } finally {
        setLoading(false);
      }
    };

    void loadProduto();
  }, [params.id, router, toast]);

  // Debug: mostrar role do usuário
  useEffect(() => {
    console.log('=== DEBUG ROLE USUÁRIO ===');
    console.log('Profile:', profile);
    console.log('Role:', profile?.role);
  }, [profile]);

  if (loading || !produto) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Editar Produto</h1>
      <ProdutoForm produto={produto} />
    </div>
  );
}
