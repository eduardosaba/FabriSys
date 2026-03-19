'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { ClipboardList, Save, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/Button';
import { useAuth } from '@/lib/auth';

export default function InventarioPDVPage() {
  const { profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [pdvOptions, setPdvOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedPdv, setSelectedPdv] = useState<string | null>(null);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [filtro, setFiltro] = useState('');
  const [recebimentosRecentes, setRecebimentosRecentes] = useState<any[]>([]);

  // 1. Função de carregamento centralizada
  const carregarDados = useCallback(async (idParaCarregar: string) => {
    try {
      setLoading(true);

      // Query de produtos vinculada ao local específico
      const { data: produtos, error } = await supabase
        .from('produtos_finais')
        .select(`id, nome, categoria_id, estoque:estoque_produtos!inner(quantidade, local_id)`)
        .eq('estoque.local_id', idParaCarregar)
        .order('nome');

      if (error) throw error;

      // Categorias
      const categoriaIds = Array.from(
        new Set((produtos || []).map((p: any) => p.categoria_id).filter(Boolean))
      );
      const categoriasMap: Record<string, string> = {};
      if (categoriaIds.length) {
        const { data: cats } = await supabase
          .from('categorias')
          .select('id,nome')
          .in('id', categoriaIds);
        (cats || []).forEach((c: any) => (categoriasMap[c.id] = c.nome));
      }

      const formatted = (produtos || []).map((p: any) => {
        const est = p.estoque && p.estoque.length ? p.estoque[0] : null;
        return {
          id: String(p.id),
          quantidade: Number(est?.quantidade || 0),
          produto_id: p.id,
          produtos_finais: {
            id: p.id,
            nome: p.nome,
            categoria: categoriasMap[p.categoria_id] || '',
          },
        };
      });

      setEstoque(formatted);

      // Resetar contagens ao mudar de PDV
      const initialContagem: Record<string, number> = {};
      formatted.forEach((item: any) => {
        initialContagem[item.id] = item.quantidade;
      });
      setContagens(initialContagem);

      // Carregar recebimentos recentes
      const { data: recs } = await supabase
        .from('v_pdv_envios')
        .select('*')
        .eq('local_destino_id', idParaCarregar)
        .order('enviado_em', { ascending: false })
        .limit(10);
      setRecebimentosRecentes(recs || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do local.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Inicialização e Controle de Acesso
  useEffect(() => {
    const init = async () => {
      if (authLoading || !profile) return;

      const isAdmin = profile.role === 'admin' || profile.role === 'master';

      if (isAdmin) {
        // Carrega lista de PDVs para o Admin escolher
        const { data: locais } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('tipo', 'pdv')
          .eq('organization_id', profile.organization_id)
          .order('nome');

        const options = locais || [];
        setPdvOptions(options);

        // Define qual PDV carregar inicialmente para o admin
        const paramId = searchParams?.get('local');
        const defaultId = paramId || (options.length > 0 ? options[0].id : null);

        if (defaultId) {
          setSelectedPdv(defaultId);
          setLocalId(defaultId);
          carregarDados(defaultId);
        }
      } else {
        // Usuário Comum: Força o local_id do perfil dele
        const meuLocal = profile.local_id;
        if (meuLocal) {
          setLocalId(meuLocal);
          carregarDados(meuLocal);
        } else {
          toast.error('Seu usuário não está vinculado a nenhum PDV.');
          setLoading(false);
        }
      }
    };

    void init();
  }, [authLoading, profile]);

  // Se a URL vier com ?local=ID, pré-seleciona esse PDV (útil para links diretos)
  useEffect(() => {
    try {
      const param = searchParams?.get?.('local') || null;
      if (param) setSelectedPdv(param);
    } catch (e) {
      // ignore
    }
  }, [searchParams]);

  // 3. Admin troca de PDV no Select
  const handlePdvChange = (id: string | null) => {
    setSelectedPdv(id);
    if (!id) {
      setLocalId(null);
      setEstoque([]);
      setContagens({});
      return;
    }
    setLocalId(id);
    carregarDados(id);
  };

  // 2. Salva o Inventário e ajusta divergências
  const salvarInventario = async () => {
    if (!localId) return toast.error('Local não identificado.');
    const divergencias = estoque.filter((item) => contagens[item.id] !== item.quantidade);

    if (divergencias.length === 0) {
      return toast.success('Tudo certo! Não foram encontradas divergências.');
    }

    const toastId = toast.loading(`Aplicando ${divergencias.length} ajustes...`);

    setLoading(true);
    try {
      for (const item of divergencias) {
        const novaQtd = contagens[item.id];

        // Atualiza o estoque em `estoque_produtos` (upsert por produto+local)
        const { data: upserted, error: upsertError } = await supabase
          .from('estoque_produtos')
          .upsert(
            [
              {
                produto_id: item.produto_id,
                local_id: localId,
                quantidade: novaQtd,
                organization_id: profile?.organization_id ?? null,
              },
            ],
            { onConflict: 'produto_id,local_id' }
          );

        if (upsertError) {
          console.error('Erro upsert estoque_produtos', upsertError);
          toast.error(`Erro ao atualizar ${item.produtos_finais?.nome || item.produto_id}`);
          continue;
        }

        // Opicional: Registrar log de ajuste de inventário
        const { error: movErr } = await supabase.from('movimentacao_estoque').insert({
          produto_id: item.produto_id,
          quantidade: novaQtd - item.quantidade, // A diferença
          tipo_movimento: 'ajuste_inventario',
          observacoes: `Ajuste manual via Inventário PDV por ${profile?.full_name || profile?.nome || profile?.email}`,
        });

        if (movErr) console.error('Erro ao registrar movimentacao_estoque', movErr);

        // Feedback por item
        toast.success(`${item.produtos_finais?.nome || item.produto_id} atualizado`);
      }

      toast.success('Inventário atualizado com sucesso!', { id: toastId });
      carregarDados(localId);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar inventário.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltrados = estoque.filter((item) =>
    (item.produtos_finais?.nome || '').toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading && estoque.length === 0) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <PageHeader
          title="Inventário de Loja"
          description="Confirme os produtos em prateleira para garantir que o estoque bate com o sistema."
          icon={ClipboardList}
        />
        <div className="flex items-center gap-3">
          {(profile?.role === 'admin' || profile?.role === 'master') && (
            <select
              className="p-2 border rounded"
              value={selectedPdv ?? ''}
              onChange={(e) => handlePdvChange(e.target.value || null)}
            >
              <option value="">Selecionar PDV</option>
              {pdvOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}

          <Button onClick={salvarInventario} className="bg-blue-600 hover:bg-blue-700 h-12 px-8">
            <Save size={18} className="mr-2" />
            Finalizar Inventário
          </Button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar produto..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Recebimentos recentes */}
      {recebimentosRecentes.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h4 className="font-bold mb-2">Recebimentos recentes</h4>
          <div className="space-y-2">
            {recebimentosRecentes.map((r) => (
              <div key={r.envio_id} className="flex justify-between items-center text-sm">
                <div className="truncate">
                  <strong className="mr-2">{r.produto_nome}</strong>
                  <span className="text-slate-500">{r.quantidade} un</span>
                  <div className="text-xs text-slate-400">
                    Enviado: {r.origem_nome || r.local_origem_id} •{' '}
                    {new Date(r.enviado_em).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs font-bold">
                  {r.status === 'recebido' ? (
                    <span className="text-emerald-600">Recebido</span>
                  ) : (
                    <span className="text-amber-600">{r.status}</span>
                  )}
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
              {profile?.role === 'admin' && (
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                  Saldo Sistema
                </th>
              )}

              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                Contagem na Prateleira
              </th>

              {profile?.role === 'admin' && (
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                  Divergência
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {itensFiltrados.map((item) => {
              const diff = (contagens[item.id] ?? 0) - (item.quantidade ?? 0);
              const isAdmin = profile?.role === 'admin';

              return (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{item.produtos_finais?.nome}</p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {item.produtos_finais?.categoria}
                    </p>
                  </td>

                  {isAdmin && (
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-400">
                      {item.quantidade}
                    </td>
                  )}

                  <td className="px-6 py-4 w-48">
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full p-3 text-center font-bold rounded-xl border-2 border-blue-50 focus:border-blue-500 outline-none bg-slate-50/50 focus:bg-white transition-all"
                      value={
                        contagens[item.id] === 0 && item.quantidade !== 0 ? '' : contagens[item.id]
                      }
                      onChange={(e) =>
                        setContagens((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                      }
                    />
                  </td>

                  {isAdmin && (
                    <td className="px-6 py-4 text-center">
                      {diff === 0 ? (
                        <span className="text-emerald-500 text-xs font-bold">OK</span>
                      ) : (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${diff > 0 ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
