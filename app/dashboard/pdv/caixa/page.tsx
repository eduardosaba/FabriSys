'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// PageHeader não é usado aqui
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import {
  ShoppingCart,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  Plus,
  Minus,
  Lock,
  AlertCircle,
  Send,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import RegistroPerdaModal from '@/components/logistica/RegistroPerdaModal';
import DraggableCalculator from '@/components/pdv/DraggableCalculator';
import SolicitacaoReposicao from '@/components/pdv/SolicitacaoReposicao';
import MetaDoDiaWidget from '@/components/pdv/MetaDoDiaWidget';
import ClienteFidelidade from '@/components/pdv/ClienteFidelidade';

interface ProdutoPDV {
  id: string;
  nome: string;
  preco_venda: number;
  imagem_url?: string;
  estoque_loja: number;
}

interface ItemVenda {
  produto: ProdutoPDV;
  quantidade: number;
}

export default function CaixaPDVPage() {
  const [produtos, setProdutos] = useState<ProdutoPDV[]>([]);
  const [isPerdaOpen, setIsPerdaOpen] = useState(false);
  const [selectedProdutoForPerda, setSelectedProdutoForPerda] = useState<string | null>(null);
  const [selectedQuantidadeForPerda, setSelectedQuantidadeForPerda] = useState<number | null>(1);
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const { profile, loading: authLoading } = useAuth();
  const [localId, setLocalId] = useState<string | null>(null);
  const [caixaAberto, setCaixaAberto] = useState<boolean>(false);
  const [modoPdv, setModoPdv] = useState<'padrao' | 'inventario'>('padrao');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [descontoFidelidade, setDescontoFidelidade] = useState(0);
  const [pontosUsados, setPontosUsados] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  useEffect(() => {
    async function initPDV() {
      try {
        setLoading(true);

        // 0. Carregar Configuração Global (Modo de Operação)
        const { data: config } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'modo_pdv')
          .single();

        if (config) setModoPdv(config.valor as 'padrao' | 'inventario');

        // 1. Descobrir qual loja é essa (Mock: pega a primeira do tipo PDV)
        // 1. Identificar a loja — preferir a loja do perfil do usuário
        // `profile` pode não ter a propriedade `local_id` tipada; fazer cast seguro aqui
        let meuLocalId = (profile as any)?.local_id ?? null;
        if (!meuLocalId) {
          const { data: locais } = await supabase
            .from('locais')
            .select('id')
            .eq('tipo', 'pdv')
            .limit(1);
          const meuLocal = locais?.[0];

          if (!meuLocal) {
            toast.error('Nenhuma loja configurada!');
            setLoading(false);
            return;
          }
          meuLocalId = meuLocal.id;
        }
        setLocalId(meuLocalId);

        // 2. Verificar se o Caixa está Aberto para esta loja
        const { data: caixa } = await supabase
          .from('caixa_sessao')
          .select('id')
          .eq('local_id', meuLocalId)
          .eq('status', 'aberto')
          .maybeSingle();

        if (caixa) {
          setCaixaAberto(true);

          // 3. Se aberto, carregar produtos e estoques desta loja
          const { data: prods, error } = await supabase
            .from('produtos_finais')
            .select(
              `
                id, nome, preco_venda, imagem_url,
                estoque:estoque_produtos(quantidade, local_id)
              `
            )
            .eq('ativo', true)
            .order('nome');

          if (error) throw error;

          const produtosFormatados = prods.map((p: any) => {
            // Encontrar o estoque específico desta loja no array de estoques
            const est = p.estoque?.find((e: any) => e.local_id === meuLocalId);
            return {
              id: p.id,
              nome: p.nome,
              preco_venda: p.preco_venda,
              imagem_url: p.imagem_url,
              estoque_loja: est ? est.quantidade : 0,
            };
          });
          setProdutos(produtosFormatados);
        } else {
          setCaixaAberto(false);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao iniciar PDV');
      } finally {
        setLoading(false);
      }
    }
    if (authLoading) return;
    void initPDV();
  }, [authLoading, profile]);

  const handlePerdaSuccess = (produtoId?: string, quantidade?: number) => {
    if (!produtoId || !quantidade) return;
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === produtoId ? { ...p, estoque_loja: p.estoque_loja - quantidade } : p
      )
    );
  };

  // --- AÇÕES DO CARRINHO ---
  const addAoCarrinho = (produto: ProdutoPDV) => {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id);
      if (existe) {
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId));
  };

  const alterarQtd = (produtoId: string, delta: number) => {
    setCarrinho((prev) =>
      prev.map((i) => {
        if (i.produto.id === produtoId) {
          const novaQtd = Math.max(1, i.quantidade + delta);
          return { ...i, quantidade: novaQtd };
        }
        return i;
      })
    );
  };

  const solicitarReposicaoRapida = async (produtoId: string, quantidade = 10) => {
    if (!localId) return toast.error('Loja não identificada');
    try {
      const { error } = await supabase.from('solicitacoes_reposicao').insert({
        local_id: localId,
        produto_id: produtoId,
        status: 'pendente',
        urgencia: 'alta',
        created_at: new Date().toISOString(),
        observacao: `Reposição rápida: ${quantidade} unidades`,
      });
      if (error) throw error;
      toast.success('Solicitação de reposição enviada!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar reposição.');
    }
  };

  const totalVenda = carrinho.reduce(
    (acc, item) => acc + item.quantidade * item.produto.preco_venda,
    0
  );
  const totalLiquido = totalVenda - descontoFidelidade;

  // --- FINALIZAR VENDA ---
  const finalizarVenda = async (metodo: string) => {
    if (carrinho.length === 0) return;
    if (!localId) return toast.error('Erro de configuração da loja');

    const toastId = toast.loading('Processando venda...');

    try {
      // Buscar ID do caixa aberto novamente para garantir integridade
      const { data: caixa } = await supabase
        .from('caixa_sessao')
        .select('id')
        .eq('local_id', localId)
        .eq('status', 'aberto')
        .maybeSingle();

      if (!caixa) throw new Error('Caixa fechado! Não é possível vender.');

      // Calcular pontos ganhos (1 ponto por real gasto)
      const pontosGanhos = Math.floor(totalLiquido);

      // 1. Criar Cabeçalho da Venda
      const { data: vendaData, error: errVenda } = await supabase
        .from('vendas')
        .insert({
          local_id: localId,
          caixa_id: caixa.id,
          total_venda: totalLiquido,
          metodo_pagamento: metodo,
          status: 'concluida',
          cliente_id: clienteId,
        })
        .select()
        .single();

      if (errVenda) throw errVenda;

      // 2. Inserir Itens da Venda
      const itensInsert = carrinho.map((item) => ({
        venda_id: vendaData.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco_venda,
        subtotal: item.quantidade * item.produto.preco_venda,
      }));

      const { error: errItens } = await supabase.from('itens_venda').insert(itensInsert);
      if (errItens) throw errItens;

      // 3. Baixar Estoque da Loja (SOMENTE SE MODO PADRÃO)
      // No modo 'inventario', a baixa é feita pela diferença de contagem no fim do dia.
      if (modoPdv === 'padrao') {
        for (const item of carrinho) {
          // Chama a RPC para garantir a transação no banco
          await supabase.rpc('decrementar_estoque_loja_numeric', {
            p_local_id: localId,
            p_produto_id: item.produto.id,
            p_qtd: item.quantidade,
          });
        }
      }

      // Atualizar pontos do cliente (se houver)
      if (clienteId) {
        if (pontosUsados > 0) {
          try {
            await supabase.rpc('atualizar_pontos_cliente', {
              p_cliente_id: clienteId,
              p_pontos_delta: -pontosUsados,
            });
          } catch (e) {
            // falha nos pontos não deve bloquear a finalização da venda
            console.warn('Falha ao atualizar pontos (usar):', e);
          }
        }
        if (pontosGanhos > 0) {
          try {
            await supabase.rpc('atualizar_pontos_cliente', {
              p_cliente_id: clienteId,
              p_pontos_delta: pontosGanhos,
            });
          } catch (e) {
            // falha nos pontos não deve bloquear a finalização da venda
            console.warn('Falha ao atualizar pontos (ganhar):', e);
          }
        }
      }

      toast.dismiss(toastId);
      toast.success('Venda realizada! 🎉');
      setCarrinho([]);
      setClienteId(null);
      setDescontoFidelidade(0);
      setPontosUsados(0);
      setVendasHoje((prev) => prev + totalLiquido);

      // Atualizar estoque visual localmente (Apenas feedback visual)
      // No modo Inventário, isso ajuda a saber quanto "deveria ter", embora o sistema não trave.
      setProdutos((prev) =>
        prev.map((p) => {
          const itemVendido = carrinho.find((c) => c.produto.id === p.id);
          if (itemVendido) {
            return { ...p, estoque_loja: p.estoque_loja - itemVendido.quantidade };
          }
          return p;
        })
      );
    } catch (error: any) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error(error.message || 'Erro ao finalizar venda.');
    }
  };

  if (loading) return <Loading />;

  // --- TELA DE BLOQUEIO SE CAIXA FECHADO ---
  if (!caixaAberto) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6 p-6 animate-fade-up">
        <div className="bg-red-100 p-6 rounded-full">
          <Lock size={48} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">O Caixa está Fechado</h2>
        <p className="text-slate-500 text-center max-w-md">
          Para iniciar as vendas e movimentar o estoque, você precisa abrir o turno informando o
          fundo de troco.
        </p>
        <Link href="/dashboard/pdv/controle-caixa">
          <Button className="px-8 py-3 text-lg">Ir para Abertura de Caixa</Button>
        </Link>
      </div>
    );
  }

  // --- TELA DE VENDAS (PDV ATIVO) ---
  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-100 animate-fade-up">
        <DraggableCalculator />
        {localId && <SolicitacaoReposicao localId={localId} />}
        {/* Aviso de Modo de Operação (Se for Inventário) */}
        {modoPdv === 'inventario' && (
          <div className="bg-orange-100 border-b border-orange-200 text-orange-800 px-4 py-2 text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <strong>Modo Ágil (Inventário):</strong> O estoque não será baixado agora. A baixa
            ocorrerá pela contagem de sobras no fechamento do caixa.
          </div>
        )}

        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          {/* ESQUERDA: CATÁLOGO DE PRODUTOS */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Meta do Dia */}
            <MetaDoDiaWidget localId={localId} vendasHoje={vendasHoje} />

            {/* Barra de Busca */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-2">
              <Search className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar produto (Nome ou Código)..."
                className="flex-1 outline-none bg-transparent"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
            </div>

            {/* Grid de Produtos */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {produtosFiltrados.map((produto) => (
                  <div
                    key={produto.id}
                    onClick={() => addAoCarrinho(produto)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between h-40 group select-none active:scale-95 duration-100"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 line-clamp-2 group-hover:text-blue-700">
                        {produto.nome}
                      </h3>
                      <p
                        className={`text-xs mt-1 ${produto.estoque_loja > 0 ? 'text-green-600' : 'text-red-500 font-bold'}`}
                      >
                        Estoque: {produto.estoque_loja} un
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        R$ {produto.preco_venda.toFixed(2)}
                      </span>
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            solicitarReposicaoRapida(produto.id, 10);
                          }}
                          title="Solicitar Reposição (10 un)"
                          className="text-xs px-2 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                        >
                          <Send size={14} />
                          Repor
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProdutoForPerda(produto.id);
                            setSelectedQuantidadeForPerda(1);
                            setIsPerdaOpen(true);
                          }}
                          title="Registrar Perda deste produto"
                          className="text-xs px-2 py-1 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Perda
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DIREITA: CARRINHO E PAGAMENTO */}
          <div className="w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                <ShoppingCart /> Carrinho
              </h2>
              <div>
                <button
                  onClick={() => setIsPerdaOpen(true)}
                  className="text-red-600 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100 border border-red-100 flex items-center gap-2"
                  title="Registrar Perda/Quebra"
                >
                  <Trash2 size={16} /> Registrar Perda
                </button>
              </div>
            </div>

            {/* Lista de Itens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.length === 0 ? (
                <div className="text-center text-slate-400 mt-10 flex flex-col items-center">
                  <ShoppingCart size={48} className="opacity-20 mb-2" />
                  <p>Carrinho vazio</p>
                  <p className="text-xs">Selecione produtos ao lado</p>
                </div>
              ) : (
                carrinho.map((item) => (
                  <div
                    key={item.produto.id}
                    className="flex justify-between items-center border-b border-slate-100 pb-3 animate-in slide-in-from-left-2 fade-in duration-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800">{item.produto.nome}</p>
                      <p className="text-xs text-slate-500">
                        R$ {item.produto.preco_venda.toFixed(2)} un
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => alterarQtd(item.produto.id, -1)}
                          className="p-1 hover:bg-slate-100 text-slate-500"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-2 text-sm font-bold w-8 text-center">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => alterarQtd(item.produto.id, 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removerDoCarrinho(item.produto.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totais e Pagamento */}
            <div className="p-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
              {/* Fidelidade */}
              <ClienteFidelidade
                totalVenda={totalVenda}
                onClienteSelecionado={setClienteId}
                onDescontoPontos={(pts, val) => {
                  setPontosUsados(pts);
                  setDescontoFidelidade(val);
                }}
              />

              <div className="flex justify-between items-end mb-6">
                <span className="text-slate-500">Total a Pagar</span>
                <div className="text-right">
                  {descontoFidelidade > 0 && (
                    <span className="text-xs text-slate-400 block line-through">
                      R$ {totalVenda.toFixed(2)}
                    </span>
                  )}
                  <span className="text-3xl font-bold text-blue-700">
                    R$ {totalLiquido.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => finalizarVenda('dinheiro')}
                  disabled={carrinho.length === 0}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border bg-white hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Banknote size={24} className="mb-1" />
                  <span className="text-xs font-bold">Dinheiro</span>
                </button>
                <button
                  onClick={() => finalizarVenda('pix')}
                  disabled={carrinho.length === 0}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border bg-white hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <QrCode size={24} className="mb-1" />
                  <span className="text-xs font-bold">Pix</span>
                </button>
                <button
                  onClick={() => finalizarVenda('cartao_credito')}
                  disabled={carrinho.length === 0}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <CreditCard size={24} className="mb-1" />
                  <span className="text-xs font-bold">Cartão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RegistroPerdaModal
        isOpen={isPerdaOpen}
        onClose={() => setIsPerdaOpen(false)}
        localId={localId}
        produtos={produtos}
        onSuccess={handlePerdaSuccess}
        initialProdutoId={selectedProdutoForPerda}
        initialQuantidade={selectedQuantidadeForPerda ?? undefined}
      />
    </>
  );
}
