'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/shared'; // Ajustado para o padrão do seu projeto
import Loading from '@/components/ui/Loading';
import { Truck, ArrowRight, Package, Warehouse, CheckCircle2 } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function ExpedicaoPage() {
  const { profile } = useAuth();
  const [lojas, setLojas] = useState<any[]>([]);
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<any[]>([]);
  const [fabrica, setFabrica] = useState<{ id: string; nome?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Estado do Formulário
  const [ordemSelecionada, setOrdemSelecionada] = useState<string>('');
  const [lojaDestino, setLojaDestino] = useState('');
  const [quantidadeReal, setQuantidadeReal] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [saldoOrigem, setSaldoOrigem] = useState<number>(0);
  const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
  const [locaisMap, setLocaisMap] = useState<Record<string,string>>({});
  const [produtosMap, setProdutosMap] = useState<Record<string,string>>({});
  const [ordensHasDataExpedicao, setOrdensHasDataExpedicao] = useState(false);
  const [ordensHasStatusLogistica, setOrdensHasStatusLogistica] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDistribId, setHistoryDistribId] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      if (!profile?.organization_id) return;
      
      try {
        setLoading(true);

        // 1. Carregar a Fábrica de Origem
        const { data: fab } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile?.organization_id)
          .eq('tipo', 'fabrica')
          .maybeSingle();
        
        if (fab) setFabrica(fab);

        // 2. Buscar Ordens que estão no estágio 'concluido' no Kanban
        // Preferimos filtrar por `status_logistica != 'entregue'` (se a coluna existir).
        const createBaseQuery = () =>
          supabase
            .from('ordens_producao')
            .select(`
            id, 
            numero_op, 
            quantidade_prevista, 
            produto_final_id,
            produtos_finais!inner (nome, tipo)
          `)
            .eq('organization_id', profile?.organization_id)
            .in('estagio_atual', ['concluido', 'expedicao'])
            .eq('produtos_finais.tipo', 'final')
            .order('updated_at', { ascending: false });

        let ords: any[] | null = null;
        try {
          const res = await (createBaseQuery() as any).neq('status_logistica', 'entregue');
          if (res.error) throw res.error;
          ords = res.data ?? null;
        } catch (e) {
          // Fallback para bancos sem a coluna `status_logistica` — recria o builder
          const res2 = await createBaseQuery().neq('status', 'finalizada');
          if (res2.error) throw res2.error;
          ords = res2.data ?? null;
        }

        setOrdensFinalizadas(ords || []);

        // 3. Carregar PDVs de Destino
        const { data: listaLojas } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile.organization_id)
          .eq('tipo', 'pdv')
          .order('nome');

        setLojas(listaLojas || []);

        // 4. Carregar distribuições (envios) recentes — somente se soubermos a fábrica
        try {
          let list: any[] = [];
          if (fab?.id) {
            const { data: distribs } = await supabase
              .from('distribuicao_pedidos')
              .select('id, produto_id, quantidade_solicitada, local_origem_id, local_destino_id, status, created_at, observacao, quantidade_recebida, ordem:ordens_producao(numero_op, produto_final_id)')
              .eq('local_origem_id', fab.id)
              .order('created_at', { ascending: false })
              .limit(200);

            list = distribs || [];
            setDistribuicoes(list as any[]);
          } else {
            list = [];
            setDistribuicoes([]);
          }

          // Preload nomes de produtos e locais usados
          const produtoIds = Array.from(new Set((list as any[]).map(d => (d.produto_id || (d.ordem?.produto_final_id))).filter(Boolean)));
          const localIds = Array.from(new Set((list as any[]).flatMap(d => [d.local_origem_id, d.local_destino_id]).filter(Boolean)));

          if (produtoIds.length) {
            const { data: produtos } = await supabase.from('produtos_finais').select('id, nome').in('id', produtoIds);
            const map: Record<string,string> = {};
            (produtos || []).forEach((p: any) => map[p.id] = p.nome);
            setProdutosMap(map);
          }

          if (localIds.length) {
            const { data: locaisList } = await supabase.from('locais').select('id, nome').in('id', localIds);
            const map: Record<string,string> = {};
            (locaisList || []).forEach((l: any) => map[l.id] = l.nome);
            setLocaisMap(map);
          }
        } catch (err) {
          console.error('Erro ao carregar distribuições:', err);
        }

        // Verificar colunas de ordens_producao via RPC `has_column` (info_schema bloqueado pelo PostgREST)
        try {
          const { data: hasDataExp } = await supabase.rpc('has_column', { p_table_name: 'ordens_producao', p_column_name: 'data_expedicao' }) as any;
          const { data: hasStatusLog } = await supabase.rpc('has_column', { p_table_name: 'ordens_producao', p_column_name: 'status_logistica' }) as any;

          setOrdensHasDataExpedicao(Boolean(hasDataExp));
          setOrdensHasStatusLogistica(Boolean(hasStatusLog));
        } catch (err) {
          console.warn('Não foi possível verificar colunas de ordens_producao via RPC has_column:', err);
          setOrdensHasDataExpedicao(false);
          setOrdensHasStatusLogistica(false);
        }
      } catch (err) {
        console.error('Erro ao carregar expedição:', err);
        toast.error('Erro ao carregar dados da fábrica');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [profile]);

  // Ao selecionar uma OP, preenchemos automaticamente o produto e a quantidade sugerida
  const handleSelectOP = async (id: string) => {
    const op = ordensFinalizadas.find(o => o.id === id);
    if (op) {
      setOrdemSelecionada(id);
      setProdutoId(op.produto_final_id);
      setQuantidadeReal(op.quantidade_prevista.toString());
      toast.success(`OP ${op.numero_op} selecionada.`, { icon: '📦' });

      // Buscar saldo disponível na fábrica para este produto
      try {
        // Se não tivermos fábrica carregada, tente localizar uma agora (tipo 'fabrica' ou 'producao')
        let fabId = fabrica?.id;
        if (!fabId) {
          try {
            const { data: found } = await supabase
              .from('locais')
              .select('id, nome')
              .eq('organization_id', profile?.organization_id)
              .in('tipo', ['fabrica', 'producao'])
              .limit(1)
              .maybeSingle();

            if (found) {
              setFabrica(found);
              fabId = found.id;
            }
          } catch (innerErr) {
            console.warn('Busca alternativa por fábrica falhou:', innerErr);
          }
        }

        if (!fabId) {
          setSaldoOrigem(0);
          return;
        }

        const { data } = await supabase
          .from('estoque_produtos')
          .select('quantidade')
          .eq('local_id', fabId)
          .eq('produto_id', op.produto_final_id)
          .maybeSingle();

        setSaldoOrigem((data && (data as any).quantidade) || 0);
      } catch (err) {
        console.warn('Não foi possível buscar saldo da fábrica:', err);
        setSaldoOrigem(0);
      }
    }
  };

  const handleEnviar = async () => {
    if (!ordemSelecionada || !lojaDestino || !quantidadeReal) {
      return toast.error('Selecione a Ordem, o Destino e a Quantidade Real');
    }
    if (!fabrica?.id) {
      return toast.error('Fábrica de origem não encontrada.');
    }

    const selectedId = ordemSelecionada;
    const qtd = Number(parseFloat(quantidadeReal));
    if (!isFinite(qtd) || qtd <= 0) return toast.error('Quantidade inválida');
    if (saldoOrigem < qtd) return toast.error(`Saldo insuficiente na fábrica! Disponível: ${saldoOrigem}`);

    try {
      setEnviando(true);

      const payload = {
        p_produto_id: produtoId,
        p_quantidade: qtd,
        p_local_origem_id: fabrica.id,
        p_local_destino_id: lojaDestino,
        p_ordem_producao_id: selectedId,
      } as Record<string, any>;

      console.debug('Chamando RPC enviar_carga_loja com', payload);

      // 1. Chamada para a RPC que transfere o estoque da fábrica para o PDV
      const rpc = await supabase.rpc('enviar_carga_loja', payload) as any;
      if (rpc?.error) throw rpc.error;
      const rpcData = rpc.data ?? rpc;

      // 2. Atualizar a OP para tirá-la do fluxo de expedição e concluir o processo
      const updates: any = {
        status: 'finalizada',
        quantidade_produzida: parseFloat(quantidadeReal)
      };

      if (ordensHasStatusLogistica) updates.status_logistica = 'entregue';
      if (ordensHasDataExpedicao) updates.data_expedicao = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('ordens_producao')
        .update(updates)
        .eq('id', selectedId);

      if (updateError) throw updateError;

      toast.success('Produto despachado! Estoque do PDV atualizado.', {
        duration: 5000,
        icon: '🚚'
      });

      // Limpar formulário e atualizar lista (usar selectedId antes de limpar estados)
      setOrdensFinalizadas(prev => prev.filter(o => o.id !== selectedId));
      setOrdemSelecionada('');
      setLojaDestino('');
      setQuantidadeReal('');

    } catch (err: any) {
      console.error(err);
      toast.error('Erro no despacho: ' + (err?.message ?? String(err)));
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <Loading />;

  const canDispatch = Boolean(fabrica && saldoOrigem > 0);
  const disabledReason = !fabrica
    ? 'Fábrica de origem não encontrada.'
    : saldoOrigem <= 0
    ? `Saldo insuficiente na fábrica. Disponível: ${saldoOrigem}`
    : '';

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up max-w-5xl mx-auto">
      <Toaster position="top-right" />
      
      <PageHeader
        title="Expedição & Logística"
        description="Envie o que foi produzido para as prateleiras dos PDVs."
        icon={Truck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LADO ESQUERDO: LISTA DE OPs PRONTAS (VINDAS DO KANBAN) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
            <CheckCircle2 size={16} /> Prontos para Envio
          </h3>
          
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2">
            {ordensFinalizadas.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Package className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs text-slate-500 font-medium">Nenhuma ordem concluída no Kanban.</p>
              </div>
            )}

            {ordensFinalizadas.map((op) => (
              <button
                key={op.id}
                onClick={() => handleSelectOP(op.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  ordemSelecionada === op.id 
                  ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-100' 
                  : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    OP #{op.numero_op}
                  </span>
                  <ArrowRight size={14} className={ordemSelecionada === op.id ? 'text-blue-500' : 'text-slate-300'} />
                </div>
                <h4 className="font-bold text-slate-800 mt-2 line-clamp-1">{op.produtos_finais?.nome}</h4>
                <p className="text-xs text-slate-500 mt-1">Qtd. Pronta: <span className="font-bold text-slate-700">{op.quantidade_prevista} un</span></p>
              </button>
            ))}
          </div>
        </div>

        {/* LADO DIREITO: FORMULÁRIO DE DESPACHO */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl sticky top-6">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
              <div className="text-center group">
                <Warehouse size={40} className="mx-auto text-slate-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Origem: Fábrica</p>
              </div>
              <div className="flex-1 px-8">
                <div className="h-0.5 bg-slate-100 w-full relative">
                  <Truck 
                    size={24} 
                    className={`absolute -top-3 text-blue-600 transition-all duration-1000 ${ordemSelecionada ? 'left-full -translate-x-full' : 'left-0'}`} 
                  />
                </div>
              </div>
              <div className="text-center group">
                <Truck size={40} className="mx-auto text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Destino: PDV</p>
              </div>
            </div>

            <div className="space-y-6">
              {!ordemSelecionada ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium">Selecione uma ordem na lista ao lado para iniciar o despacho.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Produto a ser enviado</p>
                    <p className="text-lg font-black text-blue-900">
                      {ordensFinalizadas.find(o => o.id === ordemSelecionada)?.produtos_finais?.nome}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Loja de Destino (PDV)</label>
                    <select
                      className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                      value={lojaDestino}
                      onChange={(e) => setLojaDestino(e.target.value)}
                    >
                      <option value="">Selecione o PDV...</option>
                      {lojas.map((loja) => (
                        <option key={loja.id} value={loja.id}>{loja.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Quantidade Real Produzida</label>
                    <input
                      type="number"
                      className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:border-blue-500 outline-none transition-all font-bold text-blue-600 text-lg"
                      placeholder="0.00"
                      value={quantidadeReal}
                      onChange={(e) => setQuantidadeReal(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">* Ajuste se houve perda na produção.</p>
                    <p className="text-[10px] mt-1 text-blue-600 font-bold uppercase">Disponível na Fábrica: {saldoOrigem} un</p>
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <div title={!canDispatch ? disabledReason : ''}>
                      <Button
                        onClick={canDispatch ? handleEnviar : undefined}
                        loading={enviando}
                        disabled={!canDispatch}
                        className="w-full py-5 text-xl bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-2xl rounded-2xl"
                        icon={Package}
                      >
                        Despachar para Loja
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Distribuições enviadas */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Distribuições enviadas</h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase">
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">OP</th>
                  <th className="px-3 py-2">Quantidade</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Observação</th>
                  <th className="px-3 py-2">Enviado em</th>
                  <th className="px-3 py-2">Histórico</th>
                </tr>
              </thead>
              <tbody>
                {distribuicoes.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 text-sm">
                    <td className="px-3 py-3">{produtosMap[d.produto_id || (d.ordem?.produto_final_id)] || d.produto_id || (d.ordem?.produto_final_id)}</td>
                    <td className="px-3 py-3 text-xs font-bold">{d.ordem?.numero_op || '—'}</td>
                    <td className="px-3 py-3">{d.quantidade_solicitada}</td>
                    <td className="px-3 py-3">{locaisMap[d.local_origem_id] || d.local_origem_id}</td>
                    <td className="px-3 py-3">{locaisMap[d.local_destino_id] || d.local_destino_id}</td>
                    <td className="px-3 py-3">
                      {d.status === 'enviado' ? (
                        <span className="inline-block px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold">Pendente</span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">Confirmada</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-xl text-xs text-slate-600">{d.observacao || (d.quantidade_recebida && d.quantidade_recebida != d.quantidade_solicitada ? `Recebido: ${d.quantidade_recebida}` : '—')}</td>
                    <td className="px-3 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700"
                        onClick={async () => {
                          try {
                            setHistoryLoading(true);
                            setHistoryDistribId(d.id);
                            setHistoryOpen(true);
                            const { data } = await supabase
                              .from('movimentacao_estoque')
                              .select('id, produto_id, quantidade, tipo_movimento, origem, destino, observacao, referencia_id, created_at')
                              .eq('referencia_id', d.id)
                              .order('created_at', { ascending: false });
                            setHistoryRecords(data || []);
                          } catch (err) {
                            console.error('Erro ao carregar histórico:', err);
                            toast.error('Erro ao carregar histórico');
                          } finally {
                            setHistoryLoading(false);
                          }
                        }}
                      >
                        Ver histórico
                      </Button>
                    </td>
                  </tr>
                ))}
                {distribuicoes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-400">Nenhuma distribuição encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Histórico Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">Histórico de Movimentações</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Distribuição: {historyDistribId}</span>
                <Button size="sm" variant="cancel" onClick={() => { setHistoryOpen(false); setHistoryRecords([]); setHistoryDistribId(null); }}>Fechar</Button>
              </div>
            </div>

            {historyLoading ? (
              <div className="p-6 text-center">Carregando...</div>
            ) : historyRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Nenhum registro encontrado.</div>
            ) : (
              <div className="overflow-auto max-h-96">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="px-2 py-2">Data</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Quantidade</th>
                      <th className="px-2 py-2">Origem</th>
                      <th className="px-2 py-2">Destino</th>
                      <th className="px-2 py-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="px-2 py-2 text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</td>
                        <td className="px-2 py-2 text-sm">{h.tipo_movimento || h.tipo}</td>
                        <td className="px-2 py-2 text-sm">{h.quantidade}</td>
                        <td className="px-2 py-2 text-sm">{h.origem}</td>
                        <td className="px-2 py-2 text-sm">{h.destino}</td>
                        <td className="px-2 py-2 text-sm text-slate-600">{h.observacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}