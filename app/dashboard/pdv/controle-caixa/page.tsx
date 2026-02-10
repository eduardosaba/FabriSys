'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import {
  Lock,
  Unlock,
  DollarSign,
  AlertTriangle,
  Calculator,
  Package,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuth } from '@/lib/auth';
import PromocaoLauncher from '@/components/pdv/PromocaoLauncher';

interface CaixaSessao {
  id: string;
  data_abertura: string;
  saldo_inicial: number;
  total_vendas_sistema: number;
  status: 'aberto' | 'fechado';
}

interface ProdutoContagem {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_sistema: number;
  estoque_contado: number | '';
}

export default function ControleCaixaPage() {
  const confirmDialog = useConfirm();
  const { profile, loading: authLoading } = useAuth();
  const [caixaAberto, setCaixaAberto] = useState<CaixaSessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [modoPdv, setModoPdv] = useState<'padrao' | 'inventario'>('padrao'); // Padrão por segurança

  // Inputs de Abertura
  const [valorAbertura, setValorAbertura] = useState('');

  // Inputs de Fechamento (Financeiro)
  const [valoresFechamento, setValoresFechamento] = useState({
    dinheiro: '',
    pix: '',
    cartao: '',
  });
  const [observacao, setObservacao] = useState('');

  // Inputs de Fechamento (Estoque)
  const [produtosParaContar, setProdutosParaContar] = useState<ProdutoContagem[]>([]);

  // Promoções (Apenas modo Inventário)
  const [promosAplicadas, setPromosAplicadas] = useState<any[]>([]);
  const [valorTotalDescontos, setValorTotalDescontos] = useState(0);

  useEffect(() => {
    async function carregarEstado() {
      if (!profile?.id) {
        // autenticação finalizada sem profile — não travar o loading
        setLoading(false);
        return;
      }
      try {
        // 1. Carregar Configuração do Modo PDV
        const { data: config } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'modo_pdv')
          .single();

        if (config) setModoPdv(config.valor as 'padrao' | 'inventario');

        // 2. Identificar Loja
        const { data: locais } = await supabase
          .from('locais')
          .select('id')
          .eq('tipo', 'pdv')
          .limit(1);
        const meuLocal = locais?.[0];

        if (!meuLocal) {
          toast.error('Loja não configurada.');
          return;
        }
        setLocalId(meuLocal.id);

        // 3. Buscar Caixa
        const { data: caixa } = await supabase
          .from('caixa_sessao')
          .select('*')
          .eq('local_id', meuLocal.id)
          .eq('status', 'aberto')
          .maybeSingle();

        if (caixa) {
          // Carregar produtos
          const { data: prods } = await supabase
            .from('produtos_finais')
            .select(`id, nome, preco_venda, estoque:estoque_produtos(quantidade, local_id)`)
            .eq('ativo', true);

          const listaContagem = (prods || []).map((p: any) => {
            const est = p.estoque?.find((e: any) => e.local_id === meuLocal.id);
            return {
              id: p.id,
              nome: p.nome,
              preco_venda: p.preco_venda,
              estoque_sistema: est ? est.quantidade : 0,
              estoque_contado: '' as unknown as number | '',
            };
          });
          setProdutosParaContar(listaContagem);

          // Calcular vendas já registradas (importante para o modo Padrão)
          const { data: vendas } = await supabase
            .from('vendas')
            .select('total_venda')
            .eq('caixa_id', caixa.id);

          const totalVendido = vendas?.reduce((acc, v) => acc + v.total_venda, 0) || 0;
          setCaixaAberto({ ...caixa, total_vendas_sistema: totalVendido });
        } else {
          setCaixaAberto(null);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      return;
    }

    void carregarEstado();
  }, [authLoading, profile?.id]);

  const abrirCaixa = async () => {
    if (!valorAbertura) return toast.error('Informe o fundo de troco');
    try {
      setLoading(true);
      const { error } = await supabase.from('caixa_sessao').insert({
        local_id: localId,
        usuario_abertura: profile?.id,
        saldo_inicial: parseFloat(valorAbertura),
        status: 'aberto',
      });
      if (error) throw error;
      toast.success('Caixa Aberto!');
      window.location.reload();
    } catch (err) {
      toast.error('Erro ao abrir caixa');
    }
  };

  // --- LÓGICA DINÂMICA DE CÁLCULO ---
  const calcularResumo = () => {
    let vendasEsperadas = 0;

    if (modoPdv === 'inventario') {
      // Modo Ágil: Venda = (Estoque Inicial - Final) * Preço
      produtosParaContar.forEach((p) => {
        if (p.estoque_contado !== '') {
          const vendidos = Math.max(0, p.estoque_sistema - p.estoque_contado);
          vendasEsperadas += vendidos * p.preco_venda;
        }
      });
    } else {
      // Modo Padrão: Venda = O que foi registrado no sistema
      vendasEsperadas = caixaAberto?.total_vendas_sistema || 0;
    }

    const totalInformado =
      (parseFloat(valoresFechamento.dinheiro) || 0) +
      (parseFloat(valoresFechamento.pix) || 0) +
      (parseFloat(valoresFechamento.cartao) || 0);

    // No modo inventário, descontos diminuem o valor esperado (para bater o caixa)
    const descontos = modoPdv === 'inventario' ? valorTotalDescontos : 0;

    // Total esperado líquido
    const totalEsperadoLiquido = (caixaAberto?.saldo_inicial || 0) + vendasEsperadas - descontos;

    return {
      vendaBruta: vendasEsperadas,
      totalInformado,
      totalEsperado: totalEsperadoLiquido,
      diferenca: totalInformado - totalEsperadoLiquido,
    };
  };

  const resumo = calcularResumo();

  const fecharCaixa = async () => {
    if (!valoresFechamento.dinheiro) return toast.error('Informe o dinheiro em caixa');

    // Validações específicas por modo
    if (modoPdv === 'inventario') {
      const naoContados = produtosParaContar.filter((p) => p.estoque_contado === '');
      if (naoContados.length > 0) {
        const confirmed = await confirmDialog.confirm({
          title: 'Produtos Não Contados',
          message: `Atenção: ${naoContados.length} produtos não foram contados. O sistema assumirá que não houve vendas deles. Continuar?`,
          confirmText: 'Continuar',
          cancelText: 'Cancelar',
          variant: 'warning',
        });

        if (!confirmed) return;
      }
    }

    try {
      setLoading(true);

      // A. Se for Modo Inventário, gerar a venda consolidada agora
      if (modoPdv === 'inventario') {
        const itensVendidos = produtosParaContar
          .filter((p) => p.estoque_contado !== '' && p.estoque_sistema > p.estoque_contado)
          .map((p) => ({
            produto_id: p.id,
            quantidade: p.estoque_sistema - (p.estoque_contado as number),
            preco_unitario: p.preco_venda,
          }));

        if (itensVendidos.length > 0) {
          const { data: venda, error: errVenda } = await supabase
            .from('vendas')
            .insert({
              local_id: localId,
              caixa_id: caixaAberto?.id,
              total_venda: resumo.vendaBruta - valorTotalDescontos, // Valor líquido
              metodo_pagamento: 'consolidado_diario',
              status: 'concluida',
            })
            .select()
            .single();

          if (errVenda) throw errVenda;

          const itensInsert = itensVendidos.map((i) => ({
            venda_id: venda.id,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            subtotal: i.quantidade * i.preco_unitario,
          }));
          await supabase.from('itens_venda').insert(itensInsert);

          // Baixar Estoque Real
          for (const item of itensVendidos) {
            await supabase.rpc('decrementar_estoque_loja', {
              p_local_id: localId,
              p_produto_id: item.produto_id,
              p_qtd: item.quantidade,
            });
          }
        }
      }

      // B. Fechar Caixa
      const { error } = await supabase
        .from('caixa_sessao')
        .update({
          usuario_fechamento: profile?.id,
          data_fechamento: new Date().toISOString(),
          saldo_final_informado: resumo.totalInformado,
          total_vendas_sistema: resumo.vendaBruta,
          diferenca: resumo.diferenca,
          observacoes: `${modoPdv === 'inventario' ? 'Fechamento por Inventário.' : 'Fechamento Padrão.'} ${observacao}`,
          status: 'fechado',
        })
        .eq('id', caixaAberto?.id);

      if (error) throw error;

      toast.success('Dia Encerrado!');
      setCaixaAberto(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fechar caixa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up max-w-5xl mx-auto">
      <PageHeader
        title={
          modoPdv === 'inventario' ? 'Controle de Caixa & Inventário' : 'Controle de Caixa (Padrão)'
        }
        description={
          modoPdv === 'inventario'
            ? 'Fechamento por contagem de estoque (Sobras).'
            : 'Conferência de vendas registradas.'
        }
        icon={DollarSign}
      />

      {!caixaAberto ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-lg text-center max-w-md mx-auto mt-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <Unlock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Abrir Novo Dia</h2>
          <div className="text-left mt-6">
            <label className="text-sm font-bold text-slate-700 block mb-2">
              Fundo de Troco (R$)
            </label>
            <input
              type="number"
              className="w-full p-4 border rounded-xl text-xl font-bold text-center focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
              placeholder="0.00"
              value={valorAbertura}
              onChange={(e) => setValorAbertura(e.target.value)}
            />
          </div>
          <Button
            onClick={abrirCaixa}
            className="w-full py-4 text-lg mt-6 bg-green-600 hover:bg-green-700"
          >
            Confirmar Abertura
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLUNA 1: ORIGEM DA VENDA (DINÂMICA) */}
          <div className="space-y-4">
            {modoPdv === 'inventario' ? (
              // MODO ÁGIL: MOSTRA CONTAGEM
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b">
                  <Package size={20} className="text-blue-600" /> 1. Contagem de Sobras
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {produtosParaContar.map((prod, idx) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">{prod.nome}</p>
                        <p className="text-xs text-slate-400">Início: {prod.estoque_sistema} un</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 uppercase font-bold">Sobrou:</span>
                        <input
                          type="number"
                          className="w-20 p-2 text-center border rounded font-bold focus:border-blue-500 outline-none"
                          placeholder="0"
                          value={prod.estoque_contado}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            const novo = [...produtosParaContar];
                            novo[idx].estoque_contado = val;
                            setProdutosParaContar(novo);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // MODO PADRÃO: MOSTRA APENAS RESUMO DE VENDAS REGISTRADAS
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <QrCode size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Vendas Registradas</h3>
                <p className="text-slate-500 mb-6">
                  No modo padrão, o sistema soma todas as vendas lançadas no caixa durante o dia.
                </p>

                <div className="text-4xl font-bold text-blue-600">
                  R$ {caixaAberto.total_vendas_sistema.toFixed(2)}
                </div>
                <p className="text-xs text-slate-400 mt-2">Total acumulado no sistema</p>
              </div>
            )}
          </div>

          {/* COLUNA 2: CONFERÊNCIA FINANCEIRA (IGUAL PARA OS DOIS) */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b">
                <DollarSign size={20} className="text-green-600" /> 2. Conferência de Valores
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                    <Banknote size={16} className="text-green-600" /> Dinheiro em Espécie
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border rounded-lg bg-slate-50 font-bold text-right"
                    placeholder="0.00"
                    value={valoresFechamento.dinheiro}
                    onChange={(e) =>
                      setValoresFechamento({ ...valoresFechamento, dinheiro: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      Pix
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded bg-slate-50 text-right"
                      placeholder="0.00"
                      value={valoresFechamento.pix}
                      onChange={(e) =>
                        setValoresFechamento({ ...valoresFechamento, pix: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      Cartão
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded bg-slate-50 text-right"
                      placeholder="0.00"
                      value={valoresFechamento.cartao}
                      onChange={(e) =>
                        setValoresFechamento({ ...valoresFechamento, cartao: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Componente de Promoção (Só aparece no modo Inventário) */}
                {modoPdv === 'inventario' && (
                  <PromocaoLauncher
                    onUpdate={(total, lista) => {
                      setValorTotalDescontos(total);
                      setPromosAplicadas(lista);
                    }}
                  />
                )}
              </div>

              <div className="mt-6 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Fundo Inicial</span>
                  <span className="font-mono text-slate-700">
                    R$ {caixaAberto.saldo_inicial.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Vendas Calculadas</span>
                  <span className="font-mono text-slate-700">
                    + R$ {resumo.vendaBruta.toFixed(2)}
                  </span>
                </div>
                {modoPdv === 'inventario' && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Descontos/Promos</span>
                    <span>- R$ {valorTotalDescontos.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold border-t border-dashed pt-2">
                  <span className="text-slate-800">Total Esperado</span>
                  <span className="font-mono text-slate-900">
                    R$ {resumo.totalEsperado.toFixed(2)}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center p-3 rounded-lg mt-2 ${resumo.diferenca >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  <span className="text-sm font-bold uppercase flex items-center gap-2">
                    {resumo.diferenca >= 0 ? <Calculator size={16} /> : <AlertTriangle size={16} />}
                    Diferença
                  </span>
                  <span className="text-xl font-bold">R$ {resumo.diferenca.toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="danger"
                onClick={fecharCaixa}
                className="w-full py-4 mt-4 shadow-lg shadow-red-200"
                icon={Lock}
              >
                Encerrar Dia
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
}
