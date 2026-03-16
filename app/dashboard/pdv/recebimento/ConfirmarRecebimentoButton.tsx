'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/shared';

type Props = { distribId: string; onDone?: () => void };

export default function ConfirmarRecebimentoButton({ distribId, onDone }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!profile?.id) return toast.error('Usuário não autenticado.');
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('confirmar_recebimento_pdv', {
        p_distrib_id: distribId,
        p_usuario_id: profile.id,
      });

      if (error) throw error;

      const res = Array.isArray(data) ? data[0] : data;
      if (res?.success === false) {
        toast.error(res.message || 'Erro ao confirmar recebimento');
      } else {
        toast.success(res?.message || 'Recebimento confirmado');
        if (onDone) onDone();
      }
    } catch (err: any) {
      console.error('RPC error', err);
      toast.error('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={() => {
        if (!confirm('Confirmar recebimento e transferir estoque?')) return;
        handleConfirm();
      }}
      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-2"
      disabled={loading}
    >
      <CheckCircle2 size={18} />
      {loading ? 'Confirmando...' : 'Confirmar Chegada de Produtos'}
    </Button>
  );
}
