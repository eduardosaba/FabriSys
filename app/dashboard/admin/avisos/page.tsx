'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Megaphone, Send, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

interface AvisoSistema {
  id: string;
  mensagem: string;
  tipo_alvo: string;
  cor_tipo: string;
  ativo: boolean;
  created_at: string;
}

const TIPOS_USUARIO = [
  { value: 'todos', label: 'Todos os Usuários' },
  { value: 'admin', label: 'Administradores' },
  { value: 'pdv', label: 'Operadores de Caixa (PDV)' },
  { value: 'compras', label: 'Estoquistas / Compras' },
  { value: 'fabrica', label: 'Fábrica / Produção' },
];

export default function GestaoAvisosPage() {
  const { profile } = useAuth();
  const [mensagem, setMensagem] = useState('');
  const [alvo, setAlvo] = useState('todos');
  const [tipoAlerta, setTipoAlerta] = useState('info');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<AvisoSistema[]>([]);

  // Carregar histórico de avisos
  const carregarHistorico = async () => {
    const { data } = await supabase
      .from('avisos_sistema')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setHistorico(data || []);
  };

  useEffect(() => {
    void carregarHistorico();
  }, []);

  const enviarAviso = async () => {
    if (!mensagem.trim()) return toast.error('Digite uma mensagem');
    setLoading(true);

    try {
      // 1. Desativar avisos anteriores ativos (opcional, para não acumular popups)
      await supabase
        .from('avisos_sistema')
        .update({ ativo: false })
        .eq('ativo', true)
        .eq('tipo_alvo', alvo);

      // 2. Criar novo aviso
      const { error } = await supabase.from('avisos_sistema').insert({
        mensagem,
        tipo_alvo: alvo,
        cor_tipo: tipoAlerta,
        ativo: true,
        created_by: profile?.id,
      });

      if (error) throw error;

      toast.success('Aviso enviado com sucesso!');
      setMensagem('');
      void carregarHistorico();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar aviso');
    } finally {
      setLoading(false);
    }
  };

  const encerrarAviso = async (id: string) => {
    await supabase.from('avisos_sistema').update({ ativo: false }).eq('id', id);
    toast.success('Aviso removido da tela dos usuários');
    void carregarHistorico();
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Comunicados e Avisos"
        description="Envie alertas em tempo real para as telas dos usuários."
        icon={Megaphone}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Envio */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4">Novo Comunicado</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Destinatário</label>
              <select
                className="w-full p-3 border rounded-lg bg-slate-50"
                value={alvo}
                onChange={(e) => setAlvo(e.target.value)}
              >
                {TIPOS_USUARIO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Alerta</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoAlerta('info')}
                  className={`flex-1 p-2 rounded border flex items-center justify-center gap-2 ${tipoAlerta === 'info' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white'}`}
                >
                  <Megaphone size={16} /> Informativo
                </button>
                <button
                  onClick={() => setTipoAlerta('warning')}
                  className={`flex-1 p-2 rounded border flex items-center justify-center gap-2 ${tipoAlerta === 'warning' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white'}`}
                >
                  <AlertTriangle size={16} /> Importante
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem</label>
              <textarea
                className="w-full p-3 border rounded-lg bg-slate-50 min-h-[120px]"
                placeholder="Ex: O sistema passará por manutenção às 18h..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </div>

            <Button onClick={enviarAviso} loading={loading} className="w-full py-3" icon={Send}>
              Enviar Aviso Agora
            </Button>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Últimos Enviados</h3>
          <div className="space-y-3">
            {historico.map((aviso) => (
              <div
                key={aviso.id}
                className={`p-4 rounded-lg border flex justify-between items-start ${aviso.ativo ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${aviso.tipo_alvo === 'todos' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {aviso.tipo_alvo}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(aviso.created_at).toLocaleString()}
                    </span>
                    {aviso.ativo && (
                      <span className="text-[10px] bg-green-200 text-green-800 px-1 rounded flex items-center gap-1">
                        <CheckCircle size={10} /> Ativo na Tela
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{aviso.mensagem}</p>
                </div>

                {aviso.ativo && (
                  <button
                    onClick={() => encerrarAviso(aviso.id)}
                    className="text-red-500 hover:text-red-700 p-1 bg-white rounded shadow-sm border"
                    title="Parar de exibir"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {historico.length === 0 && (
              <p className="text-slate-400 text-center py-10">Nenhum aviso enviado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
