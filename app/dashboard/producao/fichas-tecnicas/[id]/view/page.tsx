'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

interface FichaRaw {
  produto_final_id: string;
  nome: string;
  preco_venda: number;
  rendimento_unidades?: number;
  slug?: string;
}

export default function ViewFichaTecnicaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [ficha, setFicha] = useState<FichaRaw | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchFicha() {
      setLoading(true);
      const resp = await supabase.from('fichas_tecnicas').select('*').eq('slug', id).single();
      const data = resp.data as unknown;
      const error = resp.error as unknown;
      if (error) {
        toast({ title: 'Erro ao carregar ficha técnica', variant: 'error' });
        router.push('/dashboard/producao/fichas-tecnicas');
        return;
      }
      setFicha(data as FichaRaw);
      setLoading(false);
    }
    if (id) void fetchFicha();
  }, [id, router]);

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!ficha) {
    return <div className="p-8 text-center">Ficha técnica não encontrada.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        className="mb-4 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        onClick={() => router.push('/dashboard/producao/fichas-tecnicas')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar para Fichas Técnicas</span>
      </button>
      <h1 className="text-2xl font-bold mb-4">Visualizar Ficha Técnica</h1>
      <div className="mb-4">
        <strong>Produto:</strong> {ficha.nome}
      </div>
      <div className="mb-4">
        <strong>Preço de venda:</strong> R$ {ficha.preco_venda?.toFixed(2)}
      </div>
      <div className="mb-4">
        <strong>Rendimento:</strong> {ficha.rendimento_unidades} unidades
      </div>
      {/* Adicione mais campos conforme necessário */}
      <button
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => router.push(`/dashboard/producao/fichas-tecnicas/${id}/edit`)}
      >
        Editar Ficha Técnica
      </button>
    </div>
  );
}
