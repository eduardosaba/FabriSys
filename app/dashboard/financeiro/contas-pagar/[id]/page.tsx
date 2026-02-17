"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Toaster, toast } from 'react-hot-toast';
import { Button } from '@/components/ui/shared';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ContaPagarDetailPage() {
  const params = useParams();
  const id = (params as any)?.id as string | undefined;
  const router = useRouter();
  const { profile } = useAuth();

  const [conta, setConta] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fin_contas_pagar')
        .select('*, fornecedores(nome), categoria:fin_categorias_despesa(nome)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setConta(data || null);
    } catch (err) {
      console.error('Erro ao carregar conta:', err);
      toast.error('Erro ao carregar conta');
    } finally {
      setLoading(false);
    }
  }

  function fmtDate(v: any) {
    if (!v) return '';
    try {
      return format(typeof v === 'string' ? parseISO(v) : v, 'dd/MM/yyyy');
    } catch { return ''; }
  }

  async function marcarPago() {
    if (!conta?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('fin_contas_pagar')
        .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
        .eq('id', conta.id);
      if (error) throw error;

      // marcar tarefa de agenda relacionada como concluída
      try {
        await supabase
          .from('tarefas_agenda')
          .update({ concluido: true, updated_at: new Date().toISOString() })
          .ilike('detalhe', `%ContaID:${conta.id}%`);
      } catch (errTask) {
        console.error('Erro ao marcar tarefa como concluída:', errTask);
      }

      toast.success('Pagamento registrado');
      await load();
    } catch (err: any) {
      console.error('Erro ao marcar pago:', err);
      toast.error(err?.message || 'Erro ao marcar pagamento');
    } finally {
      setSaving(false);
    }
  }

  if (!id) return <div className="p-6">ID inválido</div>;

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.back()} icon={ArrowLeft}>Voltar</Button>
          <h2 className="text-xl font-bold">Detalhe da Conta</h2>
        </div>
        {conta?.status !== 'pago' && (
          <Button onClick={marcarPago} disabled={saving} icon={CheckCircle2}>
            {saving ? 'Processando...' : 'Dar Baixa'}
          </Button>
        )}
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : !conta ? (
        <div>Conta não encontrada.</div>
      ) : (
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="text-lg font-bold mb-2">{conta.descricao}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Vencimento</div>
              <div className="font-medium">{fmtDate(conta.data_vencimento)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Data Pagamento</div>
              <div className="font-medium">{fmtDate(conta.data_pagamento)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Categoria</div>
              <div className="font-medium">{conta.categoria?.nome || 'Geral'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Fornecedor</div>
              <div className="font-medium">{conta.fornecedores?.nome || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Valor</div>
              <div className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor_total)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="font-medium">{conta.status}</div>
            </div>
          </div>

          {conta.observacao && (
            <div className="mt-4">
              <div className="text-xs text-slate-500">Observação</div>
              <div className="mt-1 whitespace-pre-wrap">{conta.observacao}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
