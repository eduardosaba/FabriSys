'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Megaphone, AlertTriangle } from 'lucide-react';

interface AvisoSistema {
  id: string;
  mensagem: string;
  tipo_alvo: string;
  cor_tipo: string;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export default function SystemAlertPopup() {
  const { profile, loading } = useAuth();
  const [aviso, setAviso] = useState<AvisoSistema | null>(null);
  const [visivel, setVisivel] = useState(false);

  // Função para buscar avisos compatíveis
  const checarAvisos = useCallback(async () => {
    // Aguardar auth carregar completamente
    if (loading || !profile) return;

    // Busca avisos ativos onde o alvo é 'todos' OU o cargo do usuário
    const result = await supabase
      .from('avisos_sistema')
      .select('*')
      .eq('ativo', true)
      .or(`tipo_alvo.eq.todos,tipo_alvo.eq.${profile.role}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const avisoData = result.data as AvisoSistema | null;

    if (avisoData) {
      // Verifica se o usuário já fechou ESTE aviso específico
      const jaVisto = localStorage.getItem(`aviso_visto_${avisoData.id}`);
      if (!jaVisto) {
        setAviso(avisoData);
        setVisivel(true);
        // Toca um som suave de notificação (opcional)
        try {
          const audio = new Audio('/sounds/notification.mp3');
          void audio.play();
        } catch {
          // Ignora erro se o arquivo de som não existir
        }
      }
    } else {
      setVisivel(false);
    }
  }, [profile, loading]);

  useEffect(() => {
    // Aguardar auth completar antes de checar avisos
    if (loading) return;

    // 1. Checa ao carregar
    void checarAvisos();

    if (!profile) return;

    // 2. Inscreve no Realtime para receber na hora que o admin enviar
    const channel = supabase
      .channel('avisos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'avisos_sistema' },
        (payload) => {
          const novoAviso = payload.new;
          // Verifica se é para mim
          if (
            novoAviso.ativo &&
            (novoAviso.tipo_alvo === 'todos' || novoAviso.tipo_alvo === profile?.role)
          ) {
            setAviso(novoAviso as AvisoSistema);
            setVisivel(true);

            // Som de notificação
            try {
              const audio = new Audio('/sounds/notification.mp3');
              void audio.play();
            } catch {
              // Ignora
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'avisos_sistema' },
        (payload) => {
          // Se o admin desativar o aviso, fecha na hora
          if (payload.new.ativo === false && payload.new.id === aviso?.id) {
            setVisivel(false);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile, aviso?.id, checarAvisos, loading]);

  const fechar = () => {
    if (aviso) {
      // Marca como visto para não abrir de novo
      localStorage.setItem(`aviso_visto_${aviso.id}`, 'true');
      setVisivel(false);
    }
  };

  if (!visivel || !aviso) return null;

  const isWarning = aviso.cor_tipo === 'warning';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full m-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Cabeçalho colorido */}
        <div
          className={`p-4 flex items-center gap-3 ${isWarning ? 'bg-yellow-500' : 'bg-blue-600'} text-white`}
        >
          {isWarning ? <AlertTriangle size={28} /> : <Megaphone size={28} />}
          <h3 className="font-bold text-lg">Comunicado Importante</h3>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">
            {aviso.mensagem}
          </p>

          <div className="mt-4 text-xs text-slate-400 border-t pt-2">
            Enviado em: {new Date(aviso.created_at).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <button
            onClick={fechar}
            className={`px-6 py-2.5 rounded-lg font-bold text-white shadow transition-transform active:scale-95 ${isWarning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Entendi, fechar aviso
          </button>
        </div>
      </div>
    </div>
  );
}
