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
  const { profile, loading: authLoading } = useAuth();
  const [produto, setProduto] = useState<ProdutoFinal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduto = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

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
        console.error('Erro ao carregar produto:', err);
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

    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      return;
    }

    loadProduto().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, params.id, profile?.id]);

  if (loading || !produto) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Editar Produto</h1>
      <ProdutoForm produto={produto} />
    </div>
  );
}
