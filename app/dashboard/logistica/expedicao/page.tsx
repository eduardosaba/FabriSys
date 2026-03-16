'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/shared';
import Loading from '@/components/ui/Loading';
import {
  Truck,
  Package,
  CheckCircle2,
  X,
  History,
  ClipboardList,
  Printer,
  ExternalLink,
  Search,
  Filter,
  Calendar,
  LayoutGrid,
  Rows,
} from 'lucide-react';
import { Warehouse } from 'lucide-react';
import Image from 'next/image';
import getImageUrl from '@/lib/getImageUrl';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function ExpedicaoPage() {
  const { profile, loading: authLoading } = useAuth();
  // Fallback confirm helper used across this file
  const confirmAction = async (message: string) => {
    if (typeof window !== 'undefined') return window.confirm(message);
    return false;
  };

  // Estados de UI
  const [activeTab, setActiveTab] = useState<'despacho' | 'historico'>('despacho');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState<'trello' | 'vertical'>('trello');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Estados de Dados
  const [fabrica, setFabrica] = useState<{ id: string; nome: string } | null>(null);
  const [lojas, setLojas] = useState<any[]>([]);
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<any[]>([]);
  const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
  const [locaisMap, setLocaisMap] = useState<Record<string, string>>({});
  const [produtosMap, setProdutosMap] = useState<Record<string, string>>({});
  const [selectedPdvs, setSelectedPdvs] = useState<Record<string, boolean>>({});

  // Estados de Filtro (Histórico)
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroPdv, setFiltroPdv] = useState('todos');

  // 1. Carregar Dados Iniciais
  const carregarDados = useCallback(async () => {
    if (authLoading || !profile?.organization_id) return;

    try {
      setLoading(true);

      // A. Carregar Fábrica
      const { data: fab } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('organization_id', profile.organization_id)
        .eq('tipo', 'fabrica')
        .maybeSingle();

      if (fab) setFabrica(fab);

      // B. Carregar PDVs
      const { data: listaLojas } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('organization_id', profile.organization_id)
        .eq('tipo', 'pdv')
        .order('nome');
      setLojas(listaLojas || []);

      // C. Carregar Distribuições Pendentes (Painel)
      // Usar view `v_expedicao_disponivel` para filtrar no banco apenas OP concluídas
      const { data: distribView, error: distribErr } = await supabase
        .from('v_expedicao_disponivel')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true });

      if (distribErr) {
        console.error('Erro ao carregar expedição (view):', distribErr);
      } else if (distribView) {
        setOrdensFinalizadas(
          distribView.map((d: any) => ({
            id: d.id,
            id_op: d.ordem_producao_id,
            numero_op: d.numero_op,
            quantidade_prevista: d.quantidade_solicitada,
            local_destino_id: d.local_destino_id,
            produto_nome: d.produto_nome || 'Produto Indefinido',
            produto_id: d.produto_id,
          }))
        );
      }

      // D. Carregar Histórico (Tudo que não é pendente)
      const { data: hist } = await supabase
        .from('distribuicao_pedidos')
        .select(
          `
          id, 
          quantidade_solicitada, 
          local_destino_id, 
          status, 
          created_at,
          ordem:ordens_producao(numero_op, produto:produtos_finais(nome))
        `
        )
        .eq('organization_id', profile.organization_id)
        .neq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(100);

      setDistribuicoes(hist || []);

      // Mapas auxiliares para facilitar visualização
      const pMap: Record<string, string> = {};
      const lMap: Record<string, string> = {};
      listaLojas?.forEach((l) => (lMap[l.id] = l.nome));
      setLocaisMap(lMap);
    } catch (error) {
      console.error('Erro ao carregar expedição:', error);
      toast.error('Falha ao sincronizar dados.');
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados, reloadKey]);

  // 2. Ações de Envio
  const handleEnviarLote = async (pdvId: string, itens: any[]) => {
    if (!fabrica?.id) return toast.error('Fábrica não configurada. Verifique o local da fábrica.');
    const selecionados = itens.filter((it) => selectedPdvs[`${pdvId}-${it.id}`]);
    if (!selecionados.length) return toast.error('Selecione os itens no card.');

    const toastId = toast.loading('Processando saída de estoque...');
    setEnviando(true);

    try {
      for (const item of selecionados) {
        // Log de debug: mostra IDs usados na operação (verifique no console do navegador)
        console.log('Tentando enviar item:', {
          produto: item.produto_nome || item.produto_id,
          qtd_enviar: item.quantidade_prevista,
          id_fabrica: fabrica?.id, // 🎯 Verifique se este ID aparece no console F12
          id_pdv: pdvId,
        });
        console.log('Dados do Envio:', {
          produto: item.produto_id,
          quantidade: item.quantidade_prevista,
          fabrica_id: fabrica?.id,
          pdv_id: pdvId,
        });

        // RPC: Processar saída atômica (fábrica -> PDV)
        const { data: rpcData, error: rpcError } = await supabase.rpc('processar_saida_expedicao', {
          p_produto_id: item.produto_id,
          p_quantidade: item.quantidade_prevista,
          p_fabrica_id: fabrica.id,
          p_pdv_id: pdvId,
          p_org_id: profile?.organization_id,
        });

        if (rpcError) throw new Error(rpcError.message || String(rpcError));

        const rpcResult = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (rpcResult && (rpcResult.success === false || rpcResult.status === 'error')) {
          throw new Error(rpcResult.message || 'Erro na operação de estoque');
        }

        // Atualizar status na tabela de distribuição e OP — usar apenas update por id (evita on_conflict)
        const quantidadeAtendida =
          item.quantidade_prevista ?? item.quantidade_solicitada ?? item.quantidade ?? 0;
        await supabase
          .from('distribuicao_pedidos')
          .update({
            status: 'enviado',
            quantidade_atendida: quantidadeAtendida,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (item.id_op) {
          await supabase
            .from('ordens_producao')
            .update({ status_logistica: 'em_transito', updated_at: new Date().toISOString() })
            .eq('id', item.id_op);
        }
      }

      toast.success('Carga enviada com sucesso!', { id: toastId });
      setReloadKey((prev) => prev + 1);
      setSelectedPdvs({});
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'Falha ao enviar carga'}`, { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  // 3. Romaneio (Impressão)
  const gerarRomaneioPdf = (lojaNome: string, itens: any[]) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    const rows = itens
      .map(
        (it, idx) => `
      <tr>
        <td style="padding:8px; border:1px solid #ddd; text-align:center">${idx + 1}</td>
        <td style="padding:8px; border:1px solid #ddd">${it.produto_nome || it.ordem?.produto?.nome}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:center"><strong>${it.quantidade_prevista || it.quantidade_solicitada}</strong></td>
        <td style="padding:8px; border:1px solid #ddd; text-align:center">#${it.numero_op || it.ordem?.numero_op}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px">
            <h2>ROMANEIO DE EXPEDIÇÃO</h2>
            <span>Data: ${dataHora}</span>
          </div>
          <p><strong>Destino:</strong> ${lojaNome}</p>
          <table style="width:100%; border-collapse:collapse; margin-top:20px">
            <thead>
              <tr style="background:#f2f2f2">
                <th style="padding:8px; border:1px solid #ddd">Item</th>
                <th style="padding:8px; border:1px solid #ddd">Produto</th>
                <th style="padding:8px; border:1px solid #ddd">Qtd</th>
                <th style="padding:8px; border:1px solid #ddd">OP</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:50px; display:flex; justify-content:space-around">
            <div style="border-top:1px solid #000; width:200px; text-align:center">Ass. Expedição</div>
            <div style="border-top:1px solid #000; width:200px; text-align:center">Ass. Motorista/Loja</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
  };

  // Filtro de Histórico
  const distribuicoesFiltradas = distribuicoes.filter((d) => {
    const dataEnvio = new Date(d.created_at).toISOString().split('T')[0];
    const bateDataInicio = filtroDataInicio ? dataEnvio >= filtroDataInicio : true;
    const bateDataFim = filtroDataFim ? dataEnvio <= filtroDataFim : true;
    const batePdv = filtroPdv !== 'todos' ? d.local_destino_id === filtroPdv : true;
    return bateDataInicio && bateDataFim && batePdv;
  });

  // Agrupamento Trello
  const ordensPorPdv: Record<string, any[]> = {};
  lojas.forEach((l) => (ordensPorPdv[l.id] = []));
  ordensFinalizadas.forEach((item) => {
    if (item.local_destino_id && ordensPorPdv[item.local_destino_id]) {
      ordensPorPdv[item.local_destino_id].push(item);
    }
  });

  if (loading && !reloadKey) return <Loading />;

  return (
    <div
      className={`flex flex-col gap-4 transition-all ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-100 p-4 overflow-hidden' : 'p-6 max-w-7xl mx-auto'}`}
    >
      <Toaster position="top-right" />

      <PageHeader
        title="Expedição & Logística"
        description="Controle o fluxo de saída da fábrica para as lojas."
        icon={Truck}
      >
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'despacho' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('despacho')}
            className="gap-2"
          >
            <ClipboardList size={18} /> Painel
          </Button>
          <Button
            variant={activeTab === 'historico' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('historico')}
            className="gap-2"
          >
            <History size={18} /> Histórico
          </Button>
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <Button variant="secondary" onClick={() => setIsFullScreen(!isFullScreen)}>
            {isFullScreen ? <X size={18} /> : <ExternalLink size={18} />}
          </Button>
        </div>
      </PageHeader>

      {activeTab === 'despacho' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Visualização:
              </span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('trello')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${viewMode === 'trello' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                >
                  <LayoutGrid size={14} /> TRELLO
                </button>
                <button
                  onClick={() => setViewMode('vertical')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${viewMode === 'vertical' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                >
                  <Rows size={14} /> LISTA
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              <Warehouse size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-800">
                Origem: {fabrica?.nome || 'Fábrica Principal'}
              </span>
            </div>
          </div>

          <div
            className={`flex-1 flex ${viewMode === 'trello' ? 'flex-row overflow-x-auto gap-6' : 'flex-col gap-4'} pb-6 custom-scrollbar items-start`}
          >
            {lojas.map((loja) => {
              const itens = ordensPorPdv[loja.id] || [];
              const selecionadosCount = itens.filter(
                (it) => selectedPdvs[`${loja.id}-${it.id}`]
              ).length;

              return (
                <div
                  key={loja.id}
                  className={`${viewMode === 'trello' ? 'min-w-[320px] max-w-[320px]' : 'w-full'} flex flex-col bg-slate-200/50 rounded-2xl border border-slate-300 shadow-sm max-h-[75vh]`}
                >
                  <div className="p-4 bg-white rounded-t-2xl border-b flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{loja.nome}</h3>
                      <p className="text-[10px] font-black text-blue-500 uppercase">
                        {itens.length} pendentes
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => gerarRomaneioPdf(loja.nome, itens)}
                      title="Imprimir Romaneio Pendente"
                    >
                      <Printer size={14} />
                    </Button>
                  </div>

                  <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar">
                    {itens.length === 0 ? (
                      <div className="py-12 text-center opacity-30 flex flex-col items-center">
                        <Package size={40} />
                        <p className="text-xs font-bold mt-2">Nenhuma carga</p>
                      </div>
                    ) : (
                      itens.map((item) => (
                        <div
                          key={item.id}
                          onClick={() =>
                            setSelectedPdvs((prev) => ({
                              ...prev,
                              [`${loja.id}-${item.id}`]: !prev[`${loja.id}-${item.id}`],
                            }))
                          }
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-95 bg-white shadow-sm hover:border-blue-300 ${selectedPdvs[`${loja.id}-${item.id}`] ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-slate-400">
                              OP #{item.numero_op}
                            </span>
                            {selectedPdvs[`${loja.id}-${item.id}`] && (
                              <CheckCircle2 size={16} className="text-blue-500" />
                            )}
                          </div>
                          <h4 className="font-bold text-slate-700 text-sm">{item.produto_nome}</h4>
                          <div className="mt-3 flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              Quantidade
                            </span>
                            <span className="text-xl font-black text-slate-800">
                              {item.quantidade_prevista}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {itens.length > 0 && (
                    <div className="p-3 bg-white border-t rounded-b-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                      <Button
                        className="w-full justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl shadow-lg shadow-blue-100"
                        disabled={selecionadosCount === 0 || enviando}
                        onClick={() => handleEnviarLote(loja.id, itens)}
                      >
                        {enviando ? <Loading /> : <Truck size={18} />}
                        Enviar Selecionados ({selecionadosCount})
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Filtros Histórico */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-2">
                <Filter size={12} /> Unidade Destino
              </label>
              <select
                value={filtroPdv}
                onChange={(e) => setFiltroPdv(e.target.value)}
                className="w-full p-3 border rounded-xl bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todas as Unidades</option>
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-2">
                <Calendar size={12} /> Período de:
              </label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="p-3 border rounded-xl bg-slate-50 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-2">
                Até:
              </label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="p-3 border rounded-xl bg-slate-50 outline-none"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setFiltroDataInicio('');
                setFiltroDataFim('');
                setFiltroPdv('todos');
              }}
              className="h-[50px] px-6 rounded-xl"
            >
              Limpar
            </Button>
          </div>

          {/* Tabela Histórico */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b">
                    <th className="px-6 py-5">Produto</th>
                    <th className="px-6 py-5 text-center">OP</th>
                    <th className="px-6 py-5 text-center">Quantidade</th>
                    <th className="px-6 py-5">Destino</th>
                    <th className="px-6 py-5">Data Envio</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distribuicoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    distribuicoesFiltradas.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                          {d.ordem?.produto?.nome || 'Produto'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">
                          #{d.ordem?.numero_op || 'S/N'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg text-sm">
                            {d.quantidade_solicitada}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {locaisMap[d.local_destino_id] || 'PDV'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(d.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${d.status === 'enviado' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                          >
                            {d.status === 'enviado' ? 'Em Trânsito' : 'Recebido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => gerarRomaneioPdf(locaisMap[d.local_destino_id], [d])}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Reimprimir Romaneio"
                          >
                            <Printer size={18} />
                          </button>
                          {d.status === 'enviado' && (
                            <button
                              className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all text-sm"
                              onClick={async () => {
                                const confirmed = await confirmAction(
                                  `Registrar retorno de ${d.quantidade_solicitada} do PDV ${locaisMap[d.local_destino_id] || d.local_destino_id}?`
                                );
                                if (!confirmed) return;
                                try {
                                  setEnviando(true);
                                  const { data, error } = (await supabase.rpc(
                                    'processar_retorno_sobra',
                                    {
                                      p_produto_id: d.produto_id,
                                      p_quantidade: d.quantidade_solicitada,
                                      p_pdv_id: d.local_destino_id,
                                      p_fabrica_id: d.local_origem_id,
                                      p_org_id: profile?.organization_id || null,
                                    } as any
                                  )) as any;
                                  if (error) throw error;
                                  if (data && data.success === false)
                                    throw new Error(data.message || 'Erro no retorno');
                                  await supabase
                                    .from('distribuicao_pedidos')
                                    .update({
                                      status: 'recebido',
                                      updated_at: new Date().toISOString(),
                                    })
                                    .eq('id', d.id);
                                  toast.success('Retorno registrado com sucesso');
                                  setReloadKey((k) => k + 1);
                                } catch (err) {
                                  console.error('Erro ao registrar retorno:', err);
                                  toast.error('Erro ao registrar retorno');
                                } finally {
                                  setEnviando(false);
                                }
                              }}
                              title="Registrar Retorno"
                            >
                              Retorno
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
