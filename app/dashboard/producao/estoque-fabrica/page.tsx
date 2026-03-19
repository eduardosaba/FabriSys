'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Package, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EstoqueFabricaPage() {
  const { profile } = useAuth();
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movimentos, setMovimentos] = useState<any[]>([]);

  const getStatusLogistica = (quantidade: number) => {
    if (quantidade > 10) {
      return {
        label: 'Pronto para Envio',
        className:
          'bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase',
      };
    }

    if (quantidade > 0) {
      return {
        label: 'Estoque Baixo',
        className:
          'bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase',
      };
    }

    return {
      label: 'Produzir Urgente',
      className:
        'bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase',
    };
  };

  const carregarEstoqueFabrica = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);

      const { data: fab, error: fabErr } = await supabase
        .from('locais')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('tipo', 'fabrica')
        .maybeSingle();

      if (fabErr) throw fabErr;
      if (!fab?.id) {
        setEstoque([]);
        setMovimentos([]);
        return;
      }

      const { data: estoques, error: estErr } = await supabase
        .from('estoque_produtos')
        .select(
          `
          quantidade,
          updated_at,
          produto:produtos_finais!inner(id, nome, imagem_url, ativo)
        `
        )
        .eq('local_id', fab.id)
        .eq('produto.ativo', true)
        .ilike('produto.nome', `%${searchTerm}%`)
        .order('quantidade', { ascending: false });

      if (estErr) throw estErr;

      setEstoque(estoques || []);

      try {
        const [enviosOrigemRes, enviosDestinoRes] = await Promise.all([
          supabase
            .from('envios_historico')
            .select(
              'id, produto_id, quantidade, local_origem_id, local_destino_id, enviado_em, status, observacao'
            )
            .eq('organization_id', profile.organization_id)
            .eq('local_origem_id', fab.id)
            .order('enviado_em', { ascending: false })
            .limit(50),
          supabase
            .from('envios_historico')
            .select(
              'id, produto_id, quantidade, local_origem_id, local_destino_id, enviado_em, status, observacao'
            )
            .eq('organization_id', profile.organization_id)
            .eq('local_destino_id', fab.id)
            .order('enviado_em', { ascending: false })
            .limit(50),
        ]);

        if (enviosOrigemRes.error) throw enviosOrigemRes.error;
        if (enviosDestinoRes.error) throw enviosDestinoRes.error;

        const enviosMap = new Map<string, any>();
        for (const item of [...(enviosOrigemRes.data || []), ...(enviosDestinoRes.data || [])]) {
          enviosMap.set(String(item.id), item);
        }
        const enviosData = Array.from(enviosMap.values())
          .sort((a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime())
          .slice(0, 50);

        const { data: movDataRaw, error: movErr } = await supabase
          .from('movimentacao_estoque')
          .select(
            'id, produto_id, quantidade, tipo_movimento, observacoes, data_movimento, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (movErr) throw movErr;

        const movData = movDataRaw || [];

        const produtoIds = Array.from(
          new Set(
            [...enviosData, ...movData]
              .map((item: any) => item?.produto_id)
              .filter((id): id is string => Boolean(id))
          )
        );

        let produtosById = new Map<string, string>();

        if (produtoIds.length > 0) {
          const { data: produtosData } = await supabase
            .from('produtos_finais')
            .select('id, nome')
            .in('id', produtoIds)
            .eq('organization_id', profile.organization_id);

          produtosById = new Map(
            (produtosData || []).map((p: any) => [String(p.id), String(p.nome)])
          );
        }

        const envios = (enviosData || []).map((e: any) => ({
          id: `env-${e.id}`,
          tipo: 'envio',
          produto: produtosById.get(String(e.produto_id)) || null,
          quantidade: e.quantidade,
          origem: e.local_origem_id,
          destino: e.local_destino_id,
          data: e.enviado_em,
          observacao: e.observacao,
          status: e.status,
        }));

        const movs = (movData || []).map((m: any) => ({
          id: `mov-${m.id}`,
          tipo: 'movimentacao',
          produto: produtosById.get(String(m.produto_id)) || null,
          quantidade: m.quantidade,
          origem: m.origem || '-',
          destino: null,
          data: m.created_at || m.data_movimento,
          observacao: m.observacoes,
          status: m.tipo_movimento,
        }));

        setMovimentos(
          [...envios, ...movs].sort(
            (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
          )
        );
      } catch (movErr) {
        console.debug('Erro ao carregar movimentos', movErr);
        setMovimentos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar estoque fábrica:', err);
      toast.error('Falha ao atualizar saldos.');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, searchTerm]);

  useEffect(() => {
    void carregarEstoqueFabrica();
  }, [carregarEstoqueFabrica]);

  useEffect(() => {
    const channel = supabase
      .channel('estoque_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, () => {
        void carregarEstoqueFabrica();
      })
      .subscribe();

    return () => {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [carregarEstoqueFabrica]);

  const LOW_THRESHOLD = 10;
  const lowStock = estoque.filter((it) => Number(it.quantidade || 0) < LOW_THRESHOLD);

  if (loading && estoque.length === 0) return <Loading />;

  return (
    <div className="space-y-6 p-3 md:p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <PageHeader
          title="Estoque Central (Fábrica)"
          description="Acompanhe o que está pronto para ser enviado."
          icon={Package}
        />
        <button
          onClick={() => void carregarEstoqueFabrica()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800 md:w-auto"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar Saldo
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="font-bold">Estoque baixo: {lowStock.length} produto(s)</div>
              <div className="text-sm text-rose-700/80">
                Ex.:{' '}
                {lowStock
                  .slice(0, 5)
                  .map((s) => s.produto.nome)
                  .join(', ')}
                {lowStock.length > 5 ? ` e mais ${lowStock.length - 5}` : ''}
              </div>
            </div>
            <button
              onClick={() =>
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
              }
              className="rounded-md bg-rose-600 px-3 py-1 text-sm text-white"
            >
              Ver todos
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-center gap-4 md:flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Filtrar por nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="rounded-xl border bg-white px-6 py-2 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-500">Produtos em Linha</p>
          <p className="text-xl font-black text-slate-800">{estoque.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="md:hidden">
          {estoque.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400">
              Nenhum produto com saldo encontrado.
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {estoque.map((item, idx) => {
                const status = getStatusLogistica(Number(item.quantidade || 0));
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-3">
                      {item.produto?.imagem_url && (
                        <img
                          src={item.produto.imagem_url}
                          className="h-8 w-8 rounded object-cover"
                          alt=""
                        />
                      )}
                      <span className="font-bold text-slate-800">{item.produto?.nome}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase text-slate-500">Saldo</div>
                        <div className="font-mono text-xl font-bold text-blue-600">
                          {item.quantidade}
                          <span className="ml-1 text-[10px] uppercase text-slate-400">un</span>
                        </div>
                      </div>
                      <span className={status.className}>{status.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Produto</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-slate-500">
                  Saldo Disponível
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-slate-500">
                  Status Logística
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {estoque.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                    Nenhum produto com saldo encontrado.
                  </td>
                </tr>
              ) : (
                estoque.map((item, idx) => {
                  const status = getStatusLogistica(Number(item.quantidade || 0));
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.produto?.imagem_url && (
                            <img
                              src={item.produto.imagem_url}
                              className="h-8 w-8 rounded object-cover"
                              alt=""
                            />
                          )}
                          <span className="font-bold text-slate-800">{item.produto?.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-xl font-mono font-bold ${item.quantidade > 0 ? 'text-blue-600' : 'text-slate-300'}`}
                        >
                          {item.quantidade}
                        </span>
                        <span className="ml-1 text-[10px] uppercase text-slate-400">un</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={status.className}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-4 md:px-6">
          <h4 className="font-bold">Histórico de Entradas / Saídas</h4>
          <span className="text-xs text-slate-500 md:text-sm">Últimos 50 registros</span>
        </div>

        <div className="p-3 md:hidden">
          {movimentos.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              Nenhum movimento recente encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {movimentos.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-1 text-xs text-slate-500">
                    {new Date(m.data).toLocaleString()}
                  </div>
                  <div className="font-bold text-slate-800">{m.produto || m.produto_id}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Qtd:</span>{' '}
                      <span className="font-mono text-slate-800">{m.quantidade}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tipo:</span>{' '}
                      <span className="uppercase text-slate-800">{m.tipo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Origem:</span> {m.origem}
                    </div>
                    <div>
                      <span className="text-slate-500">Destino:</span> {m.destino || '-'}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {m.observacao || m.status || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto p-4 md:block">
          {movimentos.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              Nenhum movimento recente encontrado.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Data</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Produto</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase text-slate-500">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Origem</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Destino</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Tipo</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-slate-500">Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimentos.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(m.data).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {m.produto || m.produto_id}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{m.quantidade}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.origem}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.destino || '-'}</td>
                    <td className="px-4 py-3 text-sm uppercase text-slate-600">{m.tipo}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {m.observacao || m.status || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
