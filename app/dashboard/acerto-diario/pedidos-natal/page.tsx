'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CalendarDays,
  Eye,
  Gift,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import { PADRAO_PRODUTOS, formatarData, type ProdutoCardapio } from '@/lib/cardapio-natal';
import {
  STATUS_PEDIDO,
  classeStatus,
  diaLocal,
  quantidadeItens,
  rotuloStatus,
  somaItens,
  totalGeral,
  type PedidoNatal,
} from '@/lib/cardapio-natal-pedidos';
import PedidoDetalhe from './PedidoDetalhe';
import PedidoEditor, { type DadosPedido } from './PedidoEditor';
import { brl, btnPrimario, btnSecundario, dataHora, inputCls } from './ui';

const TABELA = 'cardapio_natal_pedidos';
const LS_VISAO = 'pedidos-natal-visao';

type Ordem = 'recentes' | 'entrega';

interface Filtros {
  busca: string;
  status: string; // '' = todos
  recebimento: '' | 'retirada' | 'entrega';
  pedidoDe: string;
  pedidoAte: string;
  entregaDe: string;
  entregaAte: string;
  ordem: Ordem;
}

const FILTROS_VAZIOS: Filtros = {
  busca: '',
  status: '',
  recebimento: '',
  pedidoDe: '',
  pedidoAte: '',
  entregaDe: '',
  entregaAte: '',
  ordem: 'recentes',
};

function resumoItens(p: PedidoNatal, max = 2): string {
  const nomes = p.itens.slice(0, max).map((i) => `${i.qtd}x ${i.nome}`);
  const resto = p.itens.length - max;
  return nomes.join(', ') + (resto > 0 ? ` +${resto}` : '');
}

