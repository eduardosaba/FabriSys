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

  const carregarEstoqueFabrica = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);

      // 1. Localizar o ID da Fábrica
      const { data: fab, error: fabErr } = await supabase
        .from('locais')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('tipo', 'fabrica')
        .maybeSingle();

      if (fabErr) throw fabErr;
      if (!fab?.id) {
        setEstoque([]);
        return;
      }

      // 2. Buscar estoque direto de estoque_produtos (mais preciso)
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

      // 3. Buscar movimentos recentes (envios + movimentacoes)
      try {
        const [enviosRes, movRes] = await Promise.all([
          supabase
            .from('envios_historico')
            .select(
              'id, produto_id, quantidade, local_origem_id, local_destino_id, enviado_em, status, observacao, produto:produtos_finais(id,nome)'
            )
            .eq('organization_id', fab.id ? undefined : null) // no-op, keep shape
            .order('enviado_em', { ascending: false })
            .limit(50),
          supabase
            .from('movimentacoes_estoque')
            .select(
              'id, produto_id, quantidade, local_id, tipo, created_at, observacao, produto:produtos_finais(id,nome)'
            )
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        const envios = (enviosRes.data || []).map((e: any) => ({
          id: `env-${e.id}`,
          tipo: 'envio',
          produto: e.produto?.nome || null,
          quantidade: e.quantidade,
          origem: e.local_origem_id,
          destino: e.local_destino_id,
          data: e.enviado_em,
          observacao: e.observacao,
          status: e.status,
        }));

        const movs = (movRes.data || []).map((m: any) => ({
          id: `mov-${m.id}`,
          tipo: 'movimentacao',
          produto: m.produto?.nome || null,
          quantidade: m.quantidade,
          origem: m.local_id,
          destino: null,
          data: m.created_at,
          observacao: m.observacao,
          status: m.tipo,
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

  // Realtime: atualiza quando estoque_produtos muda
  useEffect(() => {
    const channel = supabase
      .channel('estoque_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, () => {
        void carregarEstoqueFabrica();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [carregarEstoqueFabrica]);

  const LOW_THRESHOLD = 10;
  const lowStock = estoque.filter((it) => Number(it.quantidade || 0) < LOW_THRESHOLD);

  if (loading && estoque.length === 0) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="Estoque Central (Fábrica)"
          description="Acompanhe o que está pronto para ser enviado."
          icon={Package}
        />
        <button
          onClick={() => void carregarEstoqueFabrica()}
          className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar Saldo
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg">
          <div className="flex justify-between items-center">
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
            <div>
              <button
                onClick={() =>
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                }
                className="bg-rose-600 text-white px-3 py-1 rounded-md text-sm"
              >
                Ver todos
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Filtrar por nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="bg-white px-6 py-2 rounded-xl border shadow-sm text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Produtos em Linha</p>
          <p className="text-xl font-black text-slate-800">{estoque.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Produto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                Saldo Disponível
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
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
              estoque.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.produto.imagem_url && (
                        <img
                          src={item.produto.imagem_url}
                          className="w-8 h-8 rounded object-cover"
                          alt=""
                        />
                      )}
                      <span className="font-bold text-slate-800">{item.produto.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-xl font-mono font-bold ${item.quantidade > 0 ? 'text-blue-600' : 'text-slate-300'}`}
                    >
                      {item.quantidade}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1 uppercase">un</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.quantidade > 10 ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        Pronto para Envio
                      </span>
                    ) : item.quantidade > 0 ? (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        Estoque Baixo
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        Produzir Urgente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Histórico de Entradas/Saídas */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h4 className="font-bold">Histórico de Entradas / Saídas</h4>
          <span className="text-sm text-slate-500">Últimos 50 registros</span>
        </div>
        <div className="p-4 overflow-x-auto">
          {movimentos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Nenhum movimento recente encontrado.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Produto</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Origem</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Destino</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimentos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(m.data).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {m.produto || m.produto_id}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{m.quantidade}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.origem}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.destino || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 uppercase">{m.tipo}</td>
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
