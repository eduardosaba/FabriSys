'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/hooks/useToast';
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
      console.error(err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
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
    </div>
  );
}
