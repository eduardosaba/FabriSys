'use client';

import { useEffect, useState, useCallback } from 'react';
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
  tem_config_completa: boolean;
}

interface ItemPlanejamento {
  [localId: string]: number; // Quantidade definida para cada PDV
}

export default function PlanejamentoPage() {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // ESTADOS
  // Importante: loading começa true para evitar piscar tela vazia
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().split('T')[0]);

  const [locais, setLocais] = useState<Local[]>([]);
  const [produtos, setProdutos] = useState<ProdutoPlanejamento[]>([]);

  // Matriz de Planejamento: { "prod_id": { "local_id": 50 } }
  const [plano, setPlano] = useState<Record<string, ItemPlanejamento>>({});

  // --- CARREGAMENTO DE DADOS ---
  const carregarDados = useCallback(async () => {
    if (!profile?.id) {
      // Se não há profile, garantimos que o estado de loading não fique preso em true
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Buscar PDVs ativos
      const { data: locaisData, error: errLocais } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .eq('ativo', true)
        .order('nome');

      if (errLocais) throw errLocais;

      // 2. Buscar Produtos e suas Fichas
      const { data: produtosData, error: errProd } = await supabase
        .from('produtos_finais')
        .select(
          `
          id, nome, peso_unitario,
          ficha_tecnica:fichas_tecnicas(rendimento_total_g)
        `
        )
        .eq('ativo', true)
        .order('nome');

      if (errProd) throw errProd;

      // 3. Normalizar dados (Tratar arrays/nulos do Supabase)
      const produtosFormatados: ProdutoPlanejamento[] = (produtosData || []).map((p: any) => {
        // O Supabase pode retornar ficha_tecnica como array ou objeto único
        const ficha = Array.isArray(p.ficha_tecnica) ? p.ficha_tecnica[0] : p.ficha_tecnica;
        const rendimento = ficha?.rendimento_total_g || 0;
        const peso = p.peso_unitario || 0;
        const temConfig = peso > 0 && rendimento > 0;

        // Log de debug para produtos com configuração incompleta (apenas uma vez)
        if (!temConfig) {
          console.warn(`⚠️ Produto "${p.nome}" com dados incompletos:`, {
            peso_unitario: peso || 'não configurado',
            rendimento_ficha: rendimento || 'não configurado',
            tem_ficha_tecnica: !!ficha,
          });
        }

        return {
          id: p.id,
          nome: p.nome,
          peso_unitario: peso,
          rendimento_total_g: rendimento,
          // Só podemos calcular se tivermos peso e rendimento > 0
          tem_config_completa: temConfig,
        };
      });

      setLocais(locaisData || []);
      setProdutos(produtosFormatados);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o planejamento.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast]);

  // Dispara carregamento apenas quando a autenticação estiver resolvida
  useEffect(() => {
    // Se ainda está carregando autenticação, aguardamos
    if (authLoading) return;

    // Autenticação terminou e não há profile: encerra o loading e não busca dados
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    void carregarDados();
  }, [authLoading, carregarDados, profile?.id]);

  // --- LÓGICA DE INTERAÇÃO ---

  // Atualiza o valor manual
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

  // Chama a "Inteligência" do banco para sugerir valor
  const preencherSugestao = async (produtoId: string, localId: string) => {
    // Feedback visual
    toast({ title: 'Consultando histórico...', variant: 'default' });

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
        toast({
          title: 'Sugestão aplicada!',
          description: `Média de vendas: ${sugerido} un`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Sem dados',
          description: 'Vendas insuficientes para sugerir.',
          variant: 'default',
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar sugestão.', variant: 'error' });
    }
  };

  // Calcula totais e panelas em tempo real
  const calcularLinha = (produto: ProdutoPlanejamento) => {
    const qtds = plano[produto.id] || {};
    const totalUnidades = Object.values(qtds).reduce((acc, q) => acc + q, 0);

    if (totalUnidades === 0) return null;

    if (!produto.tem_config_completa) {
      return { erro: true, msg: 'Cadastro incompleto' };
    }

    const massaNecessariaG = totalUnidades * produto.peso_unitario;
    const qtdPanelas = Math.ceil(massaNecessariaG / produto.rendimento_total_g);

    return {
      totalUnidades,
      massaTotalKg: massaNecessariaG / 1000,
      qtdPanelas,
      erro: false,
    };
  };

  // Salvar e Gerar Ordens
  const handleSalvar = async () => {
    setSalvando(true);
    try {
      // Filtra produtos que têm produção definida
      const produtosAtivos = produtos.filter((p) => {
        const calc = calcularLinha(p);
        return !!calc && !calc.erro && (calc.totalUnidades ?? 0) > 0;
      });

      if (produtosAtivos.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Preencha quantidades antes de salvar.',
          variant: 'warning',
        });
        setSalvando(false);
        return;
      }

      let ordensGeradas = 0;

      for (const prod of produtosAtivos) {
        const calc = calcularLinha(prod);
        if (!calc || calc.erro) continue;

        // 1. Criar Ordem de Produção
        const numeroOp = Math.floor(10000 + Math.random() * 90000).toString();

        const { data: op, error: opErr } = await supabase
          .from('ordens_producao')
          .insert({
            numero_op: numeroOp,
            produto_final_id: prod.id,
            quantidade_prevista: calc.totalUnidades,
            data_prevista: dataProducao,
            qtd_receitas_calculadas: calc.qtdPanelas,
            massa_total_kg: calc.massaTotalKg,
            status: 'planejada',
            estagio_atual: 'planejamento',
          })
          .select()
          .single();

        if (opErr) throw opErr;

        // 2. Criar Distribuição (Logística)
        // Usamos flatMap para gerar o array de inserts
        const opId = op?.id; // Garantir acesso ao ID

        if (opId) {
          const itemsDistribuicao = locais.flatMap((local) => {
            const qtd = plano[prod.id]?.[local.id] || 0;
            if (qtd > 0) {
              return {
                ordem_producao_id: opId,
                local_destino_id: local.id,
                quantidade_solicitada: qtd,
                status: 'pendente',
              };
            }
            return [];
          });

          if (itemsDistribuicao.length > 0) {
            const { error: distErr } = await supabase
              .from('distribuicao_pedidos')
              .insert(itemsDistribuicao);
            if (distErr) throw distErr;
          }
        }

        ordensGeradas++;
      }

      toast({
        title: 'Sucesso!',
        description: `${ordensGeradas} ordens enviadas para a fábrica.`,
        variant: 'success',
      });

      // Limpa a tela
      setPlano({});
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao gerar ordens.', variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  // --- RENDERIZAÇÃO ---

  if (authLoading || (loading && !profile)) return <Loading />;

  // Estado Vazio: Sem Produtos
  if (produtos.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Planejamento de Produção"
          description="Distribua a produção entre os PDVs."
          icon={Truck}
        />
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-dashed border-slate-300">
          <Package className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum Produto Encontrado</h3>
          <p className="text-slate-500 mb-6 text-sm">
            Cadastre produtos e fichas técnicas para começar.
          </p>
          <Link href="/dashboard/producao/produtos">
            <Button icon={Plus}>Cadastrar Produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Estado Vazio: Sem Lojas
  if (locais.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Planejamento de Produção"
          description="Distribua a produção entre os PDVs."
          icon={Truck}
        />
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-dashed border-slate-300">
          <Store className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum PDV Configurado</h3>
          <p className="text-slate-500 mb-6 text-sm">
            Cadastre suas lojas para distribuir a produção.
          </p>
          <Link href="/dashboard/configuracoes/lojas">
            <Button icon={Plus}>Cadastrar Lojas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Planejamento Diário de Produção"
        description="Defina quanto será produzido e para onde vai."
        icon={Truck}
      >
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border shadow-sm">
          <Calendar size={16} className="text-slate-400 ml-2" />
          <input
            type="date"
            value={dataProducao}
            onChange={(e) => setDataProducao(e.target.value)}
            className="text-sm font-medium text-slate-700 outline-none py-1 bg-transparent"
          />
        </div>
        <Button onClick={handleSalvar} disabled={salvando} loading={salvando} icon={Save}>
          Gerar Ordens
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 uppercase text-xs sticky left-0 bg-slate-50 z-10 w-64">
                  Produto
                </th>
                <th className="px-4 py-4 font-bold text-slate-500 uppercase text-xs text-center w-32">
                  Técnica
                </th>

                {locais.map((local) => (
                  <th
                    key={local.id}
                    className="px-2 py-4 font-bold text-blue-600 uppercase text-xs text-center min-w-[100px] bg-blue-50/30"
                  >
                    {local.nome}
                  </th>
                ))}

                <th className="px-4 py-4 font-bold text-slate-700 uppercase text-xs text-center bg-yellow-50 border-l border-yellow-100">
                  Total
                </th>
                <th className="px-4 py-4 font-bold text-green-700 uppercase text-xs text-center bg-green-50">
                  Cozinha
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {produtos.map((produto) => {
                const calculo = calcularLinha(produto);
                const erroConfig = !produto.tem_config_completa;

                return (
                  <tr key={produto.id} className="hover:bg-slate-50 transition-colors group">
                    {/* Coluna Nome Produto */}
                    <td className="px-6 py-4 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-transparent group-hover:border-slate-200">
                      <div>{produto.nome}</div>
                      {erroConfig && (
                        <div className="mt-1 space-y-0.5">
                          {produto.peso_unitario <= 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600">
                              <AlertTriangle size={10} /> Falta peso unitário
                            </span>
                          )}
                          {produto.rendimento_total_g <= 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-red-600">
                              <AlertTriangle size={10} /> Falta ficha técnica
                            </span>
                          )}
                          <Link
                            href={`/dashboard/producao/produtos/${produto.id}`}
                            className="text-[10px] text-blue-500 hover:text-blue-700 underline inline-flex items-center gap-1"
                          >
                            Configurar →
                          </Link>
                        </div>
                      )}
                    </td>

                    {/* Coluna Dados Técnicos */}
                    <td className="px-4 py-4 text-center text-xs text-slate-400">
                      <div>{produto.peso_unitario > 0 ? `${produto.peso_unitario}g/un` : '--'}</div>
                      <div>
                        {produto.rendimento_total_g > 0
                          ? `${produto.rendimento_total_g}g/rec`
                          : '--'}
                      </div>
                    </td>

                    {/* Colunas dos PDVs (Inputs) */}
                    {locais.map((local) => (
                      <td key={local.id} className="px-2 py-2 text-center bg-blue-50/10 relative">
                        <div className="relative group/input">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            disabled={erroConfig}
                            value={plano[produto.id]?.[local.id] || ''}
                            onChange={(e) => handleQtdChange(produto.id, local.id, e.target.value)}
                            className="w-20 text-center p-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                          {/* Botão Mágico (Sugestão) */}
                          {!erroConfig && (
                            <button
                              onClick={() => preencherSugestao(produto.id, local.id)}
                              className="absolute -top-3 -right-2 bg-white border border-purple-100 text-purple-400 shadow-sm rounded-full p-1 opacity-0 group-hover/input:opacity-100 transition-all hover:scale-110 hover:text-purple-600 hover:border-purple-300 z-20"
                              title="Sugerir quantidade baseada no histórico"
                            >
                              <Sparkles size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}

                    {/* Total Calculado */}
                    <td className="px-4 py-4 text-center font-bold text-slate-700 bg-yellow-50/30 border-l border-yellow-100">
                      {calculo && !calculo.erro ? calculo.totalUnidades : '-'}
                    </td>

                    {/* Resultado Cozinha (Panelas) */}
                    <td className="px-4 py-4 text-center bg-green-50/30">
                      {calculo && !calculo.erro ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                            <ChefHat size={12} /> {calculo.qtdPanelas} Panelas
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {(calculo.massaTotalKg ?? 0).toFixed(1)}kg massa
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
