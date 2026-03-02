'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { PackageCheck, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/shared';

interface ItemCarga {
  id: string;
  quantidade_solicitada: number;
  produto: { id: string; nome: string } | null;
  ordem: { numero_op?: string; id?: string; produto?: { id: string; nome: string } } | null;
}

export default function RecebimentoPage() {
  const { profile } = useAuth();
  const [itens, setItens] = useState<ItemCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregarCargasEmTransito = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      // Buscar produto via relação ordem -> produtos_finais para garantir nome mesmo quando
      // distribuicao_pedidos não possuir produto_id direto
      const { data, error } = await supabase
        .from('distribuicao_pedidos')
        .select(
          `
          id,
          quantidade_solicitada,
          ordem:ordens_producao(numero_op, produto:produtos_finais(id, nome)),
          produto:produtos_finais(id, nome),
          local_origem_id
        `
        )
        .eq('status', 'enviado')
        .eq('local_destino_id', profile.local_id);

      if (error) throw error;
      setItens((data as any) || []);
    } catch (err) {
      toast.error('Erro ao carregar lista de recebimento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarCargasEmTransito();
  }, [profile?.local_id]);

  const confirmarRecebimento = async (item: ItemCarga) => {
    const toastId = toast.loading('Confirmando recebimento...');
    setProcessando(item.id);
    try {
      const produtoId = item.produto?.id || item.ordem?.produto?.id || null;
      const { data, error } = await supabase.rpc('receber_carga_pdv', {
        p_distribuicao_id: item.id,
        p_quantidade_recebida: item.quantidade_solicitada,
        p_local_destino_id: profile?.local_id,
        p_produto_id: produtoId,
      });

      if (error) throw error;
      if (data?.success) {
        toast.success(data.message, { id: toastId });
        setItens((prev) => prev.filter((i) => i.id !== item.id));
        // Tentar atualizar a OP associada para marcar como entregue (não-fatal)
        try {
          const ordemId = (item as any).ordem?.id || (item as any).ordem_id || null;
          if (ordemId) {
            const { error: updErr } = await supabase
              .from('ordens_producao')
              .update({ status_logistica: 'entregue', updated_at: new Date().toISOString() })
              .eq('id', ordemId);
            if (updErr)
              console.warn('Falha ao atualizar status_logistica da OP no recebimento:', updErr);
          }
        } catch (e) {
          console.warn('Erro não-fatal ao atualizar OP após recebimento:', e);
        }
      } else {
        toast.error(data?.message || 'Falha ao processar recebimento', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Falha ao processar: ' + (err?.message || String(err)), { id: toastId });
    } finally {
      setProcessando(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-up">
      <PageHeader
        title="Confirmar Recebimento"
        description="Confira os itens que chegaram da fábrica."
        icon={PackageCheck}
      />

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Truck size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">Nenhuma carga em trânsito para sua loja.</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-6">
          {itens.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <PackageCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {item.ordem?.produto?.nome || item.produto?.nome || 'Produto Indefinido'}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <AlertCircle size={14} /> OP: {item.ordem?.numero_op || '—'}
                    </span>
                    <span className="font-bold text-slate-700">
                      Qtd: {item.quantidade_solicitada} un
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => confirmarRecebimento(item)}
                disabled={processando === item.id}
                loading={processando === item.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar Chegada
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
