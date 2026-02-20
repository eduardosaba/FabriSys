'use client';

import { useEffect, useState, useCallback } from 'react';
import { setActiveLocal } from '@/lib/activeLocal';
import { getOperationalContext } from '@/lib/operationalLocal';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Truck, CheckCircle, Package, MapPin, AlertCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/Button';
import { useAuth } from '@/lib/auth';

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

  // 1. Identificar a Loja Atual (prefere caixa aberto do usuário)
  const carregarLocal = useCallback(async () => {
    try {
      const ctx = await getOperationalContext(profile);
      if (ctx.caixa) {
        setLocalId(ctx.caixa.local_id ?? ctx.localId);
        setSelectedPdv(ctx.caixa.local_id ?? ctx.localId);
        return ctx.caixa.local_id ?? ctx.localId;
      }

      if (ctx.localId) {
        setLocalId(ctx.localId);
        setSelectedPdv(ctx.localId);
        return ctx.localId;
      }

      // Fallback: try to pick any PDV configured
      const { data: locais } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .limit(1);

      const meuLocal = locais?.[0];
      if (meuLocal) {
        setLocalId(meuLocal.id);
        setSelectedPdv(meuLocal.id);
        return meuLocal.id;
      }
    } catch (err) {
      console.error('Erro ao carregar local', err);
    }
    return null;
  }, [profile]);

  // Carregar lista de PDVs (para admins/ver todos)
  const carregarPdvs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .order('nome');
      setPdvOptions((data || []).map((d: any) => ({ id: d.id, nome: d.nome })));
      if (!selectedPdv && data && data.length > 0) setSelectedPdv(data[0].id);
    } catch (err) {
      console.error('Erro ao carregar PDVs', err);
    }
  }, [selectedPdv]);

  // 2. Carregar Cargas (Filtrando pela loja)
  const carregarCargas = useCallback(async (idLoja: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('distribuicao_pedidos')
        .select(
          `
          id, quantidade_solicitada, status, created_at, local_destino_id,
          local:locais(nome),
          ordem:ordens_producao(numero_op, produto_final_id)
        `
        )
        .neq('status', 'recebido')
        .eq('local_destino_id', idLoja)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalização dos dados e busca dos nomes dos produtos
      const norm = (data || []) as any[];
      const produtoIds = Array.from(
        new Set(norm.map((c) => String(c.ordem?.produto_final_id)).filter(Boolean))
      );
      const produtoMap: Record<string, { nome?: string }> = {};
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos_finais')
          .select('id, nome')
          .in('id', produtoIds);
        (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome }));
      }

      const formatted = norm.map((c: any) => {
        const ordem = c.ordem || {};
        return {
          ...c,
          ordem: {
            numero_op: ordem.numero_op,
            produto: { nome: produtoMap[String(ordem.produto_final_id)]?.nome },
          },
        };
      });

      setCargas(formatted);

      // Inicializar quantidades/observações com valores padrão
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
  }, []);

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
      const { data, error } = (await supabase.rpc('confirmar_recebimento_pdv', {
        p_distribuicao_id: id,
        p_quantidade: p_quant,
        p_observacao: p_obs,
      })) as any;
      if (error) throw error;

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
    try {
      setLoading(true);
      const { data, error } = (await supabase.rpc('confirmar_recebimento_pdv', {
        p_distribuicao_id: cargaSelecionada.id,
        p_quantidade: qtdRecebida,
        p_observacao: obsRecebimento || null,
      })) as any;
      if (error) throw error;

      toast.success('Entrada de estoque confirmada!');
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
                  <label className="block text-xs text-slate-500 uppercase mb-1">
                    Quantidade Recebida
                  </label>
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
              <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                Cancelar
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
