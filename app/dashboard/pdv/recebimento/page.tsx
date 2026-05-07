'use client';

import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import PageHeader from '@/components/ui/PageHeader';
import { setActiveLocal } from '@/lib/activeLocal';
import { useAuth } from '@/lib/auth';
import { getOperationalContext } from '@/lib/operationalLocal';
import { supabase } from '@/lib/supabase-client';
import { AlertCircle, CheckCircle, MapPin, Package, Truck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function RecebimentoPage() {
  const { profile, loading: authLoading } = useAuth();

  const [cargas, setCargas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaSelecionada, setCargaSelecionada] = useState<any | null>(null);
  const [qtdRecebida, setQtdRecebida] = useState<number>(0);
  const [obsRecebimento, setObsRecebimento] = useState<string>('');
  const [pdvOptions, setPdvOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedPdv, setSelectedPdv] = useState<string | null>(null);
  const [selectedCargas, setSelectedCargas] = useState<Record<string, boolean>>({});
  const [bulkReceiving, setBulkReceiving] = useState(false);

  // 1. Identificar a Loja Atual (prefere caixa aberto do usuário)
  const carregarLocal = useCallback(async () => {
    try {
      if (profile?.local_id) {
        setLocalId(profile.local_id);
        setSelectedPdv(profile.local_id);
        await setActiveLocal(profile.local_id);
        return profile.local_id;
      }

      // fallback: usar contexto operacional se disponível
      try {
        const oc = await getOperationalContext(profile);
        if (oc?.localId) {
          setLocalId(oc.localId);
          setSelectedPdv(oc.localId);
          await setActiveLocal(oc.localId);
          return oc.localId;
        }
      } catch (e) {
        // noop
      }

      return null;
    } catch (err) {
      console.error('Erro ao determinar local ativo', err);
      return null;
    }
  }, [profile]);

  const carregarPdvs = useCallback(async () => {
    if (!profile?.organization_id) return;
    try {
      const { data } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('organization_id', profile.organization_id)
        .order('nome');
      setPdvOptions((data || []) as any[]);
    } catch (err) {
      console.error('Erro ao carregar PDVs', err);
    }
  }, [profile?.organization_id]);

  const carregarCargas = useCallback(
    async (pdvId: string | null) => {
      if (!pdvId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('distribuicoes')
          .select(
            '*, ordem:ordens_producao(id, numero_op, produto_final_id, status_logistica), local:locais(id, nome)'
          )
          .eq('local_id', pdvId)
          .order('created_at', { ascending: false });
        if (error) throw error;

        let norm = (data || []) as any[];
        norm = norm.filter((c: any) => {
          const distSent = String(c.status || '').toLowerCase() === 'enviado';
          const ordemSent = String(c.ordem?.status_logistica || '').toLowerCase() === 'enviado';
          return distSent || ordemSent;
        });

        const produtoIds = Array.from(
          new Set(norm.map((c) => String(c.ordem?.produto_final_id)).filter(Boolean))
        );
        const cleanProdutoIds = (produtoIds || [])
          .filter(Boolean)
          .filter((id) => id !== 'undefined');
        const produtoMap: Record<string, { nome?: string }> = {};
        if (cleanProdutoIds.length > 0) {
          const { data: produtos } = await supabase
            .from('produtos_finais')
            .select('id, nome')
            .in('id', cleanProdutoIds as any[]);
          (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome }));
        }

        const formatted = norm.map((c: any) => {
          const ordem = c.ordem || {};
          return {
            ...c,
            ordem: {
              id: ordem.id,
              numero_op: ordem.numero_op,
              produto: { nome: produtoMap[String(ordem.produto_final_id)]?.nome },
            },
            local: c.local || {},
          };
        });

        setCargas(formatted);

        const qMap: Record<string, number> = {};
        const oMap: Record<string, string> = {};
        (formatted || []).forEach((f: any) => {
          qMap[f.id] = Number(f.quantidade_solicitada) || 0;
          oMap[f.id] = '';
        });
        setQuantidades(qMap);
        setObservacoes(oMap);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao buscar cargas.');
      } finally {
        setLoading(false);
      }
    },
    [profile?.organization_id]
  );

  useEffect(() => {
    const init = async () => {
      if (authLoading) return; // aguarda auth pronto
      const id = await carregarLocal();
      await carregarPdvs();
      const pdvToLoad = selectedPdv ?? id;
      if (pdvToLoad) {
        await carregarCargas(pdvToLoad);
      } else {
        setLoading(false);
        toast.error('Loja não identificada.');
      }
    };
    void init();
  }, [carregarLocal, carregarCargas, authLoading]);

  const selectAllCargas = () => {
    const next: Record<string, boolean> = {};
    cargas.forEach((c) => (next[c.id] = true));
    setSelectedCargas(next);
  };

  const deselectAllCargas = () => setSelectedCargas({});

  const toggleSelectCarga = (id: string, checked?: boolean) => {
    setSelectedCargas((prev) => ({
      ...prev,
      [id]: typeof checked === 'boolean' ? checked : !prev[id],
    }));
  };

  const receberSelecionados = async () => {
    const ids = cargas.map((c) => c.id).filter((id) => selectedCargas[id]);
    if (!ids.length) return toast.error('Nenhuma carga selecionada.');
    setBulkReceiving(true);
    const toastId = toast.loading(`Processando ${ids.length} recebimentos...`);
    try {
      for (const id of ids) {
        try {
          const quant = Number(quantidades[id] ?? 0);
          const obs = observacoes[id] ?? null;
          // processar um por um para respeitar validações e RPC

          await confirmarRecebimento(id, quant, obs);
        } catch (err) {
          console.warn('Falha ao receber carga em lote', id, err);
        }
      }
      toast.success('Recebimentos processados', { id: toastId });
      setSelectedCargas({});
      if (selectedPdv) await carregarCargas(selectedPdv);
      else if (localId) await carregarCargas(localId);
    } catch (err) {
      console.error('Erro no recebimento em lote', err);
      toast.error('Erro ao processar recebimentos', { id: toastId });
    } finally {
      setBulkReceiving(false);
    }
  };

  const confirmarRecebimento = async (
    id: string,
    quantidadeParam?: number,
    observacaoParam?: string
  ) => {
    if (!localId) return;
    try {
      setLoading(true);
      const p_quant =
        typeof quantidadeParam === 'number' ? quantidadeParam : Number(quantidades[id] ?? 0);
      const p_obs =
        typeof observacaoParam === 'string' ? observacaoParam : (observacoes[id] ?? null);
      const { data, error } = await supabase.rpc('confirmar_recebimento_pdv', {
        p_distribuicao_id: id,
        p_quantidade: p_quant,
        p_observacao: p_obs,
      });
      if (error) throw error;

      // Atualizar histórico de envio (não-fatal)
      try {
        await supabase
          .from('envios_historico')
          .update({
            recebido_por: profile?.id || null,
            recebido_em: new Date().toISOString(),
            quantidade_recebida: p_quant,
            observacao: p_obs || null,
            status: 'recebido',
          })
          .eq('distrib_id', id);
      } catch (histErr) {
        console.warn('Falha ao atualizar histórico de envio (não fatal):', histErr);
      }

      toast.success('Estoque atualizado com sucesso!');
      await carregarCargas(localId); // Recarrega lista
      return data;
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao receber carga: ' + (err?.message ?? String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirConfirmacao = (carga: any) => {
    setCargaSelecionada(carga);
    setQtdRecebida(Number(carga.quantidade_solicitada) || 0);
    setObsRecebimento('');
    setIsModalOpen(true);
  };

  const handleConfirmarFinal = async () => {
    if (!cargaSelecionada) return;
    // Bloqueio: se a quantidade informada exceder 10% da enviada, exigir verificação/observação
    const enviado = Number(cargaSelecionada?.quantidade_solicitada || 0);
    if (enviado > 0 && qtdRecebida > enviado * 1.1) {
      toast.error(
        'Quantidade informada é muito superior à enviada. Verifique antes de confirmar e registre uma observação.'
      );
      return;
    }

    if (qtdRecebida !== cargaSelecionada?.quantidade_solicitada && !obsRecebimento) {
      toast.error('Por favor, relate o motivo da diferença na observação.');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('confirmar_recebimento_pdv', {
        p_distribuicao_id: cargaSelecionada.id,
        p_quantidade: qtdRecebida,
        p_observacao: obsRecebimento || null,
      });
      if (error) throw error;

      // Se a RPC realizou apenas a atualização de estoque, marcamos a OP como entregue
      try {
        const ordemId = cargaSelecionada?.ordem?.id;
        if (ordemId) {
          const { error: updErr } = await supabase
            .from('ordens_producao')
            .update({ status_logistica: 'recebido' })
            .eq('id', ordemId);
          if (updErr) console.warn('Falha ao atualizar status_logistica da OP:', updErr);
        }
      } catch (updEx) {
        console.warn('Erro ao finalizar ciclo logístico da OP:', updEx);
      }

      toast.success('Entrada de estoque confirmada! Logística encerrada.');
      setIsModalOpen(false);
      // Recarrega a lista
      if (localId) await carregarCargas(localId);
      return data;
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao confirmar: ' + (err?.message ?? String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Recebimento de Mercadoria"
        description="Confirme a entrada dos produtos enviados pela Fábrica."
        icon={Truck}
      />

      <div className="max-w-5xl mx-auto mt-2">
        <div className="rounded-md bg-amber-50 border border-amber-100 p-3 flex items-start gap-3">
          <AlertCircle className="text-amber-600" size={18} />
          <div>
            <div className="text-sm font-semibold text-amber-800">Atenção</div>
            <div className="text-sm text-amber-700">
              Mostrando apenas entregas confirmadas pela Expedição (itens com status 'enviado').
            </div>
          </div>
        </div>
      </div>

      {pdvOptions.length > 0 && profile?.role === 'admin' && (
        <div className="max-w-5xl mx-auto mt-2">
          <label className="text-xs text-slate-500 uppercase font-bold">
            Visualizar PDV (apenas admins)
          </label>
          <select
            className="w-full p-2 border rounded mt-1"
            value={selectedPdv ?? ''}
            onChange={async (e) => {
              const novo = e.target.value || null;
              setSelectedPdv(novo);
              setActiveLocal(novo);
              if (novo) await carregarCargas(novo);
            }}
          >
            <option value="">Selecionar PDV (apenas admins)</option>
            {pdvOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {cargas.length > 0 && (
        <div className="max-w-5xl mx-auto mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={selectAllCargas}
            className="text-sm text-blue-600 hover:underline"
          >
            Selecionar todos
          </button>
          <button
            type="button"
            onClick={deselectAllCargas}
            className="text-sm text-gray-500 hover:underline"
          >
            Desmarcar
          </button>
          <button
            type="button"
            onClick={receberSelecionados}
            disabled={bulkReceiving || Object.values(selectedCargas).filter(Boolean).length === 0}
            className="ml-4 px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
          >
            {bulkReceiving
              ? 'Processando...'
              : `Receber selecionados (${Object.values(selectedCargas).filter(Boolean).length})`}
          </button>
        </div>
      )}

      {cargas.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Tudo recebido!</h3>
          <p className="text-slate-500">Não há entregas pendentes para esta loja no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cargas.map((carga) => (
            <div
              key={carga.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Package size={12} /> OP #{carga.ordem?.numero_op}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(carga.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-1">
                  {carga.ordem?.produto?.nome}
                </h3>

                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <MapPin size={14} /> Destino: {carga.local?.nome}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-500 uppercase font-bold">
                      Quantidade Recebida
                    </label>
                    <button
                      onClick={() =>
                        setQuantidades((prev) => ({
                          ...prev,
                          [carga.id]: Number(carga.quantidade_solicitada),
                        }))
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                    >
                      RECEBER TUDO
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-3 rounded-lg text-2xl font-bold text-slate-800 text-center bg-white border"
                    value={quantidades[carga.id] ?? carga.quantidade_solicitada}
                    onChange={(e) =>
                      setQuantidades((prev) => ({ ...prev, [carga.id]: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-slate-500 uppercase mb-1">Observação</label>
                  <textarea
                    className="w-full p-3 rounded-lg border border-slate-100"
                    rows={3}
                    placeholder="Observações sobre a entrega (faltas, avarias, etc.)"
                    value={observacoes[carga.id] ?? ''}
                    onChange={(e) =>
                      setObservacoes((prev) => ({ ...prev, [carga.id]: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => handleAbrirConfirmacao(carga)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                icon={CheckCircle}
              >
                Confirmar Entrada
              </Button>
            </div>
          ))}
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO DE RECEBIMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="text-emerald-500" size={20} />
                Confirmar Recebimento
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase">Produto</p>
                <p className="font-bold text-blue-900">{cargaSelecionada?.ordem?.produto?.nome}</p>
                <p className="text-xs text-blue-700">
                  Enviado pela Fábrica: {cargaSelecionada?.quantidade_solicitada} un
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-center">
                  Quantidade que REALMENTE chegou
                </label>
                <input
                  type="number"
                  className="w-full p-4 border-2 border-slate-100 rounded-xl text-3xl font-black text-center text-emerald-600 focus:border-emerald-500 outline-none transition-all"
                  value={qtdRecebida}
                  onChange={(e) => setQtdRecebida(Number(e.target.value))}
                />
                {qtdRecebida !== cargaSelecionada?.quantidade_solicitada && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> Quantidade diferente da enviada!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Observação (Opcional)
                </label>
                <textarea
                  className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
                  rows={2}
                  placeholder="Ex: Chegou com a embalagem aberta..."
                  value={obsRecebimento}
                  onChange={(e) => setObsRecebimento(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>

              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  try {
                    if (!localId)
                      return toast.error('Loja não identificada para visualizar estoque.');
                    window.open(`/dashboard/pdv/inventario?local=${localId}`, '_blank');
                  } catch (e) {
                    console.error('Erro ao abrir Inventário do PDV', e);
                    toast.error('Não foi possível abrir o Inventário do PDV.');
                  }
                }}
              >
                Ver Estoque do PDV
              </Button>

              <Button
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg"
                onClick={handleConfirmarFinal}
                loading={loading}
              >
                Confirmar Entrada
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// end component
