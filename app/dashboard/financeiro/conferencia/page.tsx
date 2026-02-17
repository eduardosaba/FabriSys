'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast, Toaster } from 'react-hot-toast';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import { Button } from '@/components/Button';

export default function ConferenciaCaixaPage() {
  const { profile } = useAuth();
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchFechamentos();
  }, [profile]);

  async function fetchFechamentos() {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pos_fechamentos')
        .select('*, profiles:usuario_id(full_name)')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      setFechamentos(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar fechamentos.');
    } finally {
      setLoading(false);
    }
  }

  const validarCaixa = async (fechamentoId: string) => {
    if (!profile?.organization_id) return;
    try {
      const { error: err1 } = await supabase
        .from('pos_fechamentos')
        .update({ status: 'validado', data_validacao: new Date().toISOString() })
        .eq('id', fechamentoId);

      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('vendas')
        .update({ caixa_validado: true, fechamento_id: fechamentoId })
        .eq('organization_id', profile.organization_id)
        .eq('caixa_validado', false);

      if (err2) throw err2;

      toast.success('Caixa conferido e valores liberados no financeiro!');
      void fetchFechamentos();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao validar caixa.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      <div className="flex items-center gap-3">
        <ShieldCheck size={28} className="text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Conferência de Caixas</h1>
          <p className="text-sm text-slate-500">Valide os fechamentos de turno para confirmar a entrada de dinheiro no fluxo principal.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {!loading && fechamentos.length === 0 && (
          <div className="bg-white border p-12 rounded-xl text-center flex flex-col items-center">
            <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Tudo em ordem!</h3>
            <p className="text-slate-500">Não há fechamentos pendentes de conferência.</p>
          </div>
        )}

        {fechamentos.map((f) => (
          <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Turno: {(() => { try { return f?.created_at ? format(parseISO(String(f.created_at)), "dd 'de' MMMM", { locale: ptBR }) : '—'; } catch (e) { return '—'; } })()}
                  </span>
                  <div className="flex items-center text-slate-400 text-xs">
                    <Clock size={12} className="mr-1" />
                    {(() => { try { return f?.created_at ? format(parseISO(String(f.created_at)), 'HH:mm') : '—'; } catch (e) { return '—'; } })()}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Operador: {f.profiles?.full_name || 'Sistema'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Esperado (Sistema)</p>
                  <p className="text-md font-bold text-slate-700">R$ {f.valor_esperado_dinheiro}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Informado (Gaveta)</p>
                  <p className={`text-md font-bold ${f.diferenca < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    R$ {f.valor_informado_dinheiro}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                {f.diferenca !== 0 && (
                  <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">
                    <AlertTriangle size={14} />
                    Diferença de R$ {f.diferenca}
                  </div>
                )}
                <Button onClick={() => validarCaixa(f.id)} icon={CheckCircle2} className="w-full md:w-auto">
                  Aprovar e Liberar Saldo
                </Button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
