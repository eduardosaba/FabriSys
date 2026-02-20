'use client';
import { useAuth } from '@/lib/auth';
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
  const { profile, loading: authLoading } = useAuth();

  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ordem, setOrdem] = useState<OrdemDetail | null>(null);
  const [statusEditValue, setStatusEditValue] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Extraimos o ID para uma variável estável
  const idOrdem = params?.id ? String(params.id) : null;

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.organization_id) return;

    if (!idOrdem) return;

    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ordens_producao')
          .select(
            'id, numero_op, quantidade_prevista, status, data_prevista, custo_previsto, created_at, produto_final_id'
          )
          .eq('id', idOrdem)
          .single();

        if (error) throw error;

        const prodId = data.produto_final_id;
        let produtoObj = null;
        if (prodId) {
          const { data: p } = await supabase
            .from('produtos_finais')
            .select('id, nome')
            .eq('id', prodId)
            .maybeSingle();
          if (p) produtoObj = p;
        }

        setOrdem({
          ...data,
          produto_final: produtoObj ? { nome: produtoObj.nome } : null,
        } as OrdemDetail);
        setStatusEditValue(data.status || '');
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

  const saveStatus = async () => {
    if (!idOrdem || !ordem) return;
    try {
      setSavingStatus(true);
      const { error } = await supabase
        .from('ordens_producao')
        .update({ status: statusEditValue })
        .eq('id', idOrdem);
      if (error) throw error;
      setOrdem({ ...ordem, status: statusEditValue });
      toast({
        title: 'Status atualizado',
        description: 'Status da ordem atualizado com sucesso.',
        variant: 'success',
      });
    } catch (e: any) {
      console.error('Erro ao atualizar status:', e);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'error',
      });
    } finally {
      setSavingStatus(false);
    }
  };

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

          <div className="flex items-center gap-2">
            <select
              value={statusEditValue}
              onChange={(e) => setStatusEditValue(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
              aria-label="Status da ordem"
            >
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em produção</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <Button onClick={saveStatus} loading={savingStatus}>
              Salvar
            </Button>
          </div>
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
            className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
              ordem.status === 'finalizada' || ordem.status === 'concluida'
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
