'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertOctagon, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { getOperationalContext } from '@/lib/operationalLocal';

const MOTIVOS = [
  { value: 'vencimento', label: 'Vencimento / Estragado' },
  { value: 'avaria', label: 'Avaria (Caiu/Amassou)' },
  { value: 'qualidade', label: 'Problema de Qualidade' },
  { value: 'degustacao', label: 'Degustação / Consumo Interno' },
  { value: 'outros', label: 'Outros' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  localId: string | null;
  produtos: any[];
  // onSuccess receberá produtoId e quantidade para permitir atualização local
  onSuccess: (produtoId?: string, quantidade?: number) => void;
  // valores iniciais para pré-preencher o modal quando aberto por um produto específico
  initialProdutoId?: string | null;
  initialQuantidade?: number | null;
}

export default function RegistroPerdaModal({
  isOpen,
  onClose,
  localId,
  produtos,
  onSuccess,
  initialProdutoId,
  initialQuantidade,
}: Props) {
  const { profile } = useAuth();
  const [produtoId, setProdutoId] = useState('');
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('vencimento');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  // sincroniza valores iniciais quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (initialProdutoId) setProdutoId(initialProdutoId);
      if (initialQuantidade != null) setQtd(String(initialQuantidade));
    } else {
      // reset quando fecha
      setProdutoId('');
      setQtd('');
      setMotivo('vencimento');
      setObs('');
    }
  }, [isOpen, initialProdutoId, initialQuantidade]);

  if (!isOpen) return null;

  const handleSalvar = async () => {
    // Resolve local operacional (prefere caixa aberto do usuário)
    let effectiveLocal = localId;
    if (!effectiveLocal) {
      try {
        const ctx = await getOperationalContext(profile);
        effectiveLocal = ctx.caixa?.local_id ?? ctx.localId ?? null;
      } catch (e) {
        effectiveLocal = null;
      }
    }

    if (!produtoId || !qtd || !effectiveLocal) return toast.error('Preencha os dados');

    try {
      setLoading(true);
      const { error } = await supabase.rpc('registrar_perda_estoque', {
        p_local_id: effectiveLocal,
        p_produto_id: produtoId,
        p_quantidade: parseFloat(qtd),
        p_motivo: motivo,
        p_observacao: obs,
        p_responsavel_id: profile?.id,
      });

      if (error) throw error;

      toast.success('Perda registrada. Estoque atualizado.');
      onSuccess(produtoId || undefined, parseFloat(qtd || '0'));
      onClose();
      setProdutoId('');
      setQtd('');
      setObs('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <Trash2 size={20} /> Registrar Perda / Quebra
          </h3>
          <button onClick={onClose} className="text-red-300 hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 p-3 rounded text-xs text-red-700 flex gap-2">
            <AlertOctagon size={16} className="shrink-0" />
            <p>
              Atenção: Esta ação removerá o item do estoque imediatamente e será contabilizada como
              prejuízo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Produto</label>
            <select
              className="w-full p-2 border rounded-lg bg-slate-50"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Quantidade</label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg"
                placeholder="0"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Motivo</label>
              <select
                className="w-full p-2 border rounded-lg bg-slate-50"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                {MOTIVOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Observação</label>
            <textarea
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Caiu no chão durante a reposição..."
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleSalvar}
              loading={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Baixa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
