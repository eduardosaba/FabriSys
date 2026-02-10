'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BellRing, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SolicitacaoReposicao({ localId }: { localId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState<number>(10);

  useEffect(() => {
    if (isOpen && produtos.length === 0) {
      void (async () => {
        const { data } = await supabase
          .from('produtos_finais')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        setProdutos(data || []);
      })();
    }
  }, [isOpen, produtos.length]);

  const solicitar = async (produtoId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('solicitacoes_reposicao').insert({
        local_id: localId,
        produto_id: produtoId,
        status: 'pendente',
        urgencia: 'alta',
        created_at: new Date().toISOString(),
        observacao: `Quantidade solicitada: ${quantidade}`,
      });

      if (error) throw error;
      toast.success('Solicitação enviada para a fábrica!');
      setIsOpen(false);
    } catch {
      toast.error('Erro ao solicitar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-all z-40 flex items-center gap-2 group"
        title="Pedir Reposição"
      >
        <BellRing size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
          Pedir Reposição
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <BellRing size={18} /> O que está faltando?
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Clique no produto para avisar a fábrica imediatamente.
              </p>

              <div className="mb-2">
                <label className="text-xs text-slate-500 mb-1 block">Quantidade padrão</label>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value || '1')))}
                  className="w-24 p-2 border rounded"
                />
              </div>

              {produtos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => solicitar(p.id)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors flex justify-between items-center group"
                >
                  <span className="font-medium text-slate-700">{p.nome}</span>
                  <Send
                    size={16}
                    className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
