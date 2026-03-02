'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Package } from 'lucide-react';

export default function EstoqueFabricaPage() {
  const { profile } = useAuth();
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendentesRetorno, setPendentesRetorno] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const carregarEstoqueFabrica = async () => {
    try {
      setLoading(true);
      // 1. localizar fábrica da organização (mesma lógica usada em Expedição)
      let fabrica: any = null;
      try {
        const { data: fab, error: fabErr } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile?.organization_id)
          .eq('tipo', 'fabrica')
          .limit(1)
          .maybeSingle();
        if (fabErr) throw fabErr;
        fabrica = fab;
      } catch (e) {
        // tente um fallback mais amplo (algumas instalações usam 'producao')
        const { data: fabList, error: listErr } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile?.organization_id)
          .in('tipo', ['fabrica', 'producao'])
          .limit(1);
        if (listErr) throw listErr;
        fabrica = (fabList || [])[0] || null;
      }

      if (!fabrica?.id) {
        setEstoque([]);
        return;
      }

      // 2. Buscar produtos que tenham estoque na fábrica (join por estoque_produtos!inner)
      // permite filtrar por nome com ilike
      const produtosQuery = supabase
        .from('produtos_finais')
        .select(
          `id, nome, imagem_url, tipo, estoque:estoque_produtos!inner(quantidade, local_id, updated_at)`
        )
        .eq('estoque.local_id', fabrica.id)
        .eq('ativo', true)
        .eq('tipo', 'final');

      // aplicar filtro de busca por nome se houver
      if (searchTerm && searchTerm.trim().length > 0) {
        produtosQuery.ilike('nome', `%${searchTerm.trim()}%`);
      }

      const { data: produtosData, error } = await produtosQuery;

      if (error) throw error;

      let normalized: any[] = [];

      if ((produtosData || []).length) {
        // Normalizar: pegar primeiro registro de estoque embutido (deve existir por !inner)
        normalized = (produtosData || []).map((p: any) => {
          const est = (p.estoque && p.estoque[0]) || null;
          return {
            produto: { id: p.id, nome: p.nome, imagem_url: p.imagem_url },
            quantidade: est ? est.quantidade : 0,
            updated_at: est ? est.updated_at : null,
          };
        });
      } else {
        // Fallback: talvez os produtos estejam apenas em estoque_produtos (sem passar pelo embed).
        const { data: estoques, error: estErr } = await supabase
          .from('estoque_produtos')
          .select('produto_id, quantidade, updated_at')
          .eq('local_id', fabrica.id)
          .limit(1000);

        if (estErr) throw estErr;

        const produtoIds = Array.from(
          new Set((estoques || []).map((e: any) => e.produto_id).filter(Boolean))
        );
        const produtosMap: Record<string, any> = {};
        if (produtoIds.length) {
          const { data: prods } = await supabase
            .from('produtos_finais')
            .select('id,nome,imagem_url')
            .in('id', produtoIds);
          (prods || []).forEach((p: any) => (produtosMap[p.id] = p));
        }

        normalized = (estoques || []).map((e: any) => ({
          produto: {
            id: e.produto_id,
            nome: produtosMap[e.produto_id]?.nome || 'Produto',
            imagem_url: produtosMap[e.produto_id]?.imagem_url,
          },
          quantidade: e.quantidade,
          updated_at: e.updated_at,
        }));
      }

      setEstoque(normalized || []);
    } catch (err) {
      try {
        console.error(
          'estoque-fabrica error:',
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
      } catch (e) {
        console.error('estoque-fabrica error (raw):', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarPendentesRetorno = async () => {
    try {
      setLoading(true);
      const { data: fabrica, error: fabErr } = await supabase
        .from('locais')
        .select('id')
        .eq('organization_id', profile?.organization_id)
        .eq('tipo', 'fabrica')
        .limit(1)
        .maybeSingle();

      if (fabErr) throw fabErr;
      if (!fabrica?.id) {
        setPendentesRetorno([]);
        return;
      }

      const { data: pendentes, error } = await supabase
        .from('envios_historico')
        .select('*')
        .eq('local_destino_id', fabrica.id)
        .eq('status', 'retorno_pendente')
        .order('enviado_em', { ascending: false });

      if (error) throw error;

      // buscar nomes de produtos e locais em batch
      const produtoIds = Array.from(new Set((pendentes || []).map((p: any) => p.produto_id)));
      const localIds = Array.from(new Set((pendentes || []).map((p: any) => p.local_origem_id)));

      const produtosMap: Record<string, any> = {};
      if (produtoIds.length) {
        const { data: prods } = await supabase
          .from('produtos_finais')
          .select('id,nome')
          .in('id', produtoIds);
        (prods || []).forEach((r: any) => (produtosMap[r.id] = r));
      }

      const locaisMap: Record<string, any> = {};
      if (localIds.length) {
        const { data: locais } = await supabase.from('locais').select('id,nome').in('id', localIds);
        (locais || []).forEach((r: any) => (locaisMap[r.id] = r));
      }

      const enriched = (pendentes || []).map((p: any) => ({
        ...p,
        produto: produtosMap[p.produto_id],
        origem: locaisMap[p.local_origem_id],
      }));

      setPendentesRetorno(enriched || []);
    } catch (err) {
      console.error('Erro ao carregar retornos pendentes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoqueFabrica();
  }, [profile]);
  useEffect(() => {
    carregarPendentesRetorno();
  }, [profile]);

  // Recarrega quando muda o termo de busca
  useEffect(() => {
    const t = setTimeout(() => void carregarEstoqueFabrica(), 350);
    return () => clearTimeout(t);
  }, [searchTerm, profile]);

  if (loading) return <Loading />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Estoque Central (Fábrica)"
        description="Saldo disponível para expedição e retornos do PDV."
        icon={Package}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-lg bg-white"
          />
        </div>
        <div className="w-40 bg-white p-4 rounded-xl border shadow-sm text-center">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Itens</p>
          <p className="text-2xl font-black">{estoque.length}</p>
        </div>
      </div>

      {/* Retornos Pendentes */}
      {pendentesRetorno.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-bold mb-3">Retornos Pendentes</h3>
          <div className="space-y-2">
            {pendentesRetorno.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-bold">{r.produto?.nome || r.produto_id}</div>
                  <div className="text-xs text-slate-500">
                    Origem: {r.origem?.nome || r.local_origem_id} — Qtde: {r.quantidade}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={async () => {
                      try {
                        const { data } = await supabase.rpc('confirmar_retorno_fabrica', {
                          p_envio_id: r.id,
                          p_recebedor: profile?.id,
                        });
                        if (data?.success) {
                          await carregarPendentesRetorno();
                          await carregarEstoqueFabrica();
                        } else {
                          console.warn('Erro ao confirmar retorno', data);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Confirmar
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={async () => {
                      const motivo = prompt('Motivo da rejeição (opcional):');
                      try {
                        const { data } = await supabase.rpc('rejeitar_retorno_fabrica', {
                          p_envio_id: r.id,
                          p_recebedor: profile?.id,
                          p_motivo: motivo,
                        });
                        if (data?.success) {
                          await carregarPendentesRetorno();
                          await carregarEstoqueFabrica();
                        } else {
                          console.warn('Erro ao rejeitar retorno', data);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Produto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                Saldo na Fábrica
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                Status para Expedição
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {estoque.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">{item.produto.nome}</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-lg font-mono font-bold text-blue-600">
                    {item.quantidade} un
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.quantidade > 0 ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      DISPONÍVEL
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                      SEM SALDO
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
