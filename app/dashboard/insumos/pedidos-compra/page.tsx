'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  FileText,
  Loader2,
  Printer,
  Save,
  Search,
  Truck,
  Clock,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/shared';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme'; // Importando o tema para a logo
import PageHeader from '@/components/ui/PageHeader';

// Exposição dev-only: tipagem para função de diagnóstico no `window`
declare global {
  interface Window {
    __runPedidosDiagnostico?: () => Promise<void> | undefined;
  }
}

// --- TIPOS ---
interface Insumo {
  id: string;
  nome: string;
  unidade_estoque: string;
  custo_por_ue: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ItemCarrinho {
  insumo: Insumo;
  quantidade: number;
  // Quando estivermos editando um pedido, conservamos o id do item no DB
  itemId?: string;
}

interface Pedido {
  id: string;
  created_at: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'finalizado';
  numero: number;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  data_prevista?: string;
  itens: {
    id: string;
    quantidade: number;
    insumo: { nome: string; unidade_estoque: string; custo_por_ue: number };
  }[];
}

export default function PedidosCompraPage() {
  const confirmDialog = useConfirm();
  const { profile, loading: authLoading } = useAuth();
  const { theme } = useTheme(); // Hook do tema

  // Dados Mestre
  const [insumosDisponiveis, setInsumosDisponiveis] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const fornecedoresMap = useMemo(
    () => new Map(fornecedores.map((f) => [String(f.id), f.nome])),
    [fornecedores]
  );
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // Estado do Pedido Atual (Edição/Criação)
  const [itensPedido, setItensPedido] = useState<ItemCarrinho[]>([]);
  const [cabecalhoPedido, setCabecalhoPedido] = useState({ fornecedor_id: '', data_prevista: '' });

  // Estado de Seleção de Item
  const [termoBusca, setTermoBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  // UI
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [editingPedidoNumero, setEditingPedidoNumero] = useState<number | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Estado para Impressão
  const [pedidoParaImpressao, setPedidoParaImpressao] = useState<Pedido | null>(null);

  // --- CARREGAMENTO INICIAL ---

  const fetchPedidos = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    // Tipagem interna para o retorno do Supabase
    type RawPedido = {
      id: number;
      created_at: string;
      status: string;
      numero: number;
      fornecedor_id?: string | number | null;
      fornecedores?: { id: string; nome: string } | null;
      data_prevista?: string;
      itens_pedido_compra?: Array<{
        id: number;
        quantidade: number;
        insumos?: { nome: string; unidade_estoque: string; custo_por_ue: number } | null;
      }>;
    };

    let rows: RawPedido[] = [];

    const res = await supabase
      .from('pedidos_compra')
      .select(
        `
                id, created_at, status, numero, fornecedor_id, data_prevista,
                fornecedores (id, nome),
                itens_pedido_compra (
                    id, quantidade,
                    insumos (nome, unidade_estoque, custo_por_ue)
                )
            `
      )
      .order('created_at', { ascending: false });

    if (res.error) {
      console.error('fetchPedidos: erro ao carregar pedidos:', res.error);
      toast.error('Erro ao carregar pedidos. Verifique se as migrations foram aplicadas.');
      return;
    }

    rows = (res.data ?? []) as unknown as RawPedido[];

    // Enriquecimento de dados (Fornecedores)
    const localMap = new Map<string, string>(fornecedores.map((f) => [String(f.id), f.nome]));
    const enrichedMap = localMap;

    const normalized = rows.map((p) => {
      const fornecedorNome =
        p.fornecedores?.nome ??
        (p.fornecedor_id
          ? (enrichedMap.get(String(p.fornecedor_id)) ?? `ID: ${String(p.fornecedor_id)}`)
          : 'Não Definido');

      return {
        id: String(p.id),
        created_at: p.created_at,
        status: p.status as Pedido['status'],
        numero: p.numero,
        fornecedor_id: p.fornecedor_id ? String(p.fornecedor_id) : undefined,
        fornecedor_nome: fornecedorNome,
        data_prevista: p.data_prevista,
        itens: (p.itens_pedido_compra || []).map((it) => ({
          id: String(it.id),
          quantidade: it.quantidade,
          insumo: it.insumos
            ? {
                nome: it.insumos.nome,
                unidade_estoque: it.insumos.unidade_estoque,
                custo_por_ue: it.insumos.custo_por_ue,
              }
            : { nome: 'Item Removido', unidade_estoque: 'un', custo_por_ue: 0 },
        })),
      };
    }) as Pedido[];

    setPedidos(normalized);
  }, [fornecedores, profile?.id]);

