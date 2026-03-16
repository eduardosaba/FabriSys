'use client';

import { useEffect, useState } from 'react';
import { CaixaSessaoCompleto } from '@/lib/types/pdv';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Card from '@/components/ui/Card';
import { History, Calendar, User, DollarSign, MapPin, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function HistoricoCaixaPage() {
  const { profile } = useAuth();
  const [caixas, setCaixas] = useState<CaixaSessaoCompleto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarHistorico() {
      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from('caixa_sessao')
        .select(
          `
          *,
          usuario:profiles!usuario_abertura(nome),
          loja:locais(nome)
        `
        )
        .eq('organization_id', profile.organization_id)
        .eq('status', 'fechado')
        .order('data_fechamento', { ascending: false })
        .returns<CaixaSessaoCompleto[]>();

      if (!error) setCaixas(data || []);
      setLoading(false);
    }

    carregarHistorico();
  }, [profile]);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up max-w-6xl mx-auto">
      <PageHeader
        title="Histórico de Caixas"
        description="Consulte os fechamentos anteriores e as movimentações financeiras das unidades."
        icon={History}
      />

      <div className="grid gap-4">
        {caixas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <Search size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Nenhum caixa fechado encontrado.</p>
          </div>
        ) : (
          caixas.map((caixa) => (
            <Card key={caixa.id} className="hover:border-blue-200 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info Principal */}
                <div className="flex items-start gap-4">
                  <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {caixa.data_fechamento
                        ? format(new Date(caixa.data_fechamento), "dd 'de' MMMM", { locale: ptBR })
                        : '—'}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {caixa.loja?.nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} /> {caixa.usuario?.nome}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valores Financeiros */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Vendas
                    </span>
                    <span className="font-bold text-slate-700 text-sm">
                      R$ {(caixa.total_vendas_sistema ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Informado
                    </span>
                    <span className="font-bold text-blue-700 text-sm">
                      R$ {(caixa.saldo_final_informado ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Diferença
                    </span>
                    <span
                      className={`font-bold text-sm ${(caixa.diferenca ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {(caixa.diferenca ?? 0) > 0 && '+'} R$ {(caixa.diferenca ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status/Botão */}
                <button
                  onClick={() => toast.success('Função de detalhes em breve!')}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                  Ver Detalhes
                </button>
              </div>

              {caixa.observacoes && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-400 text-xs">
                  Obs: {caixa.observacoes}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
