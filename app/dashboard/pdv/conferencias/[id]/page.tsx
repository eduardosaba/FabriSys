'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Calculator, DollarSign } from 'lucide-react';
import supabase from '../../../../../lib/supabase-client';
import Button from '../../../../../components/Button';
import toast from 'react-hot-toast';

interface ItemRow {
  id: string;
  produto_id: string;
  nome: string;
  qtd_vendida: number;
  preco_unitario: number;
}

export default function ConferenciaFechamentoAdminPage() {
  const params = useParams();
  const router = useRouter();
  const fechamentoId = params?.id as string | undefined;

  const [loading, setLoading] = useState(false);
  const [fechamento, setFechamento] = useState<any | null>(null);
  const [itens, setItens] = useState<ItemRow[]>([]);

  // Campos do Admin
  const [pix, setPix] = useState<number>(0);
  const [cartao, setCartao] = useState<number>(0);
  const [ajustePromo, setAjustePromo] = useState<number>(0);
  const [observacao, setObservacao] = useState<string>('');

  useEffect(() => {
    if (!fechamentoId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data: fData, error: fErr } = await supabase
          .from('pos_fechamentos')
          .select('*')
          .eq('id', fechamentoId)
          .maybeSingle();
        if (fErr) throw fErr;
        if (!mounted) return;
        setFechamento(fData || null);

        const { data: itemsData, error: itemsErr } = await supabase
          .from('itens_fechamento_caixa')
          .select('produto_id, qtd_vendida, preco_unitario, produtos_finais(id,nome,preco_venda)')
          .eq('fechamento_id', fechamentoId);
        if (itemsErr) throw itemsErr;

        const normalized: ItemRow[] = (itemsData || []).map((r: any) => ({
          id: String(r.produto_id) + '_' + String(r.qtd_vendida),
          produto_id: r.produto_id,
          nome: (r.produtos_finais && r.produtos_finais.nome) || r.nome || 'Produto',
          qtd_vendida: Number(r.qtd_vendida || 0),
          preco_unitario: Number(
            r.preco_unitario ?? ((r.produtos_finais && r.produtos_finais.preco_venda) || 0)
          ),
        }));
        if (!mounted) return;
        setItens(normalized);
      } catch (e) {
        console.error('Erro ao carregar fechamento:', e);
        toast.error('Erro ao carregar dados do fechamento');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fechamentoId]);

  const totalTeorico = useMemo(() => {
    return itens.reduce((acc, it) => acc + it.qtd_vendida * it.preco_unitario, 0);
  }, [itens]);

  const dinheiroPdv = Number(
    fechamento?.valor_dinheiro_informado ?? fechamento?.saldo_inicial ?? 0
  );
  const totalInformado = dinheiroPdv + pix + cartao;
  const diferencaBruta = totalTeorico - totalInformado;
  const diferencaFinal = diferencaBruta - ajustePromo;

  const handleFinalizar = async () => {
    if (!fechamentoId) return toast.error('Fechamento não identificado');
    setLoading(true);
    try {
      const { error } = await supabase.rpc('finalizar_conferencia_caixa', {
        p_fechamento_id: fechamentoId,
        p_pix: pix,
        p_cartao: cartao,
        p_ajuste_promo: ajustePromo,
        p_observacao: observacao,
        p_admin_id: null,
      } as any);

      if (error) throw error;
      toast.success('Caixa encerrado e estoque atualizado!');
      router.push('/dashboard/pdv');
    } catch (e: any) {
      console.error('Erro finalizar conferencia:', e);
      toast.error('Falha ao finalizar: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-slate-50 min-h-screen">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-blue-600" />
            Resumo de Vendas (Físico)
          </h3>

          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3 text-center">Saída</th>
                <th className="px-4 py-3 text-right">Subtotal (Preço Cheio)</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-bold">
                    {item.qtd_vendida} un
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    R$ {(item.qtd_vendida * item.preco_unitario).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-50">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <DollarSign size={24} className="text-green-600" />
            Fechamento Financeiro
          </h3>

          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Dinheiro (Informado pelo PDV)
              </label>
              <p className="text-2xl font-mono font-bold text-slate-800">
                R$ {dinheiroPdv.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Pix (Confirmado no Banco)
              </label>
              <input
                type="number"
                className="w-full text-xl p-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                value={pix}
                onChange={(e) => setPix(Number(e.target.value || 0))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Cartão (Débito/Crédito)
              </label>
              <input
                type="number"
                className="w-full text-xl p-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                value={cartao}
                onChange={(e) => setCartao(Number(e.target.value || 0))}
              />
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <label className="block text-sm font-bold text-orange-700 mb-1">
                Ajuste Global (Promoções/Combos)
              </label>
              <input
                type="number"
                placeholder="Ex: Valor total de descontos"
                className="w-full text-xl p-3 border-2 border-orange-200 bg-white rounded-xl focus:border-orange-500 outline-none"
                value={ajustePromo}
                onChange={(e) => setAjustePromo(Number(e.target.value || 0))}
              />
              <p className="text-[10px] text-orange-600 mt-2 font-medium italic">
                * Use este campo para ajustar a diferença causada por promoções/combos.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Observação (Admin)
              </label>
              <textarea
                rows={3}
                className="w-full p-3 border rounded-xl bg-white"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <hr className="my-6 border-dashed" />

            <div
              className={`p-5 rounded-2xl text-center ${diferencaFinal === 0 ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest">
                Diferença Final (Quebra)
              </p>
              <p className="text-3xl font-black font-mono">R$ {diferencaFinal.toFixed(2)}</p>
              {diferencaFinal === 0 && (
                <p className="text-xs mt-1 font-bold">✨ Caixa Conciliado!</p>
              )}
            </div>

            <Button
              onClick={handleFinalizar}
              className="w-full py-4 mt-4 shadow-lg"
              icon={CheckCircle}
            >
              Finalizar e Arquivar Caixa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
