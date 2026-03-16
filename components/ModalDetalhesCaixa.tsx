import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, X } from 'lucide-react';

export default function ModalDetalhesCaixa({
  caixaId,
  onClose,
}: {
  caixaId: string;
  onClose: () => void;
}) {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetalhes() {
      setLoading(true);
      const { data } = await supabase
        .from('v_detalhes_fechamento_caixa')
        .select('*')
        .eq('caixa_id', caixaId);
      setItens(data || []);
      setLoading(false);
    }
    if (caixaId) void fetchDetalhes();
  }, [caixaId]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-up">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Package size={18} /> Itens Vendidos na Sessão
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-400 uppercase text-[10px] font-black border-b">
                <tr>
                  <th className="text-left pb-2">Produto</th>
                  <th className="text-center pb-2">Qtd</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itens.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-700">{item.produto_nome}</td>
                    <td className="py-3 text-center">{item.qtd_total}</td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      R$ {Number(item.valor_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t text-right">
          <button
            onClick={onClose}
            className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