export default function PedidosNatalPage() {
  const { profile, loading: authLoading } = useAuth();
  const permitido = profile?.role === 'admin' || profile?.role === 'master';

  const [pedidos, setPedidos] = useState<PedidoNatal[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>(PADRAO_PRODUTOS);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [visao, setVisao] = useState<'lista' | 'grid'>('lista');
  const [ver, setVer] = useState<PedidoNatal | null>(null);
  const [editar, setEditar] = useState<{ pedido: PedidoNatal | null } | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_VISAO);
      if (v === 'grid' || v === 'lista') setVisao(v);
    } catch {
      /* ignore */
    }
  }, []);

  const mudarVisao = (v: 'lista' | 'grid') => {
    setVisao(v);
    try {
      localStorage.setItem(LS_VISAO, v);
    } catch {
      /* ignore */
    }
  };

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    const { data, error } = await supabase
      .from(TABELA)
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1000);
    if (error) {
      setSemTabela(true);
    } else {
      setSemTabela(false);
      setPedidos((data ?? []) as PedidoNatal[]);
    }
    if (!silencioso) setCarregando(false);
  }, []);

  useEffect(() => {
    if (!permitido) return;
    void carregar();
    // produtos do cardápio (para adicionar itens ao editar); cai nos padrões se a tabela estiver vazia
    void supabase
      .from('cardapio_natal_produtos')
      .select('*')
      .order('ordem')
      .then(({ data }) => {
        if (data?.length) setProdutos(data as ProdutoCardapio[]);
      });
    // atualização automática enquanto a aba estiver visível
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void carregar(true);
    }, 45_000);
    return () => clearInterval(t);
  }, [permitido, carregar]);

  // ---------------------------------------------------------------- filtros
  const filtrados = useMemo(() => {
    const q = filtros.busca.trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, '');
    const lista = pedidos.filter((p) => {
      if (filtros.status && p.status !== filtros.status) return false;
      if (filtros.recebimento && p.recebimento !== filtros.recebimento) return false;
      const dia = diaLocal(p.criado_em);
      if (filtros.pedidoDe && dia < filtros.pedidoDe) return false;
      if (filtros.pedidoAte && dia > filtros.pedidoAte) return false;
      if (filtros.entregaDe && (!p.data_entrega || p.data_entrega < filtros.entregaDe))
        return false;
      if (filtros.entregaAte && (!p.data_entrega || p.data_entrega > filtros.entregaAte))
        return false;
      if (q) {
        const texto =
          `${p.codigo} ${p.cliente_nome} ${p.itens.map((i) => i.nome).join(' ')}`.toLowerCase();
        const tel = (p.cliente_telefone ?? '').replace(/\D/g, '');
        if (!texto.includes(q) && !(qDigitos.length >= 4 && tel.includes(qDigitos))) return false;
      }
      return true;
    });
    if (filtros.ordem === 'entrega') {
      lista.sort((a, b) => (a.data_entrega ?? '9999').localeCompare(b.data_entrega ?? '9999'));
    }
    return lista;
  }, [pedidos, filtros]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of pedidos) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pedidos]);

  const somaFiltrados = useMemo(
    () =>
      filtrados
        .filter((p) => p.status !== 'cancelado')
        .reduce(
          (s, p) => s + totalGeral({ total: somaItens(p.itens), taxa_entrega: p.taxa_entrega }),
          0
        ),
    [filtrados]
  );

  const temFiltro =
    JSON.stringify({ ...filtros, ordem: '' }) !== JSON.stringify({ ...FILTROS_VAZIOS, ordem: '' });
  const setF = <K extends keyof Filtros>(k: K, v: Filtros[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  // ---------------------------------------------------------------- ações
  const alterarStatus = async (p: PedidoNatal, status: string) => {
    const anterior = p.status;
    const atualiza = (s: string) => {
      setPedidos((l) => l.map((x) => (x.id === p.id ? { ...x, status: s } : x)));
      setVer((v) => (v && v.id === p.id ? { ...v, status: s } : v));
    };
    atualiza(status);
    const { error } = await supabase
      .from(TABELA)
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq('id', p.id);
    if (error) {
      atualiza(anterior);
      toast.error(`Não foi possível alterar o status: ${error.message}`);
    } else {
      toast.success(`Pedido ${p.codigo}: ${rotuloStatus(status)}`);
    }
  };

  const excluir = async (p: PedidoNatal) => {
    if (
      !window.confirm(
        `Excluir o pedido ${p.codigo} de ${p.cliente_nome}? Essa ação não pode ser desfeita.`
      )
    )
      return;
    const { error } = await supabase.from(TABELA).delete().eq('id', p.id);
    if (error) return toast.error(`Erro ao excluir: ${error.message}`);
    setPedidos((l) => l.filter((x) => x.id !== p.id));
    setVer(null);
    toast.success('Pedido excluído.');
  };

  const salvar = async (dados: DadosPedido, id?: string): Promise<boolean> => {
    const agora = new Date().toISOString();
    if (id) {
      const { data, error } = await supabase
        .from(TABELA)
        .update({ ...dados, atualizado_em: agora })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        toast.error(`Erro ao salvar: ${error.message}`);
        return false;
      }
      setPedidos((l) => l.map((x) => (x.id === id ? (data as PedidoNatal) : x)));
      setVer((v) => (v && v.id === id ? (data as PedidoNatal) : v));
      toast.success('Pedido atualizado.');
      return true;
    }
    const { data, error } = await supabase
      .from(TABELA)
      .insert({ ...dados, origem: 'manual' })
      .select()
      .single();
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return false;
    }
    setPedidos((l) => [data as PedidoNatal, ...l]);
    toast.success('Pedido criado.');
    return true;
  };

  if (authLoading) return <div className="p-6 text-gray-500">Carregando…</div>;
  if (!permitido)
    return <div className="p-6 text-gray-500">Acesso restrito a administradores.</div>;

  // funções de render (não componentes): evitam remontar o <select> a cada atualização da lista
  const statusSelect = (p: PedidoNatal) => (
    <select
      value={p.status}
      onChange={(e) => void alterarStatus(p, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Status do pedido ${p.codigo}`}
      className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-semibold ${classeStatus(p.status)}`}
    >
      {STATUS_PEDIDO.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );

  const acoes = (p: PedidoNatal) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setVer(p)}
        aria-label={`Abrir pedido ${p.codigo}`}
        title="Abrir"
      >
        <Eye size={17} />
      </button>
      <button
        type="button"
        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setEditar({ pedido: p })}
        aria-label={`Editar pedido ${p.codigo}`}
        title="Editar"
      >
        <Pencil size={17} />
      </button>
      <button
        type="button"
        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        onClick={() => void excluir(p)}
        aria-label={`Excluir pedido ${p.codigo}`}
        title="Excluir"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Pedidos de Natal"
        description="Pedidos enviados pelo cardápio natalino (WhatsApp): acompanhe, edite e controle o status."
        icon={Gift}
      >
        <button
          type="button"
          className={btnSecundario}
          onClick={() => void carregar()}
          aria-label="Atualizar lista"
        >
          <RefreshCw size={16} /> Atualizar
        </button>
        <button type="button" className={btnPrimario} onClick={() => setEditar({ pedido: null })}>
          <Plus size={16} /> Novo pedido
        </button>
      </PageHeader>

      {semTabela && !carregando && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A tabela <code>cardapio_natal_pedidos</code> ainda não existe. Aplique a migração{' '}
          <code>syslari/migrations/2026-11-14_cardapio_natal_pedidos.sql</code> no Supabase e
          recarregue.
        </div>
      )}

      {/* Resumo por status (clicável) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          onClick={() => setF('status', '')}
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${filtros.status === '' ? 'border-red-700 bg-red-700 text-white' : 'border-gray-300 dark:border-gray-600'}`}
        >
          Todos ({pedidos.length})
        </button>
        {STATUS_PEDIDO.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setF('status', filtros.status === s.id ? '' : s.id)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${classeStatus(s.id)} ${filtros.status === s.id ? 'ring-2 ring-red-600' : ''}`}
          >
            {s.label} ({contagem[s.id] ?? 0})
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative text-sm font-medium xl:col-span-2">
            Buscar
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-[2.1rem] text-gray-400"
            />
            <input
              className={`${inputCls} mt-1 pl-9`}
              placeholder="Nº do pedido, nome, telefone ou produto"
              value={filtros.busca}
              onChange={(e) => setF('busca', e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Recebimento
            <select
              className={`${inputCls} mt-1`}
              value={filtros.recebimento}
              onChange={(e) => setF('recebimento', e.target.value as Filtros['recebimento'])}
            >
              <option value="">Todos</option>
              <option value="retirada">Retirada</option>
              <option value="entrega">Entrega</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Ordenar por
            <select
              className={`${inputCls} mt-1`}
              value={filtros.ordem}
              onChange={(e) => setF('ordem', e.target.value as Ordem)}
            >
              <option value="recentes">Pedidos mais recentes</option>
              <option value="entrega">Data de entrega (mais próxima)</option>
            </select>
          </label>
          <fieldset className="text-sm md:col-span-1 xl:col-span-2">
            <legend className="font-medium">Data do pedido</legend>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                aria-label="Pedidos a partir de"
                className={inputCls}
                value={filtros.pedidoDe}
                onChange={(e) => setF('pedidoDe', e.target.value)}
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                aria-label="Pedidos até"
                className={inputCls}
                value={filtros.pedidoAte}
                onChange={(e) => setF('pedidoAte', e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset className="text-sm md:col-span-1 xl:col-span-2">
            <legend className="font-medium">Data da entrega</legend>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                aria-label="Entregas a partir de"
                className={inputCls}
                value={filtros.entregaDe}
                onChange={(e) => setF('entregaDe', e.target.value)}
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                aria-label="Entregas até"
                className={inputCls}
                value={filtros.entregaAte}
                onChange={(e) => setF('entregaAte', e.target.value)}
              />
            </div>
          </fieldset>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{filtrados.length}</strong> pedido(s) · valor (sem cancelados):{' '}
            <strong>{brl(somaFiltrados)}</strong>
            {temFiltro && (
              <button
                type="button"
                className="ml-3 text-red-700 underline"
                onClick={() => setFiltros((f) => ({ ...FILTROS_VAZIOS, ordem: f.ordem }))}
              >
                Limpar filtros
              </button>
            )}
          </p>
          <div
            className="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              type="button"
              onClick={() => mudarVisao('lista')}
              aria-pressed={visao === 'lista'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold ${visao === 'lista' ? 'bg-red-700 text-white' : ''}`}
            >
              <List size={16} /> Lista
            </button>
            <button
              type="button"
              onClick={() => mudarVisao('grid')}
              aria-pressed={visao === 'grid'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold ${visao === 'grid' ? 'bg-red-700 text-white' : ''}`}
            >
              <LayoutGrid size={16} /> Grid
            </button>
          </div>
        </div>
      </div>

      {carregando && <p className="text-sm text-gray-500">Carregando pedidos…</p>}

      {!carregando && !semTabela && filtrados.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
          {pedidos.length === 0
            ? 'Nenhum pedido recebido ainda. Os pedidos enviados pelo cardápio aparecem aqui.'
            : 'Nenhum pedido encontrado com esses filtros.'}
        </div>
      )}

      {/* LISTA */}
      {visao === 'lista' && filtrados.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-100 text-left dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Pedido em</th>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  onClick={() => setVer(p)}
                >
                  <td className="px-3 py-2 font-mono font-semibold">{p.codigo}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dataHora(p.criado_em)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {p.data_entrega ? formatarData(p.data_entrega) : '—'}
                    <span className="ml-1 text-xs text-gray-500">
                      {p.recebimento === 'entrega' ? '(entrega)' : '(retirada)'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.cliente_nome}</div>
                    <div className="text-xs text-gray-500">{p.cliente_telefone}</div>
                  </td>
                  <td className="max-w-[18rem] px-3 py-2 text-gray-600 dark:text-gray-300">
                    {resumoItens(p)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                    {brl(totalGeral({ total: somaItens(p.itens), taxa_entrega: p.taxa_entrega }))}
                  </td>
                  <td className="px-3 py-2">{statusSelect(p)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {acoes(p)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GRID */}
      {visao === 'grid' && filtrados.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    className="font-mono text-base font-bold hover:underline"
                    onClick={() => setVer(p)}
                  >
                    Nº {p.codigo}
                  </button>
                  <p className="text-xs text-gray-500">{dataHora(p.criado_em)}</p>
                </div>
                {statusSelect(p)}
              </div>
              <div className="mt-2">
                <div className="font-semibold">{p.cliente_nome}</div>
                <div className="text-xs text-gray-500">{p.cliente_telefone}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={14} />{' '}
                  {p.data_entrega ? formatarData(p.data_entrega) : 'sem data'}
                </span>
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                  {p.recebimento === 'entrega' ? <MapPin size={14} /> : <Store size={14} />}
                  {p.recebimento === 'entrega' ? 'Entrega' : 'Retirada'}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">
                {resumoItens(p, 3)}{' '}
                <span className="text-xs text-gray-400">({quantidadeItens(p.itens)} un.)</span>
              </p>
              <div className="mt-3 flex items-center justify-between border-t pt-2 dark:border-gray-700">
                <strong className="text-red-800 dark:text-red-300">
                  {brl(totalGeral({ total: somaItens(p.itens), taxa_entrega: p.taxa_entrega }))}
                </strong>
                {acoes(p)}
              </div>
            </article>
          ))}
        </div>
      )}

      {ver && (
        <PedidoDetalhe
          pedido={ver}
          onFechar={() => setVer(null)}
          onEditar={() => setEditar({ pedido: ver })}
          onExcluir={() => void excluir(ver)}
          onStatus={(s) => void alterarStatus(ver, s)}
        />
      )}

      {editar && (
        <PedidoEditor
          key={editar.pedido?.id ?? 'novo'}
          pedido={editar.pedido}
          produtos={produtos}
          onSalvar={salvar}
          onFechar={() => setEditar(null)}
        />
      )}
    </div>
  );
}
