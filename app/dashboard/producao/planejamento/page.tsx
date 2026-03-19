'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getActiveLocal } from '@/lib/activeLocal';
import { useAuth } from '@/lib/auth';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/hooks/useToast';
import TabelaResumoExplosao from '@/components/planejamento/TabelaResumoExplosao';
import {
  Truck,
  Save,
  ChefHat,
  AlertTriangle,
  Sparkles,
  Package,
  Plus,
  Store,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

// --- TIPOS ---
interface Local {
  id: string;
  nome: string;
}

interface ProdutoPlanejamento {
  id: string;
  nome: string;
  peso_unitario: number;
  rendimento_total_g: number;
  tem_peso: boolean; // Se tem peso cadastrado
  tem_ficha: boolean; // Se tem receita cadastrada
}

interface ItemPlanejamento {
  [localId: string]: number; // Quantidade definida para cada PDV
}

export default function PlanejamentoPage() {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().split('T')[0]);

  const [locais, setLocais] = useState<Local[]>([]);
  const [produtos, setProdutos] = useState<ProdutoPlanejamento[]>([]);
  const [plano, setPlano] = useState<Record<string, ItemPlanejamento>>({});
  const [explosaoDados, setExplosaoDados] = useState<any[] | null>(null);
  const [explosaoLoading, setExplosaoLoading] = useState(false);
  const [produtosParaProduzir, setProdutosParaProduzir] = useState<Record<string, number>>({});
  const [mostrarExplosao, setMostrarExplosao] = useState(false);

  // Estado para expandir cards no mobile
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // --- CARREGAMENTO DE DADOS ---
  const carregarDados = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);

      // 1. Buscar PDVs ativos
      const { data: locaisData, error: errLocais } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .eq('ativo', true)
        .eq('organization_id', profile.organization_id)
        .order('nome');

      if (errLocais) throw errLocais;

      // 2. Buscar Produtos (SOMENTE TIPO FINAL)
      const { data: produtosData, error: errProd } = await supabase
        .from('produtos_finais')
        .select(
          `
          id, nome, peso_unitario, tipo,
          fichas_tecnicas!produto_final_id(rendimento_total_g)
        `
        )
        .eq('ativo', true)
        .eq('tipo', 'final') // <--- FILTRO: Oculta semi-acabados
        .eq('organization_id', profile.organization_id)
        .order('nome');

      if (errProd) throw errProd;

      // 3. Normalizar dados
      const produtosFormatados: ProdutoPlanejamento[] = (produtosData || []).map((p: any) => {
        const ficha = p.fichas_tecnicas?.[0];
        const rendimento = Number(ficha?.rendimento_total_g || 0);
        const peso = Number(p.peso_unitario || 0);

        return {
          id: p.id,
          nome: p.nome,
          peso_unitario: peso,
          rendimento_total_g: rendimento,
          tem_peso: peso > 0, // Permite digitar se tiver peso
          tem_ficha: rendimento > 0, // Permite calcular panelas se tiver ficha
        };
      });

      setLocais(locaisData || []);
      setProdutos(produtosFormatados);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!authLoading && profile?.id) {
      void carregarDados();
    }
  }, [authLoading, profile?.id, carregarDados]);

  // --- LÓGICA DE CÁLCULO ---
  const handleQtdChange = (produtoId: string, localId: string, valor: string) => {
    const qtd = parseInt(valor) || 0;
    setPlano((prev) => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [localId]: qtd,
      },
    }));
  };

  const preencherSugestao = async (produtoId: string, localId: string) => {
    toast({ title: 'Calculando...', variant: 'default' });
    try {
      const { data, error } = await supabase.rpc('sugerir_producao', {
        p_produto_id: produtoId,
        p_local_id: localId,
        p_data_referencia: dataProducao,
      });

      if (error) throw error;
      const sugerido = Number(data);

      if (sugerido > 0) {
        handleQtdChange(produtoId, localId, String(sugerido));
        toast({ title: 'Sugestão aplicada', variant: 'success' });
      } else {
        toast({ title: 'Sem histórico suficiente', variant: 'default' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao sugerir', variant: 'error' });
    }
  };

  const calcularLinha = (produto: ProdutoPlanejamento) => {
    const qtds = plano[produto.id] || {};
    const totalUnidades = Object.values(qtds).reduce((acc, q) => acc + q, 0);

    if (totalUnidades === 0) return null;

    // Se não tem peso, não dá pra calcular massa
    if (!produto.tem_peso) {
      return { totalUnidades, erro: true, msg: 'Sem peso' };
    }

    const massaNecessariaG = totalUnidades * produto.peso_unitario;

    // Se não tem ficha (rendimento), não dá pra calcular panelas, mas calcula massa
    const qtdPanelas = produto.tem_ficha
      ? Math.ceil(massaNecessariaG / produto.rendimento_total_g)
      : 0;

    return {
      totalUnidades,
      massaTotalKg: massaNecessariaG / 1000,
      qtdPanelas,
      erro: false,
      semFicha: !produto.tem_ficha,
    };
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const produtosParaSalvar = produtos.filter((p) => {
        const calc = calcularLinha(p);
        // Permite salvar se tiver unidades E peso configurado. Se não tiver ficha, salva igual (aviso visual apenas)
        return !!calc && (calc.totalUnidades ?? 0) > 0 && p.tem_peso;
      });

      if (produtosParaSalvar.length === 0) {
        toast({
          title: 'Nada a salvar',
          description: 'Preencha quantidades em produtos válidos.',
          variant: 'warning',
        });
        setSalvando(false);
        return;
      }

      let ordensGeradas = 0;

      for (const prod of produtosParaSalvar) {
        const calc = calcularLinha(prod);
        if (!calc) continue;

        // 1. Criar Ordem
        const numeroOp = Math.floor(10000 + Math.random() * 90000).toString();
        const { data: op, error: opErr } = await supabase
          .from('ordens_producao')
          .insert({
            numero_op: numeroOp,
            produto_final_id: prod.id,
            quantidade_prevista: calc.totalUnidades,
            data_prevista: dataProducao,
            qtd_receitas_calculadas: calc.qtdPanelas || 0,
            massa_total_kg: calc.massaTotalKg,
            // status inicial deve respeitar a constraint do banco (ex: 'pendente', 'em_producao', 'concluida')
            status: 'pendente',
            organization_id: profile?.organization_id,
            created_by: profile?.id,
            // 🎯 Definir local de origem (fábrica) e destino principal
            local_origem_id: profile?.local_id || getActiveLocal(),
            local_destino_id: profile?.local_id || getActiveLocal(),
          })
          .select()
          .single();

        if (opErr) throw opErr;

        // 2. Criar Distribuição
        const itemsDistribuicao = locais.flatMap((local) => {
          const qtd = plano[prod.id]?.[local.id] || 0;
          if (qtd > 0) {
            return {
              ordem_producao_id: op.id,
              local_destino_id: local.id,
              quantidade_solicitada: qtd,
              status: 'pendente',
              organization_id: profile?.organization_id,
            };
          }
          return [];
        });

        if (itemsDistribuicao.length > 0) {
          await supabase.from('distribuicao_pedidos').insert(itemsDistribuicao);
        }
        ordensGeradas++;
      }

      toast({ title: `${ordensGeradas} ordens geradas!`, variant: 'success' });
      setPlano({});
    } catch (err: any) {
      console.error('Erro ao salvar', err);
      let errMsg = 'Erro desconhecido';
      try {
        if (err && typeof err === 'object') {
          errMsg = (err.message as string) ?? JSON.stringify(err);
        } else {
          errMsg = String(err);
        }
      } catch (e) {
        errMsg = String(err);
      }
      toast({ title: 'Erro ao salvar', description: errMsg, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  // --- Explosão de Massas (MRP simplificado) ---
  const calcularExplosao = async () => {
    // Montar lista agregada de produtos planejados
    const planejados = Object.keys(plano)
      .map((produtoId) => {
        const itens = plano[produtoId] || {};
        const total = Object.values(itens).reduce((acc, n) => acc + (n || 0), 0);
        return { produto_id: produtoId, quantidade: total };
      })
      .filter((p) => p.quantidade > 0);

    if (planejados.length === 0) {
      toast({ title: 'Nenhuma quantidade definida', variant: 'warning' });
      return;
    }

    try {
      setExplosaoLoading(true);
      const { data, error } = await supabase.rpc('calcular_explosao_massas', {
        p_itens_planejados: planejados,
      });
      if (error) throw error;
      const rows = data || [];
      setExplosaoDados(rows);
      // Inicializar valores propostos
      const mapa: Record<string, number> = {};
      (rows || []).forEach((r: any) => {
        mapa[r.massa_id] = Number(r.sugestao || r.sugestao_producao || 0);
      });
      setProdutosParaProduzir(mapa);
      setMostrarExplosao(true);
    } catch (err) {
      console.error('Erro ao calcular explosão:', err);
      toast({ title: 'Erro ao calcular explosão', variant: 'error' });
    } finally {
      setExplosaoLoading(false);
    }
  };

  const handleChangeProducao = (massaId: string, valor: number) => {
    setProdutosParaProduzir((prev) => ({ ...prev, [massaId]: valor }));
  };

  const gerarOPsExplodidas = async () => {
    // 1) Inserir OPs de semi-acabado (massas) para cada massa com quantidade > 0
    if (!explosaoDados || explosaoDados.length === 0)
      return toast({ title: 'Nada para gerar', variant: 'warning' });
    try {
      setSalvando(true);
      const fabricaRes = await supabase
        .from('locais')
        .select('id')
        .eq('tipo', 'fabrica')
        .limit(1)
        .maybeSingle();
      const fabricaId = fabricaRes.data?.id ?? getActiveLocal();

      const massOpMap: Record<string, string> = {};
      for (const m of explosaoDados) {
        const qtd = Number(produtosParaProduzir[m.massa_id] ?? m.sugestao_producao ?? 0);
        if (!qtd || qtd <= 0) continue;
        const numeroOp = Math.floor(10000 + Math.random() * 90000).toString();
        const { data: opData, error: opErr } = await supabase
          .from('ordens_producao')
          .insert({
            numero_op: numeroOp,
            produto_final_id: m.massa_id,
            quantidade_prevista: qtd,
            data_prevista: dataProducao,
            status: 'pendente',
            organization_id: profile?.organization_id,
            created_by: profile?.id,
            // origem e destino da OP de massa = fábrica
            local_origem_id: fabricaId,
            local_destino_id: fabricaId,
          })
          .select()
          .single();
        if (opErr) throw opErr;
        massOpMap[m.massa_id] = opData.id;
      }

      // 2) Para cada produto final no plano, criar OP e distribuições, vinculando ao OP pai quando aplicável
      for (const prodId of Object.keys(produtos)) {
        const qtds = plano[prodId] || {};
        const totalUnidades = Object.values(qtds).reduce((acc, q) => acc + q, 0);
        if (totalUnidades <= 0) continue;

        const numeroOp = Math.floor(10000 + Math.random() * 90000).toString();
        // tentar descobrir op_pai pela composicao (relacionamento produto->massa)
        const { data: compData } = await supabase
          .from('composicao_produto')
          .select('item_id')
          .eq('produto_pai_id', prodId)
          .limit(1);
        const massaRelacionado = compData && compData[0] ? compData[0].item_id : null;
        const opPaiId = massaRelacionado ? (massOpMap[massaRelacionado] ?? null) : null;

        const { data: opFinal, error: errOpFinal } = await supabase
          .from('ordens_producao')
          .insert({
            numero_op: numeroOp,
            produto_final_id: prodId,
            quantidade_prevista: totalUnidades,
            data_prevista: dataProducao,
            status: 'pendente',
            organization_id: profile?.organization_id,
            created_by: profile?.id,
            // garantir origem (fábrica) para produto final quando aplicável
            local_origem_id: fabricaId,
            local_destino_id: profile?.local_id || getActiveLocal() || null,
            op_pai_id: opPaiId,
          })
          .select()
          .single();
        if (errOpFinal) throw errOpFinal;

        const itemsDistribuicao = Object.keys(qtds).flatMap((localId) => {
          const qtd = qtds[localId] || 0;
          if (qtd > 0) {
            return {
              ordem_producao_id: opFinal.id,
              local_destino_id: localId,
              quantidade_solicitada: qtd,
              status: 'pendente',
              organization_id: profile?.organization_id,
            };
          }
          return [] as any[];
        });

        if (itemsDistribuicao.length > 0) {
          const { error: errDist } = await supabase
            .from('distribuicao_pedidos')
            .insert(itemsDistribuicao);
          if (errDist) throw errDist;
        }
      }

      toast({ title: 'OPs geradas com sucesso', variant: 'success' });
      setPlano({});
      setExplosaoDados(null);
      setMostrarExplosao(false);
    } catch (err: any) {
      console.error('Erro ao gerar OPs explodidas:', err);
      toast({
        title: 'Erro ao gerar OPs',
        description: err?.message || String(err),
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loading />;

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
        <Package className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Nenhum produto final encontrado</h2>
        <p className="text-slate-500 mb-4">Cadastre produtos do tipo "Final" e ative-os.</p>
        <Link href="/dashboard/producao/produtos/novo">
          <Button variant="outline">Criar Produto</Button>
        </Link>
      </div>
    );
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-fade-up pb-24">
      <PageHeader
        title="Planejamento de Produção"
        description="Defina quanto produzir para cada loja."
        icon={Truck}
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={dataProducao}
              onChange={(e) => setDataProducao(e.target.value)}
              className="text-sm font-medium text-slate-700 outline-none bg-transparent w-full"
            />
          </div>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            loading={salvando}
            icon={Save}
            className="w-full sm:w-auto"
          >
            Gerar Ordens
          </Button>
          <Button
            onClick={calcularExplosao}
            disabled={explosaoLoading}
            loading={explosaoLoading}
            icon={Sparkles}
            className="w-full sm:w-auto"
          >
            Calcular Massas
          </Button>
        </div>
      </PageHeader>

      {/* --- VERSÃO DESKTOP (TABELA) --- */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 w-64">Produto Final</th>
                <th className="px-4 py-4 text-center font-bold text-slate-500 w-32">Config</th>
                {locais.map((local) => (
                  <th
                    key={local.id}
                    className="px-2 py-4 text-center font-bold text-blue-600 bg-blue-50/30 min-w-[100px]"
                  >
                    {local.nome}
                  </th>
                ))}
                <th className="px-4 py-4 text-center font-bold text-slate-700 bg-yellow-50">
                  Total
                </th>
                <th className="px-4 py-4 text-center font-bold text-green-700 bg-green-50">
                  Cozinha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtos.map((produto) => {
                const calc = calcularLinha(produto);
                const faltaPeso = !produto.tem_peso;
                const faltaFicha = !produto.tem_ficha;

                return (
                  <tr key={produto.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{produto.nome}</div>
                      {faltaPeso && (
                        <span className="text-[10px] text-red-500 flex items-center gap-1 font-bold">
                          <AlertTriangle size={10} /> Configurar Peso
                        </span>
                      )}
                      {!faltaPeso && faltaFicha && (
                        <span className="text-[10px] text-amber-500 flex items-center gap-1">
                          <Info size={10} /> Sem Ficha Técnica (Cálculo parcial)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-xs text-slate-400">
                      {produto.peso_unitario > 0 ? `${produto.peso_unitario}g` : '--'}
                    </td>
                    {locais.map((local) => (
                      <td key={local.id} className="px-2 py-2 text-center relative group">
                        <input
                          type="number"
                          // Só bloqueia se não tiver peso, pois sem peso não calcula massa
                          disabled={faltaPeso}
                          min="0"
                          className="w-20 p-2 text-center border rounded-lg focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                          value={plano[produto.id]?.[local.id] || ''}
                          onChange={(e) => handleQtdChange(produto.id, local.id, e.target.value)}
                          placeholder="0"
                        />
                        {!faltaPeso && (
                          <button
                            onClick={() => preencherSugestao(produto.id, local.id)}
                            className="absolute top-1 right-2 text-purple-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sugerir valor"
                          >
                            <Sparkles size={14} />
                          </button>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-center font-bold bg-yellow-50/50">
                      {calc?.totalUnidades || '-'}
                    </td>
                    <td className="px-4 py-4 text-center bg-green-50/50">
                      {calc && !calc.erro ? (
                        <div className="text-xs">
                          {!faltaFicha ? (
                            <span className="font-bold text-green-700 block">
                              {calc.qtdPanelas} Panelas
                            </span>
                          ) : (
                            <span className="text-amber-600 block">-</span>
                          )}
                          <span className="text-slate-500">
                            {(calc.massaTotalKg || 0).toFixed(1)}kg
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- VERSÃO MOBILE (CARDS EXPANSÍVEIS) --- */}
      <div className="md:hidden space-y-4">
        {produtos.map((produto) => {
          const calc = calcularLinha(produto);
          const isExpanded = expandedCard === produto.id;
          const faltaPeso = !produto.tem_peso;
          const totalUnidades = calc?.totalUnidades || 0;

          return (
            <div
              key={produto.id}
              className={`bg-white rounded-xl border ${totalUnidades > 0 ? 'border-blue-200 shadow-md' : 'border-slate-200 shadow-sm'} overflow-hidden transition-all`}
            >
              <div
                className="p-4 flex justify-between items-center cursor-pointer active:bg-slate-50 touch-manipulation"
                onClick={() => setExpandedCard(isExpanded ? null : produto.id)}
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{produto.nome}</h3>
                  <div className="flex gap-2 text-xs mt-1">
                    {faltaPeso ? (
                      <span className="text-red-500 flex items-center gap-1 font-bold">
                        <AlertTriangle size={12} /> Configurar Peso
                      </span>
                    ) : (
                      <span className="text-slate-500">{produto.peso_unitario}g / un</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-2">
                  {totalUnidades > 0 && (
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{totalUnidades} un</div>
                    </div>
                  )}
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {faltaPeso ? (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                      <p className="text-sm text-red-700 font-medium mb-2">
                        Configure o peso unitário para planejar.
                      </p>
                      <Link
                        href={`/dashboard/producao/produtos/${produto.id}`}
                        className="inline-block text-xs bg-red-600 text-white px-3 py-2 rounded-lg font-bold"
                      >
                        Ir para Cadastro
                      </Link>
                    </div>
                  ) : (
                    <>
                      {locais.length > 0 ? (
                        locais.map((local) => (
                          <div
                            key={local.id}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm"
                          >
                            <span className="text-sm font-bold text-slate-700 w-1/2 truncate">
                              {local.nome}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  preencherSugestao(produto.id, local.id);
                                }}
                                className="p-2 text-purple-400 hover:bg-purple-50 rounded-full active:scale-95 transition-transform"
                              >
                                <Sparkles size={18} />
                              </button>
                              <input
                                type="number"
                                className="w-24 p-2 text-center border rounded-lg focus:border-blue-500 outline-none bg-white text-lg font-medium"
                                placeholder="0"
                                value={plano[produto.id]?.[local.id] || ''}
                                onChange={(e) =>
                                  handleQtdChange(produto.id, local.id, e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-400 py-2">
                          Nenhuma loja ativa encontrada.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Painel de Explosão (quando calculado) */}
      {mostrarExplosao && explosaoDados && (
        <div className="p-4 md:p-6">
          <TabelaResumoExplosao
            dados={explosaoDados}
            valores={produtosParaProduzir}
            onChange={handleChangeProducao}
          />
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setMostrarExplosao(false)} variant="secondary">
              Fechar
            </Button>
            <Button onClick={gerarOPsExplodidas} loading={salvando}>
              Gerar OPs Explodidas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