  const fetchDadosIniciais = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // 1. Insumos
      const { data: insumosData, error: insumosError } = await supabase
        .from('insumos')
        .select('id, nome, unidade_estoque, custo_por_ue')
        .order('nome');

      if (insumosError) {
        console.error('fetchDadosIniciais: erro ao carregar insumos', insumosError);
        toast.error('Erro ao carregar insumos. Verifique logs.');
      }

      // 2. Fornecedores
      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .order('nome');

      if (fornecedoresError) {
        console.warn('fetchDadosIniciais: erro ao carregar fornecedores', fornecedoresError);
        toast.error('Não foi possível carregar fornecedores. Rode o diagnóstico.');
      }

      setInsumosDisponiveis(insumosData || []);
      setFornecedores(fornecedoresData || []);

      // 3. Pedidos (carregamento inicial inline para evitar loop de dependências)
      try {
        type RawPedido = {
          id: number;
          created_at: string;
          status: string;
          numero: number;
          fornecedor_id?: string | number | null;
          fornecedores?: { id: string; nome: string } | null;
          data_prevista?: string;
          itens_pedido_compra?: Array<{
            id: number;
            quantidade: number;
            insumos?: { nome: string; unidade_estoque: string; custo_por_ue: number } | null;
          }>;
        };

        const pedidosRes = await supabase
          .from('pedidos_compra')
          .select(
            `
                  id, created_at, status, numero, fornecedor_id, data_prevista,
                  fornecedores (id, nome),
                  itens_pedido_compra (
                      id, quantidade,
                      insumos (nome, unidade_estoque, custo_por_ue)
                  )
              `
          )
          .order('created_at', { ascending: false });

        if (pedidosRes.error) {
          console.error('fetchDadosIniciais: erro ao carregar pedidos iniciais', pedidosRes.error);
          toast.error('Erro ao carregar pedidos iniciais.');
        } else {
          const rows = (pedidosRes.data ?? []) as unknown as RawPedido[];
          const localMap = new Map<string, string>(
            (fornecedoresData || []).map((f) => [String(f.id), f.nome])
          );

          const normalized = rows.map((p) => {
            const fornecedorNome =
              p.fornecedores?.nome ??
              (p.fornecedor_id
                ? (localMap.get(String(p.fornecedor_id)) ?? `ID: ${String(p.fornecedor_id)}`)
                : 'Não Definido');

            return {
              id: String(p.id),
              created_at: p.created_at,
              status: p.status as Pedido['status'],
              numero: p.numero,
              fornecedor_id: p.fornecedor_id ? String(p.fornecedor_id) : undefined,
              fornecedor_nome: fornecedorNome,
              data_prevista: p.data_prevista,
              itens: (p.itens_pedido_compra || []).map((it) => ({
                id: String(it.id),
                quantidade: it.quantidade,
                insumo: it.insumos
                  ? {
                      nome: it.insumos.nome,
                      unidade_estoque: it.insumos.unidade_estoque,
                      custo_por_ue: it.insumos.custo_por_ue,
                    }
                  : { nome: 'Item Removido', unidade_estoque: 'un', custo_por_ue: 0 },
              })),
            };
          }) as Pedido[];

          setPedidos(normalized);
        }
      } catch (err) {
        console.error('Erro inesperado ao carregar pedidos iniciais:', err);
        toast.error('Erro ao carregar pedidos iniciais.');
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      return;
    }

