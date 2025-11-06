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
      try {
        const { data, error } = (await supabase
          .from('produtos_finais')
          .select('*')
          .eq('id', params.id)
          .single()) as { data: ProdutoFinal | null; error: Error | null };

        if (error) throw error;

        if (!data) {
          router.push('/dashboard/producao/produtos');
          return;
        }

        setProduto(data);
      } catch (err) {
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
      <h1 className="text-3xl font-bold mb-6">Editar Produto</h1>
      <ProdutoForm produto={produto} />
    </div>
  );
}
