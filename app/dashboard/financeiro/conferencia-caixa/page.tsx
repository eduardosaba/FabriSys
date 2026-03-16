'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ConferenciaCaixaPage() {
  const { profile } = useAuth();
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarPendentes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('caixa_sessao')
      .select('*, loja:locais(nome), usuario:profiles!usuario_fechamento(nome)')
      .eq('status', 'fechado')
      .eq('status_conferencia', 'pendente')
      .order('data_fechamento', { ascending: false });
    setPendentes(data || []);
    setLoading(false);
  };

  const confirmarCaixa = async (id: string) => {
    const { error } = await supabase
      .from('caixa_sessao')
      .update({
        status_conferencia: 'confirmado',
        conferido_por: profile?.id,
        data_conferencia: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      toast.success('Caixa confirmado!');
      void carregarPendentes();
    } else {
      toast.error('Erro ao confirmar caixa.');
    }
  };

  useEffect(() => {
    void carregarPendentes();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Conferência de Fechamentos</h1>
      <div className="grid gap-4">
        {pendentes.map((caixa) => (
          <div
            key={caixa.id}
            className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm"
          >
            <div>
              <p className="font-bold text-lg">{caixa.loja?.nome || '—'}</p>
              <p className="text-sm text-slate-500">Fechado por: {caixa.usuario?.nome || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 uppercase font-black">Total Informado</p>
              <p className="text-xl font-bold text-blue-600">
                R${' '}
                {Number(caixa.saldo_final_informado || caixa.total_vendas_sistema || 0).toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => confirmarCaixa(caixa.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-green-700"
            >
              <CheckCircle size={18} /> Confirmar Lançamento
            </button>
          </div>
        ))}

        {!loading && pendentes.length === 0 && (
          <p className="text-slate-500">Nenhum fechamento pendente para conferência.</p>
        )}
      </div>
    </div>
  );
}
