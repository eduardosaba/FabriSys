'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import { Truck, ArrowRight, Package, Warehouse } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function ExpedicaoPage() {
  const { profile } = useAuth();
  const [produtosFabrica, setProdutosFabrica] = useState<any[]>([]);
  const [produtosProduzidos, setProdutosProduzidos] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<any[]>([]);
  const [fabrica, setFabrica] = useState<{ id: string; nome?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Estado do Formulário
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [ordemSelecionada, setOrdemSelecionada] = useState<string | null>(null);
  const [lojaDestino, setLojaDestino] = useState('');
  const [quantidade, setQuantidade] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        // 0. Tentar identificar a fábrica da organização (se disponível)
        try {
          const q = supabase.from('locais').select('id, nome').eq('tipo', 'fabrica');
          if (profile?.organization_id) q.eq('organization_id', profile.organization_id);
          const { data: fab } = await q.maybeSingle();
          if (fab) setFabrica({ id: fab.id, nome: fab.nome });
        } catch (errFab) {
          if (typeof window !== 'undefined')
            console.warn(
              'Não foi possível carregar fábrica por organização, tentando sem filtro',
              errFab
            );
          try {
            const { data: fab } = await supabase
              .from('locais')
              .select('id, nome')
              .eq('tipo', 'fabrica')
              .maybeSingle();
            if (fab) setFabrica({ id: fab.id, nome: fab.nome });
          } catch (_) {
            // ignora
          }
        }

        // 1. Buscar ordens de produção finalizadas / concluídas e extrair produtos produzidos
        const { data: ords, error: errOrds } = await supabase
          .from('ordens_producao')
          .select(
            `
            id, numero_op, quantidade_prevista, status, estagio_atual,
            produto_final:produtos_finais(id, nome)
          `
          )
          .in('estagio_atual', ['concluido'])
          .or('status.eq.finalizada')
          .order('created_at', { ascending: false });

        if (errOrds) throw errOrds;

        const ordens = (ords || []).map((o: any) => {
          const pf = Array.isArray(o.produto_final) ? o.produto_final[0] : o.produto_final;
          return {
            id: o.id,
            numero_op: o.numero_op,
            quantidade_prevista: o.quantidade_prevista,
            produto: pf ? { id: pf.id, nome: pf.nome } : null,
            status: o.status ?? o.estagio_atual,
          };
        });

        // produtos únicos produzidos
        const mapProds: Record<string, { id: string; nome: string }> = {};
        ordens.forEach((o: any) => {
          if (o.produto && o.produto.id)
            mapProds[o.produto.id] = { id: o.produto.id, nome: o.produto.nome };
        });

        const produtosList = Object.values(mapProds);
        setProdutosProduzidos(produtosList);
        setProdutosFabrica(produtosList); // manter compatibilidade com código existente
        setOrdensFinalizadas(ordens);

        // 2. Carregar Lojas de Destino (PDVs)
        const { data: listaLojas } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('tipo', 'pdv')
          .order('nome');

        setLojas(listaLojas || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    // Chama carregarDados assim que `profile` estiver disponível (sem timeout)
    void carregarDados();
  }, [profile]);

  const handleEnviar = async () => {
    if (!produtoSelecionado || !lojaDestino || !quantidade) {
      return toast.error('Preencha todos os campos');
    }

    try {
      setEnviando(true);

      const origemId = fabrica?.id ?? null;

      const { error } = await supabase.rpc('enviar_carga_loja', {
        p_produto_id: produtoSelecionado,
        p_quantidade: parseFloat(quantidade),
        p_local_origem_id: origemId,
        p_local_destino_id: lojaDestino,
        p_ordem_producao_id: ordemSelecionada ?? null,
      });

      if (error) throw error;

      toast.success('Carga enviada com sucesso! O PDV já pode receber.');
      setQuantidade('');
      setProdutoSelecionado('');

      // Recarrega lista para atualizar estoque visual
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up max-w-4xl mx-auto">
      <PageHeader
        title="Expedição de Produtos"
        description="Envie produtos do estoque da Fábrica para as Lojas (PDVs)."
        icon={Truck}
      />

      <Toaster position="top-right" />

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 text-slate-500 font-bold">
            <Warehouse size={32} />
            <span>Estoque Fábrica</span>
          </div>
          <ArrowRight size={32} className="text-orange-500 animate-pulse" />
          <div className="flex items-center gap-3 text-slate-500 font-bold">
            <Truck size={32} />
            <span>Loja (PDV)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seleção de Produto */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Produto Disponível
            </label>
            <select
              className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
            >
              <option value="">Selecione um produto...</option>
              {produtosProduzidos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Select de Ordem de Produção finalizada (opcional) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Ordem Finalizada (opcional)
            </label>
            <select
              className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
              value={ordemSelecionada ?? ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setOrdemSelecionada(val);
                if (val) {
                  const ord = ordensFinalizadas.find((o) => o.id === val);
                  const pid = ord?.produto?.id ?? null;
                  if (pid) setProdutoSelecionado(pid);
                }
              }}
            >
              <option value="">Nenhuma</option>
              {ordensFinalizadas.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.numero_op} — {o.produto?.nome ?? 'Produto'} ({o.quantidade_prevista} un)
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Loja */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Loja de Destino</label>
            <select
              className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
              value={lojaDestino}
              onChange={(e) => setLojaDestino(e.target.value)}
            >
              <option value="">Selecione a loja...</option>
              {lojas.map((loja: any) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Quantidade a Enviar
            </label>
            <input
              type="number"
              className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
              placeholder="0.00"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <Button
            onClick={handleEnviar}
            loading={enviando}
            className="px-8 py-4 text-lg bg-orange-600 hover:bg-orange-700 shadow-orange-200 shadow-lg"
            icon={Package}
          >
            Confirmar Envio
          </Button>
        </div>
      </div>
    </div>
  );
}
