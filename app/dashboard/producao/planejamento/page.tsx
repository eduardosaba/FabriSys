'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Calendar, Save, Truck, ChefHat, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Loading from '@/components/ui/Loading';

// Tipos para os dados
interface Local {
  id: string;
  nome: string;
}

interface ProdutoPlanejamento {
  id: string;
  nome: string;
  peso_unitario: number;
  ficha_tecnica: {
    rendimento_total_g?: number;
  } | null;
}

interface ItemPlanejamento {
  [localId: string]: number; // Quantidade por PDV
}

export default function PlanejamentoPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().split('T')[0]);

  const [locais, setLocais] = useState<Local[]>([]);
  const [produtos, setProdutos] = useState<ProdutoPlanejamento[]>([]);

  // Estado que guarda as quantidades digitadas: { produtoId: { localId: qtd } }
  const [plano, setPlano] = useState<Record<string, ItemPlanejamento>>({});

  const { toast } = useToast();

  const carregarDados = useCallback(async () => {
    try {
      // 1. Carregar PDVs (Locais de destino)
      const { data: locaisData } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .eq('ativo', true)
        .order('nome');

      setLocais(locaisData || []);

      // 2. Carregar Produtos com suas Fichas Técnicas (apenas os que têm peso cadastrado)
      // Precisamos do rendimento da ficha para fazer a mágica do cálculo
      const { data: produtosData, error } = await supabase
        .from('produtos_finais')
        .select(
          `
          id, 
          nome, 
          peso_unitario,
          ficha_tecnica:fichas_tecnicas(rendimento_total_g)
        `
        )
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Tratamento seguro de tipagem dos dados retornados pelo Supabase
      const rows = (produtosData ?? []) as unknown[];
      const produtosFormatados: ProdutoPlanejamento[] = rows.map((p) => {
        const obj = p as Record<string, unknown>;
        const fichaRaw = obj['ficha_tecnica'];

        // Extrair apenas o campo necessário de forma segura
        const rendimento = (() => {
          if (Array.isArray(fichaRaw) && (fichaRaw as unknown[]).length > 0) {
            const first = (fichaRaw as unknown[])[0] as Record<string, unknown>;
            return typeof first['rendimento_total_g'] === 'number'
              ? first['rendimento_total_g']
              : undefined;
          }
          if (
            fichaRaw &&
            typeof (fichaRaw as Record<string, unknown>)['rendimento_total_g'] === 'number'
          ) {
            return (fichaRaw as Record<string, unknown>)['rendimento_total_g'] as number;
          }
          return undefined;
        })();

        return {
          id: String(obj['id'] ?? ''),
          nome: String(obj['nome'] ?? ''),
          peso_unitario: Number(obj['peso_unitario'] ?? 0),
          ficha_tecnica: rendimento ? { rendimento_total_g: rendimento } : null,
        };
      });

      setProdutos(produtosFormatados);
    } catch (error) {
      console.error('Erro ao carregar planejamento:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  // Função para atualizar o input de quantidade
  const handleQtdChange = (produtoId: string, localId: string, qtd: string) => {
    const valor = parseInt(qtd) || 0;
    setPlano((prev) => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [localId]: valor,
      },
    }));
  };

  // === A LÓGICA DA "ABRIGADEIRINHA" ESTÁ AQUI ===
  const calcularProducao = (produto: ProdutoPlanejamento) => {
    const quantidades = plano[produto.id] || {};
    // 1. Soma total dos PDVs
    const totalUnidades = Object.values(quantidades).reduce((acc, curr) => acc + curr, 0);

    if (totalUnidades === 0) return null;

    // Se não tiver dados técnicos, avisa erro
    if (!produto.peso_unitario || !produto.ficha_tecnica?.rendimento_total_g) {
      return { erro: true, totalUnidades };
    }

    // 2. Cálculo de Massa
    const massaTotalG = totalUnidades * produto.peso_unitario;

    // 3. Cálculo de Panelas (Batidas)
    const rendimentoReceita = produto.ficha_tecnica.rendimento_total_g;
    const qtdBatidas = Math.ceil(massaTotalG / rendimentoReceita);

    return {
      totalUnidades,
      massaTotalKg: massaTotalG / 1000,
      qtdBatidas,
      erro: false,
    };
  };

  const handleSalvarPlanejamento = async () => {
    setSalvando(true);
    try {
      // Filtrar apenas produtos que têm alguma quantidade preenchida
      const produtosParaProduzir = produtos.filter((p) => {
        const calculo = calcularProducao(p);
        return calculo && calculo.totalUnidades > 0;
      });

      if (produtosParaProduzir.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Preencha alguma quantidade para gerar ordens.',
          variant: 'warning',
        });
        setSalvando(false);
        return;
      }

      // Loop para criar uma Ordem de Produção (OP) por Produto
      for (const produto of produtosParaProduzir) {
        const calculo = calcularProducao(produto);
        if (!calculo || calculo.erro) continue;

        // 1. Gerar Número da OP (Simplificado para o exemplo)
        const numeroOp = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Criar a OP Principal
        const { data: opData, error: opError } = await supabase
          .from('ordens_producao')
          .insert({
            numero_op: numeroOp,
            produto_final_id: produto.id,
            quantidade_prevista: calculo.totalUnidades,
            data_prevista: dataProducao,
            status: 'planejada', // Começa planejada
            estagio_atual: 'planejamento', // Vai para o Kanban

            // DADOS INTELIGENTES SALVOS NO BANCO:
            qtd_receitas_calculadas: calculo.qtdBatidas,
            massa_total_kg: calculo.massaTotalKg,
          })
          .select()
          .single();

        if (opError) throw opError;

        // 3. Salvar a Distribuição (Logística para os PDVs)
        // Garantir que acessamos o id da OP de forma segura
        const opId = (opData as Record<string, unknown> | null)?.id as string | number | undefined;
        if (!opId) {
          throw new Error('ID da ordem de produção ausente após inserção');
        }

        const distribuicaoInserts = locais.flatMap((local) => {
          const qtd = plano[produto.id]?.[local.id] || 0;
          if (qtd > 0) {
            return [
              supabase.from('distribuicao_pedidos').insert({
                ordem_producao_id: opId,
                local_destino_id: local.id,
                quantidade_solicitada: qtd,
                status: 'pendente',
              }),
            ];
          }
          return [] as unknown[];
        });

        if (distribuicaoInserts.length > 0) {
          await Promise.all(distribuicaoInserts as Promise<unknown>[]);
        }
      }

      toast({
        title: 'Sucesso!',
        description: `${produtosParaProduzir.length} Ordens de Produção geradas.`,
        variant: 'success',
      });

      // Limpar tela ou redirecionar
      setPlano({});
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Erro ao gerar ordens.', variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Planejamento Diário de Produção"
        description="Distribua a produção entre os PDVs e gere as ordens para a cozinha."
        icon={Truck}
      >
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dataProducao}
            onChange={(e) => setDataProducao(e.target.value)}
            className="rounded-md border p-2 text-sm"
          />
          <Button onClick={handleSalvarPlanejamento} disabled={salvando} loading={salvando}>
            <Save className="mr-2 h-4 w-4" />
            Gerar Ordens de Produção
          </Button>
        </div>
      </PageHeader>

      <div className="overflow-x-auto rounded-lg border bg-white shadow">
        <table className="w-full min-w-[800px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 sticky left-0 bg-gray-50 z-10">
                Produto
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                Dados Técnicos
              </th>
              {/* Colunas Dinâmicas dos PDVs */}
              {locais.map((local) => (
                <th
                  key={local.id}
                  className="px-4 py-3 text-center text-xs font-medium uppercase text-blue-600 bg-blue-50"
                >
                  {local.nome}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-700 bg-yellow-50 border-l">
                Total Produção
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase text-green-700 bg-green-50">
                Ação Cozinha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {produtos.map((produto) => {
              const calculo = calcularProducao(produto);
              const temErroCadastro = !produto.peso_unitario || !produto.ficha_tecnica;

              return (
                <tr key={produto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                    {produto.nome}
                    {temErroCadastro && (
                      <div className="flex items-center text-xs text-red-500 mt-1">
                        <AlertTriangle size={12} className="mr-1" />
                        Cadastro incompleto
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    <div>Peso: {produto.peso_unitario ? `${produto.peso_unitario}g` : '-'}</div>
                    <div>
                      Rend:{' '}
                      {produto.ficha_tecnica?.rendimento_total_g
                        ? `${produto.ficha_tecnica.rendimento_total_g}g`
                        : '-'}
                    </div>
                  </td>

                  {/* Inputs dos PDVs */}
                  {locais.map((local) => (
                    <td key={local.id} className="px-2 py-2 text-center bg-blue-50/30">
                      <input
                        type="number"
                        min="0"
                        className="w-20 rounded border border-blue-200 p-1 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                        value={plano[produto.id]?.[local.id] || ''}
                        onChange={(e) => handleQtdChange(produto.id, local.id, e.target.value)}
                        disabled={temErroCadastro}
                      />
                    </td>
                  ))}

                  {/* Coluna de Resultado Total */}
                  <td className="px-4 py-3 text-center font-bold text-gray-900 bg-yellow-50/50 border-l">
                    {calculo?.totalUnidades || 0} un
                  </td>

                  {/* Coluna da "Mágica" (Instrução para Cozinha) */}
                  <td className="px-4 py-3 text-center bg-green-50/50">
                    {calculo && !calculo.erro ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <ChefHat size={14} className="mr-1" />
                          {calculo.qtdBatidas} Panelas
                        </span>
                        <span className="text-[10px] text-gray-500 mt-1">
                          ({Number(calculo.massaTotalKg ?? 0).toFixed(2)} kg massa)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
