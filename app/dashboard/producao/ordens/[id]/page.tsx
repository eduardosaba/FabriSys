'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { useToast } from '@/hooks/useToast';

interface OrdemDetail {
  id: string;
  numero_op: string;
  // Simplificamos aqui: no estado final, queremos que seja um objeto único, não array
  produto_final: { nome: string } | null;
  quantidade_prevista: number;
  status: string;
  data_prevista: string;
  custo_previsto: number;
  created_at: string;
}

export default function OrdemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ordem, setOrdem] = useState<OrdemDetail | null>(null);

  // Extraimos o ID para uma variável estável
  const idOrdem = params?.id ? String(params.id) : null;

  useEffect(() => {
    if (!idOrdem) return;

    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ordens_producao')
          .select(
            `
            id,
            numero_op,
            quantidade_prevista,
            status,
            data_prevista,
            custo_previsto,
            created_at,
            produto_final:produtos_finais!inner(nome)
          `
          )
          .eq('id', idOrdem)
          .single();

        if (error) throw error;

        // Normalização dos dados
        const produtoData = data.produto_final;
        const produtoUnico = Array.isArray(produtoData) ? produtoData[0] : produtoData;

        setOrdem({
          ...data,
          produto_final: produtoUnico,
        } as OrdemDetail);
      } catch (err) {
        console.error('Erro ao carregar ordem:', err);
        // Removemos o toast daqui ou usamos useRef para evitar loop se o toast for instável
        // toast({ title: 'Não foi possível carregar a ordem', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    load();

    // CORREÇÃO: A dependência é APENAS o idOrdem.
    // Removemos 'toast' e 'params' inteiro.
  }, [idOrdem]);

  if (loading) return <Loading />;

  if (!ordem) {
    return (
      <div className="p-6 animate-fade-up">
        <PageHeader
          title="Ordem não encontrada"
          description="A ordem solicitada não foi localizada."
          icon={ArrowLeft}
        />
        <div className="mt-6">
          <Button onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-up">
      <PageHeader
        title={`OP #${ordem.numero_op}`}
        description={ordem.produto_final?.nome || 'Produto desconhecido'}
        icon={ArrowLeft}
      >
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" /> Voltar
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</h3>
          <div className="text-2xl font-bold text-slate-800">{ordem.quantidade_prevista} un</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Status</h3>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase
            ${
              ordem.status === 'concluida'
                ? 'bg-green-100 text-green-700'
                : ordem.status === 'pendente'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-slate-100 text-slate-700'
            }`}
          >
            {ordem.status.replace('_', ' ')}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Data Prevista</h3>
          <div className="text-lg font-bold text-slate-800">
            {new Date(ordem.data_prevista).toLocaleDateString('pt-BR')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Custo Estimado</h3>
          <div className="text-lg font-bold text-slate-800">
            {formatCurrency(ordem.custo_previsto)}
          </div>
        </div>
      </div>
    </div>
  );
}
