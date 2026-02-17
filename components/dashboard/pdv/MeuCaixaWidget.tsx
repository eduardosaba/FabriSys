'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/dashboard/Card';
import { Lock, Unlock, Play, LogOut, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeuCaixaWidget() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessao, setSessao] = useState<any>(null);

  useEffect(() => {
    async function checkMySession() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('caixa_sessao')
        .select('*')
        .eq('usuario_abertura', profile.id)
        .is('data_fechamento', null)
        .maybeSingle();

      setSessao(data);
      setLoading(false);
    }

    void checkMySession();
  }, [profile]);

  const irParaVenda = () => router.push('/dashboard/pdv/caixa');
  const abrirCaixa = () => router.push('/dashboard/pdv/controle-caixa');
  const fecharCaixa = () => router.push('/dashboard/pdv/controle-caixa');

  return (
    <Card title="Status do Meu Caixa" size="1x1" loading={loading}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${sessao ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
            {sessao ? <Unlock size={32} /> : <Lock size={32} />}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${sessao ? 'text-emerald-700' : 'text-slate-700'}`}>
              {sessao ? 'Caixa Aberto' : 'Caixa Fechado'}
            </h3>
            {sessao ? (
              <p className="text-xs text-slate-500">
                  Aberto {(() => {
                    try {
                      return sessao?.data_abertura ? formatDistanceToNow(parseISO(String(sessao.data_abertura)), { addSuffix: true, locale: ptBR }) : '';
                    } catch (e) {
                      return '';
                    }
                  })()}
                </p>
            ) : (
              <p className="text-xs text-slate-400">Você precisa abrir o caixa para vender.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {sessao ? (
            <>
              <button onClick={irParaVenda} className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-colors shadow-sm">
                <Play size={18} fill="currentColor" /> Iniciar Venda
              </button>

              <button onClick={fecharCaixa} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-medium transition-colors">
                <LogOut size={14} /> Fechar Caixa
              </button>

              {/* Sangria/Reforço button removed per request */}
            </>
          ) : (
            <button onClick={abrirCaixa} className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition-colors shadow-sm animate-pulse">
              <Unlock size={18} /> ABRIR CAIXA AGORA
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