    void fetchDadosIniciais();
  }, [authLoading, fetchDadosIniciais, profile?.id]);

  // Diagnóstico (Dev)
  // Chamamos a função de carregamento inicial apenas uma vez no mount.
  // A função de diagnóstico é exposta apenas em ambiente de desenvolvimento.
  // A função `runDiagnostics` não está memoizada com `useCallback` por ser utilitária de dev.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        window.__runPedidosDiagnostico = runDiagnostics;
      } catch {
        /* ignore */
      }
      return () => {
        try {
          // cleanup: delete optional property from Window
          // window.__runPedidosDiagnostico is declared in the module scope
          delete (window as Window & { __runPedidosDiagnostico?: unknown }).__runPedidosDiagnostico;
        } catch {
          /* ignore */
        }
      };
    }
  }, []);

  // --- FILTRO DE PRODUTOS ---
  const insumosFiltrados = useMemo(() => {
    if (!termoBusca) return insumosDisponiveis;
    return insumosDisponiveis.filter((i) =>
      i.nome.toLowerCase().includes(termoBusca.toLowerCase())
    );
  }, [insumosDisponiveis, termoBusca]);

  // --- AÇÕES DO CARRINHO ---
  const adicionarItem = () => {
    if (!selecionadoId || quantidade <= 0) return;

    const insumoRef = insumosDisponiveis.find((i) => i.id === selecionadoId);
    if (!insumoRef) return;

    setItensPedido((prev) => {
      const existe = prev.find((i) => i.insumo.id === insumoRef.id);
      if (existe) {
        return prev.map((i) =>
          i.insumo.id === insumoRef.id ? { ...i, quantidade: i.quantidade + quantidade } : i
        );
      }
      return [...prev, { insumo: insumoRef, quantidade }];
    });

    setSelecionadoId('');
    setQuantidade(1);
    setTermoBusca('');
  };

  const removerItem = (id: string) => {
    setItensPedido((prev) => prev.filter((i) => i.insumo.id !== id));
  };

  const valorTotalCarrinho = itensPedido.reduce(
    (acc, item) => acc + item.quantidade * item.insumo.custo_por_ue,
    0
  );

  // --- SALVAR ORDEM ---
  const salvarOrdem = async () => {
    if (itensPedido.length === 0) {
      toast.error('O pedido está vazio.');
      return;
    }
    if (!cabecalhoPedido.fornecedor_id) {
      toast.error('Selecione um fornecedor.');
      return;
    }

    try {
      setSalvando(true);

      let pedidoId: string | number | undefined;

      // Verifica integridade dos itens
      const missingInsumos = itensPedido.filter(
        (item) => !insumosDisponiveis.some((i) => i.id === item.insumo.id)
      );
      if (missingInsumos.length > 0) {
        toast.error('Alguns insumos do pedido não existem mais. Atualize a página.');
        return;
      }

      if (editingPedidoId) {
        // UPDATE
        const updateRes = await supabase
          .from('pedidos_compra')
          .update({
            fornecedor_id: cabecalhoPedido.fornecedor_id || null,
            data_prevista: cabecalhoPedido.data_prevista || null,
          })
          .eq('id', editingPedidoId)
          .select();

        if (updateRes.error) throw updateRes.error;
        const updatedRow = (Array.isArray(updateRes.data) ? updateRes.data[0] : updateRes.data) as {
          id?: string;
        } | null;
        pedidoId = updatedRow?.id || editingPedidoId;

        // Diff de itens (Delete, Update, Insert)
        const { data: existingItems } = await supabase
          .from('itens_pedido_compra')
          .select('id')
          .eq('pedido_id', pedidoId);
        const existing = (existingItems as Array<{ id: string }>) || [];

        const toDeleteIds = existing
          .map((e) => e.id)
          .filter((id) => !itensPedido.some((ip) => ip.itemId === String(id)));

        if (toDeleteIds.length > 0) {
          await supabase.from('itens_pedido_compra').delete().in('id', toDeleteIds);
        }

        // Upsert manual para cada item (simplificado)
        for (const item of itensPedido) {
          if (item.itemId) {
            await supabase
              .from('itens_pedido_compra')
              .update({
                quantidade: item.quantidade,
                insumo_id: item.insumo.id,
                valor_unitario: item.insumo.custo_por_ue,
              })
              .eq('id', item.itemId);
          } else {
            await supabase.from('itens_pedido_compra').insert({
              pedido_id: pedidoId,
              insumo_id: item.insumo.id,
              quantidade: item.quantidade,
              valor_unitario: item.insumo.custo_por_ue,
            });
          }
        }
      } else {
        // INSERT
        const fornecedorValue =
          cabecalhoPedido.fornecedor_id === '' ? null : cabecalhoPedido.fornecedor_id;
        const insertRes = await supabase
          .from('pedidos_compra')
          .insert({
            status: 'pendente',
            fornecedor_id: fornecedorValue,
            data_prevista: cabecalhoPedido.data_prevista || null,
          })
          .select();

        if (insertRes.error) throw insertRes.error;
        const insertedRow = (
          Array.isArray(insertRes.data) ? insertRes.data[0] : insertRes.data
        ) as { id?: number } | null;
        pedidoId = insertedRow?.id;

        if (pedidoId) {
          const itensParaInserir = itensPedido.map((item) => ({
            pedido_id: pedidoId,
            insumo_id: item.insumo.id,
            quantidade: item.quantidade,
            valor_unitario: item.insumo.custo_por_ue,
          }));
          await supabase.from('itens_pedido_compra').insert(itensParaInserir);
        }
      }

      toast.success('Ordem de compra salva!');
      // Reset
      setItensPedido([]);
      setCabecalhoPedido({ fornecedor_id: '', data_prevista: '' });
      setEditingPedidoId(null);
      setEditingPedidoNumero(null);
      await fetchPedidos();
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    const { error } = await supabase
      .from('pedidos_compra')
      .update({ status: novoStatus })
      .eq('id', id);
    if (!error) {
      toast.success(`Status alterado para ${novoStatus}`);
      await fetchPedidos();
    }
  };

  const deletarPedido = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Pedido',
      message: 'Confirma a exclusão deste pedido de compra? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;
    const { error } = await supabase.from('pedidos_compra').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Pedido excluído');
      if (String(editingPedidoId) === String(id)) {
        setEditingPedidoId(null);
        setItensPedido([]);
      }
      await fetchPedidos();
    }
  };

  const editarPedido = (pedido: Pedido) => {
    setCabecalhoPedido({
      fornecedor_id: pedido.fornecedor_id || '',
      data_prevista: pedido.data_prevista || '',
    });

    const mapped = (pedido.itens || [])
      .map((it) => {
        const insRef = insumosDisponiveis.find((i) => i.nome === it.insumo?.nome);
        if (!insRef) return null;
        return { insumo: insRef, quantidade: it.quantidade, itemId: it.id } as ItemCarrinho;
      })
      .filter((v): v is ItemCarrinho => v !== null);

    setItensPedido(mapped);
    setEditingPedidoId(String(pedido.id));
    setEditingPedidoNumero(pedido.numero || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- LÓGICA DE IMPRESSÃO ---
  const handleImprimir = (pedido: Pedido) => {
    setPedidoParaImpressao(pedido);
    // Pequeno delay para garantir que o DOM do overlay renderizou antes de chamar o print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Diagnóstico
  const runDiagnostics = async () => {
    setDiagLoading(true);
    const toastId = toast.loading('Executando diagnóstico...');
    try {
      const [fRes, pRes] = await Promise.all([
        supabase.from('fornecedores').select('id, nome').limit(5),
        supabase.from('pedidos_compra').select('id').limit(5),
      ]);
      toast.dismiss(toastId);
      toast.success(
        `Conexão OK. Fornecedores: ${fRes.data?.length}, Pedidos: ${pRes.data?.length}`
      );
    } catch {
      toast.dismiss(toastId);
      toast.error('Erro no diagnóstico');
    } finally {
      setDiagLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'finalizado':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      {/* Cabeçalho da Página (Escondido na impressão) */}
      <div className="print:hidden">
        {!loading && fornecedores.length === 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 mb-4">
            Não há fornecedores carregados — verifique permissões.
          </div>
        )}

        <PageHeader
          title="Gestão de Compras"
          description="Emissão e controle de ordens de compra por fornecedor."
          icon={ShoppingCart}
        >
          <div className="flex items-center gap-3">
            {editingPedidoId && (
              <div className="text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded font-medium">
                Editando pedido #{editingPedidoNumero ?? editingPedidoId}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setItensPedido([]);
                  setCabecalhoPedido({ fornecedor_id: '', data_prevista: '' });
                  setEditingPedidoId(null);
                  setEditingPedidoNumero(null);
                }}
                disabled={itensPedido.length === 0}
                icon={Trash2}
              >
                Limpar
              </Button>
              <Button
                onClick={salvarOrdem}
                disabled={itensPedido.length === 0 || salvando}
                loading={salvando}
                icon={Save}
              >
                {editingPedidoId ? 'Salvar Alterações' : 'Emitir Ordem'}
              </Button>
              {profile?.role === 'master' && (
                <Button
                  variant="secondary"
                  onClick={runDiagnostics}
                  disabled={diagLoading}
                  className="text-xs h-8 px-3"
                >
                  Diagnóstico
                </Button>
              )}
            </div>
          </div>
        </PageHeader>

        {/* ÁREA DE CRIAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: CONFIGURAÇÃO E SELEÇÃO */}
          <div className="lg:col-span-1 space-y-4">
            {/* Card 1: Cabeçalho do Pedido */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Truck size={18} className="text-blue-500" /> Dados do Pedido
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Fornecedor
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                    value={cabecalhoPedido.fornecedor_id}
                    onChange={(e) =>
                      setCabecalhoPedido({ ...cabecalhoPedido, fornecedor_id: e.target.value })
                    }
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Previsão de Entrega
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-blue-500"
                    value={cabecalhoPedido.data_prevista}
                    onChange={(e) =>
                      setCabecalhoPedido({ ...cabecalhoPedido, data_prevista: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Adicionar Produtos */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Plus size={18} className="text-orange-500" /> Adicionar Itens
              </h3>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar produto..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-orange-500 mb-2"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                  />
                </div>

                <div>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                    value={selecionadoId}
                    onChange={(e) => setSelecionadoId(e.target.value)}
                    size={5}
                  >
                    {insumosFiltrados.length === 0 ? (
                      <option disabled>Nenhum produto encontrado</option>
                    ) : (
                      insumosFiltrados.map((i) => (
                        <option key={i.id} value={i.id} className="py-1">
                          {i.nome} ({i.unidade_estoque})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-orange-500"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={adicionarItem}
                      disabled={!selecionadoId}
                      className="h-[38px] w-full"
                    >
                      Incluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: RESUMO DO PEDIDO */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} /> Rascunho da Ordem
                </h3>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                  {itensPedido.length} itens
                </span>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/30">
                {itensPedido.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                    <ShoppingCart size={48} className="opacity-10 mb-2" />
                    <p>Selecione fornecedor e produtos para começar.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 border-b text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3 text-right">Qtd</th>
                        <th className="px-4 py-3 text-right">Unit. (Est.)</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {itensPedido.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {item.insumo.nome}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min={1}
                                value={item.quantidade}
                                onChange={(e) => {
                                  const q = Number(e.target.value) || 0;
                                  setItensPedido((prev) =>
                                    prev.map((it) =>
                                      it.insumo.id === item.insumo.id
                                        ? { ...it, quantidade: q }
                                        : it
                                    )
                                  );
                                }}
                                className="w-[80px] text-right rounded border border-slate-200 p-1 text-sm bg-white"
                              />
                              <span className="text-xs text-slate-400">
                                {item.insumo.unidade_estoque}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            R$ {item.insumo.custo_por_ue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-800 font-bold">
                            R$ {(item.quantidade * item.insumo.custo_por_ue).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removerItem(item.insumo.id)}
                              className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 text-sm">Fornecedor:</span>
                  <span className="font-medium text-slate-800">
                    {fornecedoresMap.get(String(cabecalhoPedido.fornecedor_id)) || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-800 text-lg font-bold">Total Estimado</span>
                  <span className="text-2xl font-bold text-blue-600">
                    R$ {valorTotalCarrinho.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE PEDIDOS RECENTES */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" /> Histórico de Pedidos
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto text-slate-400" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-8 text-center border rounded-xl bg-slate-50 text-slate-400">
              Nenhum pedido registrado.
            </div>
          ) : (
            <div className="space-y-4">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold text-sm">
                        #{pedido.numero || pedido.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-lg">
                            {pedido.fornecedor_nome || 'Fornecedor Não Identificado'}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(pedido.status)}`}
                          >
                            {pedido.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <span>Emitido: {new Date(pedido.created_at).toLocaleDateString()}</span>
                          {pedido.data_prevista && (
                            <span className="text-orange-600 font-medium">
                              • Entrega: {new Date(pedido.data_prevista).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      {pedido.status === 'pendente' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => atualizarStatus(pedido.id, 'aprovado')}
                            className="text-xs h-8 px-3 text-green-700 hover:bg-green-50 border-green-200"
                          >
                            Aprovar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => editarPedido(pedido)}
                            className="text-xs h-8 px-3"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => deletarPedido(pedido.id)}
                            className="text-xs h-8 px-3 text-red-700 hover:bg-red-50 border-red-200"
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      {/* BOTÃO IMPRIMIR: Chama a nova função com o pedido específico */}
                      <Button
                        variant="secondary"
                        onClick={() => handleImprimir(pedido)}
                        className="text-xs h-8 px-3"
                        icon={Printer}
                      >
                        Imprimir
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded p-3 text-sm">
                    <ul className="space-y-1">
                      {pedido.itens?.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between text-slate-700 border-b border-slate-200 last:border-0 pb-1 last:pb-0"
                        >
                          <span>{item.insumo?.nome}</span>
                          <span className="font-mono text-xs">
                            {item.quantidade} {item.insumo?.unidade_estoque} x R${' '}
                            {item.insumo?.custo_por_ue?.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-right font-bold text-slate-800">
                      Total Pedido: R${' '}
                      {pedido.itens
                        ?.reduce((acc, i) => acc + i.quantidade * (i.insumo?.custo_por_ue || 0), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- OVERLAY DE IMPRESSÃO (SÓ APARECE AO IMPRIMIR) --- */}
      {pedidoParaImpressao && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 w-screen h-screen overflow-visible">
          {/* Cabeçalho Impressão */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <img
                src={theme?.company_logo_url ?? theme?.logo_url ?? '/logo.png'}
                alt="Logo"
                className="h-16 w-auto object-contain grayscale"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div>
                <h1 className="text-3xl font-bold text-black uppercase tracking-tight">
                  Pedido de Compra
                </h1>
                <p className="text-sm text-gray-600 font-medium">
                  {theme?.name || 'Confectio System'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-black">
                Nº PEDIDO: #{pedidoParaImpressao.numero || pedidoParaImpressao.id}
              </p>
              <p className="text-xs text-gray-500">
                Emissão: {new Date(pedidoParaImpressao.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Dados do Fornecedor */}
          <div className="mb-6 border border-gray-300 p-4 rounded bg-gray-50">
            <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Fornecedor</h3>
            <p className="text-xl font-bold text-black">{pedidoParaImpressao.fornecedor_nome}</p>
            {pedidoParaImpressao.data_prevista && (
              <p className="text-sm text-black mt-1">
                Previsão de Entrega:{' '}
                <strong>
                  {new Date(pedidoParaImpressao.data_prevista).toLocaleDateString('pt-BR')}
                </strong>
              </p>
            )}
          </div>

          {/* Tabela de Itens */}
          <table className="w-full text-sm text-left border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 font-bold text-black uppercase">Item</th>
                <th className="py-2 text-right font-bold text-black uppercase">Qtd</th>
                <th className="py-2 text-right font-bold text-black uppercase">Unidade</th>
                <th className="py-2 text-right font-bold text-black uppercase">Valor Est.</th>
                <th className="py-2 text-right font-bold text-black uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {pedidoParaImpressao.itens.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-black">{item.insumo.nome}</td>
                  <td className="py-2 text-right text-black font-mono">{item.quantidade}</td>
                  <td className="py-2 text-right text-black">{item.insumo.unidade_estoque}</td>
                  <td className="py-2 text-right text-black">
                    R$ {item.insumo.custo_por_ue.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-black font-bold">
                    R$ {(item.quantidade * item.insumo.custo_por_ue).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td colSpan={4} className="py-2 text-right font-bold text-black uppercase">
                  Total Geral:
                </td>
                <td className="py-2 text-right font-bold text-xl text-black">
                  R${' '}
                  {pedidoParaImpressao.itens
                    .reduce((acc, i) => acc + i.quantidade * i.insumo.custo_por_ue, 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Rodapé / Assinatura */}
          <div className="mt-12 flex justify-between gap-10">
            <div className="border-t border-black w-1/2 pt-2 text-center text-sm text-black">
              Responsável pela Compra
            </div>
            <div className="border-t border-black w-1/2 pt-2 text-center text-sm text-black">
              Recebido por
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
}
