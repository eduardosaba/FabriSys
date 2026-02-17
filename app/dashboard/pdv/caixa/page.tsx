 'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getOperationalContext } from '@/lib/operationalLocal';
import { getActiveLocal } from '@/lib/activeLocal';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// PageHeader não é usado aqui
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import {
  ShoppingCart,
  Trash2,
  AlertTriangle,
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
import { formatCurrency } from '@/lib/utils/format';
import RegistroPerdaModal from '@/components/logistica/RegistroPerdaModal';
import DraggableCalculator from '@/components/pdv/DraggableCalculator';
import SolicitacaoReposicao from '@/components/pdv/SolicitacaoReposicao';
import { FLOAT_BTN_SIZE, loadFloatingPosition, saveFloatingPosition, saveFloatingPositionServer, loadFloatingPositionServer } from '@/components/pdv/floatingPosition';
import KPIsMetas from '@/components/dashboard/KPIsMetas';
import MetaDoDiaWidget from '@/components/pdv/MetaDoDiaWidget';
import ClienteFidelidade from '@/components/pdv/ClienteFidelidade';

interface ProdutoPDV {
  id: string;
  nome: string;
  preco_venda: number;
  imagem_url?: string;
  estoque_loja: number;
  tipo_item?: 'produto' | 'promocao';
  itens_combo?: Array<{
    produto_id: string;
    quantidade: number;
    valor_referencia_unitario?: number;
  }>;
}

interface ItemVenda {
  produto: ProdutoPDV;
  quantidade: number;
}

 export default function CaixaPDVPage() {
  const [produtos, setProdutos] = useState<ProdutoPDV[]>([]);
  const [promocoesPDV, setPromocoesPDV] = useState<ProdutoPDV[]>([]);
  const [isPerdaOpen, setIsPerdaOpen] = useState(false);
  const [selectedProdutoForPerda, setSelectedProdutoForPerda] = useState<string | null>(null);
  const [selectedQuantidadeForPerda, setSelectedQuantidadeForPerda] = useState<number | null>(1);
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const { profile, loading: authLoading } = useAuth();
  const [localId, setLocalId] = useState<string | null>(null);
  const [caixaAberto, setCaixaAberto] = useState<boolean>(false);
  const [caixaIdAtual, setCaixaIdAtual] = useState<string | null>(null);
  const [modoPdv, setModoPdv] = useState<'padrao' | 'inventario'>('padrao');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [descontoFidelidade, setDescontoFidelidade] = useState(0);
  const [pontosUsados, setPontosUsados] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [showCartModal, setShowCartModal] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerEntering, setDrawerEntering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [perdaPosition, setPerdaPosition] = useState<{ x: number; y: number } | null>(null);
  const perdaDraggingRef = useRef(false);
  const perdaDragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const perdaMovedRef = useRef(0);
  
  const [selectedPayment, setSelectedPayment] = useState<'dinheiro' | 'pix' | 'cartao_credito' | null>(null);
  
  const [showCaixaErroModal, setShowCaixaErroModal] = useState(false);
  const [pdvUsarFidelidade, setPdvUsarFidelidade] = useState(false);
  
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const prevCaixaAbertoRef = useRef<boolean>(caixaAberto);

  useEffect(() => {
    if (showCartModal) {
      setDrawerMounted(true);
      // trigger enter transition on next tick
      const t = setTimeout(() => setDrawerEntering(true), 10);
      return () => clearTimeout(t);
    } else {
      // exit transition
      setDrawerEntering(false);
      const t = setTimeout(() => setDrawerMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [showCartModal]);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let mounted = true;
    (async () => {
      try {
        if (profile?.id) {
          const srv = await loadFloatingPositionServer(profile.id, 'floating:perda');
          if (srv && srv.x !== undefined && srv.y !== undefined) {
            if (mounted) setPerdaPosition(srv);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const raw = loadFloatingPosition('floating:perda');
        if (raw) {
          const p = raw;
          if (p?.x !== undefined && p?.y !== undefined) {
            if (mounted) {
              setPerdaPosition(p);
              return;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // default: place near right side, some offset
      const defaultX = Math.max(16, window.innerWidth - 80);
      const defaultY = Math.max(80, window.innerHeight - 200);
      if (mounted) setPerdaPosition({ x: defaultX, y: defaultY });
    })();
    return () => {
      mounted = false;
    };
  }, [isDesktop, profile?.id]);

  // Quando o caixa for fechado (transição de true -> false), forçar reload
  useEffect(() => {
    try {
      const prev = prevCaixaAbertoRef.current;
      if (prev && !caixaAberto) {
        // reload completo para garantir estado consistente da página PDV
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } finally {
      prevCaixaAbertoRef.current = caixaAberto;
    }
  }, [caixaAberto]);

  function handlePaymentClick(method: 'dinheiro' | 'pix' | 'cartao_credito') {
    setSelectedPayment((prev) => (prev === method ? null : method));
  }

  const fetchUltimasVendas = useCallback(async (idCaixa: string) => {
    if (!idCaixa) return;
    try {
      const { data: vendasData, error: vendasErr } = await supabase
        .from('vendas')
        .select('id, created_at, total_venda, metodo_pagamento, status')
        .eq('caixa_id', idCaixa)
        .order('created_at', { ascending: false })
        .limit(10);
      if (vendasErr) throw vendasErr;
      const vendas = vendasData || [];

      if (vendas.length === 0) {
        setUltimasVendas([]);
        return;
      }

      const vendaIds = vendas.map((v: any) => v.id);
      // Buscar itens para essas vendas
      const { data: itensData, error: itensErr } = await supabase
        .from('itens_venda')
        .select('venda_id, produto_id, quantidade')
        .in('venda_id', vendaIds);
      if (itensErr) throw itensErr;

      const produtoIds = Array.from(new Set((itensData || []).map((it: any) => it.produto_id)));
      let produtosMap: Record<string, string> = {};
      if (produtoIds.length > 0) {
        const { data: prods, error: prodsErr } = await supabase
          .from('produtos_finais')
          .select('id, nome')
          .in('id', produtoIds);
        if (!prodsErr && prods) {
          produtosMap = prods.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.nome }), {});
        }
      }

      const vendasWithItems = vendas.map((v: any) => {
        const itens = (itensData || []).filter((it: any) => it.venda_id === v.id).map((it: any) => ({
          produto_id: it.produto_id,
          quantidade: it.quantidade,
          nome: produtosMap[it.produto_id] ?? String(it.produto_id),
        }));
        return { ...v, items: itens };
      });

      setUltimasVendas(vendasWithItems);
    } catch (e) {
      console.error('Erro ao buscar últimas vendas:', e);
    }
  }, []);
  useEffect(() => {
    async function initPDV() {
      try {
        setLoading(true);

        // 0. Carregar Configuração (priorizar organization-specific quando houver)
        let config: any = null;
        try {
          if ((profile as any)?.organization_id) {
            const { data: cfgOrg, error: cfgOrgErr } = await supabase
              .from('configuracoes_sistema')
              .select('valor')
              .eq('chave', 'modo_pdv')
              .eq('organization_id', (profile as any).organization_id)
              .maybeSingle();
            if (cfgOrgErr) throw cfgOrgErr;
            config = cfgOrg;
          }

            if (!config) {
            const { data: cfgGlobal, error: cfgGlobalErr } = await supabase
              .from('configuracoes_sistema')
              .select('valor')
              .eq('chave', 'modo_pdv')
              .is('organization_id', null)
              .maybeSingle();
            if (cfgGlobalErr) throw cfgGlobalErr;
            config = cfgGlobal;
          }
        } catch (cfgErr) {
          console.warn('Erro ao ler modo_pdv:', cfgErr);
        }

        if (config && config.valor) setModoPdv(config.valor as 'padrao' | 'inventario');

        // Ler configuração de fidelidade (org-specific primeiro, depois global)
        try {
          let fidCfg: any = null;
          if ((profile as any)?.organization_id) {
            const { data: fOrg, error: fOrgErr } = await supabase
              .from('configuracoes_sistema')
              .select('valor')
              .eq('chave', 'fidelidade_ativa')
              .eq('organization_id', (profile as any).organization_id)
              .maybeSingle();
            if (fOrgErr) throw fOrgErr;
            fidCfg = fOrg;
          }

          if (!fidCfg) {
            const { data: fGlobal, error: fGlobalErr } = await supabase
              .from('configuracoes_sistema')
              .select('valor')
              .eq('chave', 'fidelidade_ativa')
              .is('organization_id', null)
              .maybeSingle();
            if (fGlobalErr) throw fGlobalErr;
            fidCfg = fGlobal;
          }

          if (fidCfg && fidCfg.valor) setPdvUsarFidelidade(fidCfg.valor === 'true');
        } catch (e) {
          console.warn('Erro ao ler fidelidade_ativa:', e);
        }

        // 1. Descobrir qual loja é essa (prefere contexto operacional: caixa aberto do usuário ou seleção ativa do Admin)
        const opCtx = await getOperationalContext(profile);
        // Prioridade: operational local (persistido) -> caixa aberto (opCtx.caixa) -> perfil.local_id -> activeLocal() -> buscar primeira PDV
        let meuLocalId = opCtx.localId ?? opCtx.caixa?.local_id ?? (profile as any)?.local_id ?? getActiveLocal() ?? null;
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

        // Se o contexto operacional já traz uma sessão de caixa aberta, usá-la diretamente
        if (opCtx.caixa) {
          setCaixaAberto(true);
          setCaixaIdAtual(opCtx.caixa.id);
          void fetchUltimasVendas(opCtx.caixa.id);
          // Carregar produtos e estoques desta loja
          const { data: prods, error } = await supabase
            .from('produtos_finais')
            .select(
              `
                id, nome, preco_venda, imagem_url,
                estoque:estoque_produtos(quantidade, local_id)
              `
            )
              .eq('ativo', true)
              .eq('tipo', 'final')
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
          // Buscar promoções ativas da organização e formatar como cards PDV separados
          try {
            const { data: promosData, error: promosErr } = await supabase
              .from('promocoes')
              .select('id, nome, preco_total, imagem_url, itens:promocao_itens(produto_id, quantidade, valor_referencia_unitario)')
              .eq('organization_id', (profile as any).organization_id)
              .eq('ativo', true)
              .order('created_at', { ascending: false });
            if (!promosErr && promosData) {
              const promosFormatted = (promosData || []).map((p: any) => ({
                id: p.id,
                nome: `💥 ${p.nome}`,
                preco_venda: p.preco_total,
                imagem_url: p.imagem_url,
                estoque_loja: 999,
                tipo_item: 'promocao' as const,
                itens_combo: p.itens || [],
              }));
              setPromocoesPDV(promosFormatted);
              // Também expor as promoções no catálogo principal para facilitar busca/adicionar
              setProdutos((prev) => {
                // Evitar duplicatas pelo id
                const existingIds = new Set(prev.map((r) => r.id));
                const newOnes = promosFormatted.filter((p: any) => !existingIds.has(p.id));
                return [...prev, ...newOnes];
              });
            }
          } catch (promoErr) {
            console.warn('Erro ao carregar promoções para PDV:', promoErr);
          }
        } else {
          // 2. Verificar se o Caixa está Aberto para esta loja (quando não veio no opCtx)
          let caixaQuery: any = supabase
            .from('caixa_sessao')
            .select('id')
            .eq('local_id', meuLocalId)
            .eq('status', 'aberto');

          if ((profile as any)?.role !== 'admin' && (profile as any)?.role !== 'master') {
            caixaQuery = caixaQuery.eq('usuario_abertura', (profile as any)?.id);
          }

          const { data: caixa } = await caixaQuery.maybeSingle();

          if (caixa) {
            setCaixaAberto(true);
            setCaixaIdAtual(caixa.id);
            void fetchUltimasVendas(caixa.id);
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
                .eq('tipo', 'final')
              .order('nome');

            if (error) throw error;

            const produtosFormatados = prods.map((p: any) => {
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
            // Buscar promoções ativas da organização e formatar como cards PDV separados
            try {
              const { data: promosData, error: promosErr } = await supabase
                .from('promocoes')
                .select('id, nome, preco_total, imagem_url, itens:promocao_itens(produto_id, quantidade, valor_referencia_unitario)')
                .eq('organization_id', (profile as any).organization_id)
                .eq('ativo', true)
                .order('created_at', { ascending: false });
              if (!promosErr && promosData) {
                const promosFormatted = (promosData || []).map((p: any) => ({
                  id: p.id,
                  nome: `💥 ${p.nome}`,
                  preco_venda: p.preco_total,
                  imagem_url: p.imagem_url,
                  estoque_loja: 999,
                  tipo_item: 'promocao' as const,
                  itens_combo: p.itens || [],
                }));
                setPromocoesPDV(promosFormatted);
                setProdutos((prev) => {
                  const existingIds = new Set(prev.map((r) => r.id));
                  const newOnes = promosFormatted.filter((p: any) => !existingIds.has(p.id));
                  return [...prev, ...newOnes];
                });
              }
            } catch (promoErr) {
              console.warn('Erro ao carregar promoções para PDV:', promoErr);
            }
          } else {
            setCaixaAberto(false);
          }
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

    // Subscribes to real-time changes of modo_pdv so multiple PDV sessions update live
    const channel = supabase
      .channel('public:configuracoes_sistema:modo_pdv')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'configuracoes_sistema', filter: "chave=eq.modo_pdv" },
        (payload) => {
          try {
            const novo = (payload.new as any)?.valor;
            const org = (payload.new as any)?.organization_id ?? null;
            const myOrg = (profile as any)?.organization_id ?? null;
            // Aplicar a mudança somente se for global (null) ou para a mesma organização
            if (org === null || org === myOrg) {
              if (novo && (novo === 'padrao' || novo === 'inventario')) {
                setModoPdv(novo);
              }
            }
          } catch (e) {
            console.warn('Erro ao processar evento realtime modo_pdv:', e);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        // unsubscribe channel when component unmounts or deps change
        channel.unsubscribe();
      } catch (e) {
        // fallback: try to remove channel from client
        try {
          // @ts-ignore
          supabase.removeChannel?.(channel);
        } catch (err) {
          // noop
        }
      }
    };
  }, [authLoading, profile]);

  useEffect(() => {
    if (caixaIdAtual) void fetchUltimasVendas(caixaIdAtual);
  }, [caixaIdAtual, fetchUltimasVendas]);

  // Subscribe to realtime changes on `caixa_sessao` for this `localId` so UI updates
  // immediately when a caixa is opened/closed elsewhere.
  useEffect(() => {
    if (!localId) return;

    const channel = supabase
      .channel('public:caixa_sessao_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_sessao' }, (payload) => {
        try {
          const novo = (payload.new as any) ?? null;
          const velho = (payload.old as any) ?? null;

          // Se o evento estiver relacionado ao nosso `localId`, reagir
          const relatedToLocal = (novo && novo.local_id === localId) || (velho && velho.local_id === localId);
          if (!relatedToLocal) return;

          // Se foi inserido/atualizado para status aberto, marcar caixaAberto
          if (novo && novo.status === 'aberto') {
            // se for admin/master não filtrar por usuário
            if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'master') {
              setCaixaAberto(true);
            } else if (novo.usuario_abertura === (profile as any)?.id) {
              setCaixaAberto(true);
            }
          }

          // Se foi atualizado para fechado, ou removido, desativar PDV
          if ((novo && novo.status === 'fechado') || (velho && !novo)) {
            // Se for fechamento para nosso local, fechar
            setCaixaAberto(false);
          }
        } catch (e) {
          console.warn('Erro ao processar evento realtime caixa_sessao:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel?.(channel);
      } catch (e) {
        try {
          channel.unsubscribe();
        } catch (err) {
          // noop
        }
      }
    };
  }, [localId, profile]);

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
      const existe = prev.find((i) => i.produto.id === produto.id && i.produto.tipo_item === produto.tipo_item);
      if (existe) {
        return prev.map((i) =>
          i.produto.id === produto.id && i.produto.tipo_item === produto.tipo_item ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      // Para promoções, registramos o objeto promocional no campo produto (contendo itens_combo)
      return [...prev, { produto, quantidade: 1 }];
    });
    // Em mobile, ao adicionar, abrir o drawer por um curto período para feedback visual
    if (typeof window !== 'undefined') {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (isMobile && !showCartModal) {
        setShowCartModal(true);
        setTimeout(() => setShowCartModal(false), 1200);
      }
    }
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
  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    if (!localId) return toast.error('Erro de configuração da loja');

    const toastId = toast.loading('Processando venda...');

    const extractErrorMessage = (err: any) => {
      if (!err) return 'Erro desconhecido';
      if (typeof err === 'string') return err;
      if ((err as any).message) return (err as any).message;
      if ((err as any).error) return (err as any).error;
      try {
        return JSON.stringify(err);
      } catch (e) {
        return String(err);
      }
    };

    try {
      // Buscar ID do caixa aberto novamente para garantir integridade
      let caixaQuery: any = supabase
        .from('caixa_sessao')
        .select('id')
        .eq('local_id', localId)
        .eq('status', 'aberto');

      if ((profile as any)?.role !== 'admin' && (profile as any)?.role !== 'master') {
        caixaQuery = caixaQuery.eq('usuario_abertura', (profile as any)?.id);
      }

      const { data: caixa } = await caixaQuery.maybeSingle();

      if (!caixa) throw new Error('Caixa fechado! Não é possível vender.');

      // Calcular pontos ganhos (1 ponto por real gasto)
      const pontosGanhos = Math.floor(totalLiquido);

      // Determinar contexto operacional (prefere caixa aberto do usuário)
      const opCtx = await getOperationalContext(profile);
      const opLocalId = opCtx.caixa?.local_id ?? opCtx.localId ?? localId;
      const opCaixa = opCtx.caixa ?? caixa;

      // 1. Criar Cabeçalho da Venda usando contexto operacional
      const metodoEscolhido = selectedPayment ?? 'dinheiro';
      const vendaPayload: any = {
        local_id: opLocalId,
        caixa_id: opCaixa?.id,
        organization_id: profile?.organization_id,
        total_venda: totalLiquido,
        metodo_pagamento: metodoEscolhido,
        usuario_id: profile?.id,
        status: 'concluida',
        cliente_id: clienteId,
      };

      // Revalidar que o caixa ainda existe e está aberto (evita FK violations por sessão fechada)
      try {
        const { data: caixaExiste } = await supabase
          .from('caixa_sessao')
          .select('id')
          .eq('id', caixa.id)
          .eq('status', 'aberto')
          .maybeSingle();
        if (!caixaExiste) throw new Error('Caixa não encontrado ou fechado antes da conclusão da venda.');
      } catch (e) {
        throw new Error(extractErrorMessage(e));
      }

      let vendaData: any = null;
      let errVenda: any = null;
      let lastInsertResponse: any = null;

      // Logs verbosos para depuração do fluxo de venda/caixa
      // removed debug logs

      // Tentar inserir incluindo metodo_pagamento. Se falhar por coluna ausente, tentar sem o campo.
      // Se falhar por FK (caixa_id), revalidar caixa e tentar uma vez.
      let attempts = 0;
      while (attempts < 2) {
        attempts += 1;
        try {
          const res = await supabase.from('vendas').insert(vendaPayload).select().single();
          lastInsertResponse = res;
          vendaData = (res as any).data;
          errVenda = (res as any).error;
        } catch (e) {
          // Capture thrown exception as errVenda and also lastInsertResponse
          errVenda = e;
          lastInsertResponse = { thrown: String(e) };
        }

        if (!errVenda) break;

        const errMsg = extractErrorMessage(errVenda);

        // Caso a mensagem indique coluna faltando, remove o campo e re-tenta (não conta como revalidação de caixa)
        if (errMsg && errMsg.includes('metodo_pagamento') && vendaPayload.metodo_pagamento) {
          delete vendaPayload.metodo_pagamento;
          // reset errVenda e tentar novamente
          errVenda = null;
          continue;
        }

        // Se for violação de FK na coluna caixa_id, revalidar caixa e tentar uma vez
        if (errMsg && (errMsg.includes('vendas_caixa_id_fkey') || errMsg.toLowerCase().includes('foreign key'))) {
          // Rebuscar caixa aberto para este local/usuário
          try {
            let caixaQueryRef: any = supabase.from('caixa_sessao').select('id').eq('local_id', localId).eq('status', 'aberto');
            if ((profile as any)?.role !== 'admin' && (profile as any)?.role !== 'master') {
              caixaQueryRef = caixaQueryRef.eq('usuario_abertura', (profile as any)?.id);
            }
            const { data: caixaRef } = await caixaQueryRef.maybeSingle();
            if (!caixaRef) throw new Error('Caixa não encontrado ao revalidar após FK violation');
            vendaPayload.caixa_id = caixaRef.id;
            // reset errVenda e tentar novamente
            // Tentativa adicional: se a FK aponta para caixa_diario inexistente, tentar criar o registro caixa_diario
            try {
              const { error: createCdErr } = await supabase.from('caixa_diario').insert({
                id: caixaRef.id,
                local_id: opLocalId,
                usuario_abertura: (profile as any)?.id,
                organization_id: (profile as any)?.organization_id,
                saldo_inicial: vendaPayload.total_venda ?? 0,
                status: 'aberto',
                data_abertura: new Date().toISOString(),
              });
              if (!createCdErr) {
                try {
                  toast.success('Registro `caixa_diario` criado automaticamente (fallback)');
                } catch (tErr) {
                  // noop if toast fails in non-browser environments
                }
              }
            } catch (createCdErr) {
              // ignore creation errors; might not have permission or table missing
            }
            errVenda = null;
            continue;
          } catch (refErr) {
            // se revalidação falhar, mantenha o erro original
            console.error('Falha ao revalidar caixa após FK error:', refErr);
            break;
          }
        }

        // Se não for um caso tratável, saia do loop e trate o erro abaixo
        break;
      }

      // Tratar erro final após tentativas
      if (errVenda) {
        const em = extractErrorMessage(errVenda) || 'Erro desconhecido';
        // Mensagem amigável para violação de FK no caixa
        if (em && (em.includes('vendas_caixa_id_fkey') || em.toLowerCase().includes('foreign key'))) {
          // Mostrar modal orientando reabrir o caixa antes de propagar o erro
          try {
            setShowCaixaErroModal(true);
          } catch (e) {
            // noop
          }
          throw new Error('Caixa inválido ou fechado. Reabra o caixa e tente novamente.');
        }
        throw new Error(em);
      }

      // 2. Inserir Itens da Venda
      if (!vendaData || !vendaData.id) {
        console.error('Resposta inválida do servidor ao criar venda', {
          lastInsertResponse,
          vendaPayload,
          profile: { id: (profile as any)?.id ?? null, organization_id: (profile as any)?.organization_id ?? null },
          caixa,
          errVenda,
        });
        const dump = JSON.stringify(lastInsertResponse || { vendaData, errVenda });
        throw new Error('Resposta inválida do servidor ao criar venda (id ausente). Detalhes: ' + dump);
      }

      const itensInsert: any[] = [];
      for (const item of carrinho) {
        if (item.produto.tipo_item === 'promocao') {
          const itensDoCombo = item.produto.itens_combo || [];
          for (const subItem of itensDoCombo) {
            itensInsert.push({
              venda_id: vendaData.id,
              produto_id: subItem.produto_id,
              quantidade: item.quantidade * (subItem.quantidade || 1),
              preco_unitario: subItem.valor_referencia_unitario ?? 0,
              subtotal: (item.quantidade * (subItem.quantidade || 1)) * (subItem.valor_referencia_unitario ?? 0),
              organization_id: (profile as any)?.organization_id ?? null,
              promocao_id: item.produto.id,
            });
          }
        } else {
          itensInsert.push({
            venda_id: vendaData.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            subtotal: item.quantidade * item.produto.preco_venda,
            organization_id: (profile as any)?.organization_id ?? null,
          });
        }
      }

      const { error: errItens } = await supabase.from('itens_venda').insert(itensInsert);
      if (errItens) {
        // RLS pode impedir o insert; mostrar mensagem útil e registrar para auditoria
        console.error('Falha ao inserir itens_venda (possível RLS):', errItens, { itensInsert, vendaData });
        toast.error('Falha ao registrar itens da venda: verifique permissões.');
        throw new Error(extractErrorMessage(errItens));
      }

      // 3. Baixar Estoque da Loja (SOMENTE SE MODO PADRÃO)
      // No modo 'inventario', a baixa é feita pela diferença de contagem no fim do dia.
      if (modoPdv === 'padrao') {
        for (const item of carrinho) {
          // Chama a RPC para garantir a transação no banco
          // Não bloquear a venda se o estoque estiver zerado ou RPC falhar — apenas logar e avisar
          try {
            const { error: rpcErr } = await supabase.rpc('decrementar_estoque_loja_numeric', {
              p_local_id: opLocalId,
              p_produto_id: item.produto.id,
              p_qtd: item.quantidade,
            });
            if (rpcErr) {
              console.warn('RPC decrementar_estoque_loja_numeric retornou erro:', rpcErr);
              toast('Estoque insuficiente para alguns itens; venda continuará sem atualizar estoque.');
              // continuar sem lançar erro
            }
          } catch (rpcEx) {
            console.warn('Erro ao chamar RPC decrementar_estoque_loja_numeric:', rpcEx);
            toast('Falha ao atualizar estoque (RPC). Venda continuará.');
          }
        }
      }

      // Atualizar pontos do cliente (se houver)
      if (clienteId) {
        if (pontosUsados > 0) {
          try {
            const { error: rpcUseErr } = await supabase.rpc('atualizar_pontos_cliente', {
              p_cliente_id: clienteId,
              p_pontos_delta: -pontosUsados,
            });
            if (rpcUseErr) console.warn('Falha ao atualizar pontos (usar):', rpcUseErr);
          } catch (e) {
            if (typeof window !== 'undefined') console.warn('Falha ao atualizar pontos (usar):', e);
          }
        }
        if (pontosGanhos > 0) {
          try {
            const { error: rpcGainErr } = await supabase.rpc('atualizar_pontos_cliente', {
              p_cliente_id: clienteId,
              p_pontos_delta: pontosGanhos,
            });
            if (rpcGainErr) console.warn('Falha ao atualizar pontos (ganhar):', rpcGainErr);
          } catch (e) {
            if (typeof window !== 'undefined')
              console.warn('Falha ao atualizar pontos (ganhar):', e);
          }
        }
      }

      toast.dismiss(toastId);
      toast.success('Venda realizada! 🎉');
      try {
        if (caixa && caixa.id) void fetchUltimasVendas(caixa.id);
      } catch (e) {
        // noop
      }
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
      const msg = extractErrorMessage(error);
      console.error('Erro ao finalizar venda:', error, '->', msg);
      toast.dismiss(toastId);
      toast.error(msg || 'Erro ao finalizar venda.');
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
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-100 animate-fade-up pb-24">
        <DraggableCalculator />
        
        {localId && <SolicitacaoReposicao localId={localId} />}
        {/* Registrar Perda - mobile fixed, desktop arrastável com persistência */}
        {isDesktop ? (
          <button
            onMouseDown={(e) => {
              perdaDraggingRef.current = true;
              perdaDragStartRef.current = {
                x: (e as any).clientX,
                y: (e as any).clientY,
                offsetX: perdaPosition?.x ?? 16,
                offsetY: perdaPosition?.y ?? 16,
              };
              perdaMovedRef.current = 0;
              const onMove = (ev: MouseEvent) => {
                if (!perdaDraggingRef.current) return;
                const dx = ev.clientX - perdaDragStartRef.current.x;
                const dy = ev.clientY - perdaDragStartRef.current.y;
                const newX = perdaDragStartRef.current.offsetX + dx;
                const newY = perdaDragStartRef.current.offsetY + dy;
                const clampedX = Math.max(8, Math.min(newX, window.innerWidth - FLOAT_BTN_SIZE - 8));
                const clampedY = Math.max(8, Math.min(newY, window.innerHeight - FLOAT_BTN_SIZE - 8));
                setPerdaPosition({ x: clampedX, y: clampedY });
                perdaMovedRef.current = Math.hypot(dx, dy);
              };
                const onUp = () => {
                  perdaDraggingRef.current = false;
                  saveFloatingPosition('floating:perda', perdaPosition);
                  void saveFloatingPositionServer(profile?.id, 'floating:perda', perdaPosition);
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              perdaDraggingRef.current = true;
              perdaDragStartRef.current = {
                x: t.clientX,
                y: t.clientY,
                offsetX: perdaPosition?.x ?? 16,
                offsetY: perdaPosition?.y ?? 16,
              };
              perdaMovedRef.current = 0;
              const onMove = (ev: TouchEvent) => {
                if (!perdaDraggingRef.current) return;
                const touch = ev.touches[0];
                const dx = touch.clientX - perdaDragStartRef.current.x;
                const dy = touch.clientY - perdaDragStartRef.current.y;
                const newX = perdaDragStartRef.current.offsetX + dx;
                const newY = perdaDragStartRef.current.offsetY + dy;
                const clampedX = Math.max(8, Math.min(newX, window.innerWidth - FLOAT_BTN_SIZE - 8));
                const clampedY = Math.max(8, Math.min(newY, window.innerHeight - FLOAT_BTN_SIZE - 8));
                setPerdaPosition({ x: clampedX, y: clampedY });
                perdaMovedRef.current = Math.hypot(dx, dy);
              };
                const onEnd = () => {
                  perdaDraggingRef.current = false;
                  saveFloatingPosition('floating:perda', perdaPosition);
                  void saveFloatingPositionServer(profile?.id, 'floating:perda', perdaPosition);
                  document.removeEventListener('touchmove', onMove);
                  document.removeEventListener('touchend', onEnd);
                };
              document.addEventListener('touchmove', onMove, { passive: false });
              document.addEventListener('touchend', onEnd);
            }}
            onClick={(e) => {
              if (perdaMovedRef.current > 6) {
                perdaMovedRef.current = 0;
                return;
              }
              setIsPerdaOpen(true);
            }}
            style={perdaPosition ? { left: perdaPosition.x, top: perdaPosition.y } : { right: 16, bottom: 80 }}
            className="fixed z-50 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-all z-50 flex items-center gap-2 group"
            title="Registrar Perda"
          >
            <AlertTriangle size={18} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
              Registrar Perda
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsPerdaOpen(true)}
            title="Registrar Perda"
            className="md:hidden fixed right-4 bottom-20 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
          >
            <AlertTriangle size={18} />
          </button>
        )}
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
            {/* KPIs de Metas (substitui Meta do Dia) */}
            {profile && (profile as any).role === 'pdv' ? (
              <MetaDoDiaWidget localId={localId} vendasHoje={vendasHoje} />
            ) : (
              <KPIsMetas />
            )}

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
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col gap-3 group select-none active:scale-95 duration-100 overflow-hidden"
                  >
                    <div className="w-full">
                      {produto.imagem_url ? (
                        <div className="mb-2 flex items-center justify-center overflow-hidden">
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="h-20 md:h-24 lg:h-28 w-auto max-w-full object-contain rounded-md"
                          />
                        </div>
                      ) : null}

                      <h3 className="font-bold text-slate-800 line-clamp-2 group-hover:text-orange-700">
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
                      <div className="mt-2 flex justify-end md:justify-between gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            solicitarReposicaoRapida(produto.id, 10);
                          }}
                          title="Solicitar Reposição (10 un)"
                          className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1 touch-none min-w-[72px] justify-center"
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
                          className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 min-w-[72px] justify-center"
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
            {/* Se houver promoções, exibir seção separada */}
            {promocoesPDV && promocoesPDV.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-2">Promoções</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {promocoesPDV.map((promo) => (
                    <div
                      key={promo.id}
                      onClick={() => addAoCarrinho(promo)}
                      className="bg-white p-3 rounded-xl border border-purple-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col gap-3 select-none active:scale-95 duration-100 overflow-hidden"
                    >
                      <div className="w-full">
                        {promo.imagem_url ? (
                          <div className="mb-2 flex items-center justify-center overflow-hidden">
                            <img src={promo.imagem_url} alt={promo.nome} className="h-20 w-auto object-contain rounded-md" />
                          </div>
                        ) : null}
                        <h3 className="font-bold text-slate-800 line-clamp-2">{promo.nome}</h3>
                        <p className="text-xs mt-1 text-slate-500">Combo — {promo.itens_combo?.length || 0} itens</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-purple-700">R$ {promo.preco_venda.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Histórico de Vendas (Sessão Atual) - movido para o final */}
            {ultimasVendas && ultimasVendas.length > 0 && (
              <div className="p-3 mt-4 bg-white rounded-xl border border-slate-200">
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Últimas Vendas (Sessão Atual)</h3>
                    <div className={`text-xs text-slate-500 space-y-2 overflow-auto ${historyExpanded ? 'max-h-96' : 'max-h-48'}`}>
                      {ultimasVendas.map((v) => (
                        <div key={v.id} className="py-2 border-b border-slate-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-slate-700 text-sm">{new Date(v.created_at).toLocaleString()}</div>
                              <div className="text-xs text-slate-400">{v.metodo_pagamento ?? '—'} • {v.status}</div>
                              {/* itens vendidos (pequeno) */}
                              {v.items && v.items.length > 0 && (
                                <div className="mt-1 text-xs text-slate-600">
                                  {v.items.slice(0, 3).map((it: any, idx: number) => (
                                    <span key={idx} className="inline-block mr-2">{it.quantidade}x {it.nome}</span>
                                  ))}
                                  {v.items.length > 3 && <span className="text-slate-400">(+{v.items.length - 3} outros)</span>}
                                </div>
                              )}
                            </div>
                            <div className="font-bold text-slate-800 ml-3">{formatCurrency(v.total_venda ?? 0)}</div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 text-right">
                        <button onClick={() => setHistoryExpanded((s) => !s)} className="text-xs text-slate-500 hover:text-slate-700">
                          {historyExpanded ? 'Reduzir' : 'Ampliar'}
                        </button>
                      </div>
                    </div>
              </div>
            )}
          </div>

          {/* DIREITA: CARRINHO E PAGAMENTO */}
          <div className="hidden md:flex w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex-col sticky top-16 self-start max-h-[calc(100vh-6rem)]">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ paddingBottom: '1rem' }}>
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
              {/* Fidelidade (controlada por configuração `fidelidade_ativa`) */}
              {pdvUsarFidelidade && (
                <ClienteFidelidade
                  totalVenda={totalVenda}
                  onClienteSelecionado={setClienteId}
                  onDescontoPontos={(pts, val) => {
                    setPontosUsados(pts);
                    setDescontoFidelidade(val);
                  }}
                />
              )}

              <div className="flex justify-between items-end mb-6">
                <span className="text-slate-500">Total a Pagar</span>
                <div className="text-right">
                  {descontoFidelidade > 0 && (
                    <span className="text-xs text-slate-400 block line-through">
                      R$ {totalVenda.toFixed(2)}
                    </span>
                  )}
                  <span className="text-3xl font-bold text-orange-700">
                    R$ {totalLiquido.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePaymentClick('dinheiro')}
                  disabled={carrinho.length === 0}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border ${selectedPayment === 'dinheiro' ? 'bg-orange-800 text-white scale-95 shadow-lg' : 'bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700'} transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                  <Banknote size={20} className="mb-1" />
                  <span className="text-xs font-bold">Dinheiro</span>
                </button>
                <button
                  onClick={() => handlePaymentClick('pix')}
                  disabled={carrinho.length === 0}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border ${selectedPayment === 'pix' ? 'bg-teal-700 text-white scale-95 shadow-lg' : 'bg-white hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700'} transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                  <QrCode size={20} className="mb-1" />
                  <span className="text-xs font-bold">Pix</span>
                </button>
                <button
                  onClick={() => handlePaymentClick('cartao_credito')}
                  disabled={carrinho.length === 0}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border ${selectedPayment === 'cartao_credito' ? 'bg-blue-700 text-white scale-95 shadow-lg' : 'bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'} transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                  <CreditCard size={20} className="mb-1" />
                  <span className="text-xs font-bold">Cartão</span>
                </button>
              </div>
              <div className="mt-3">
                {modoPdv === 'inventario' && (
                  <p className="text-xs text-orange-600 mb-2">Modo Inventário: a venda será registrada sem baixar estoque.</p>
                )}
                <button
                  onClick={() => void finalizarVenda()}
                  disabled={carrinho.length === 0 || !selectedPayment}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {modoPdv === 'inventario' ? 'Registrar Venda (Inventário)' : (selectedPayment ? 'Confirmar e Finalizar' : 'Selecione Pagamento')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Fixed Payment Bar */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 p-2 flex items-center gap-2">
        <div className="flex-1 pr-2">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-lg font-bold text-orange-700">R$ {totalLiquido.toFixed(2)}</div>
        </div>
        <button
          onClick={() => setShowCartModal(true)}
          aria-label="Ver carrinho"
          className="w-11 h-11 flex items-center justify-center bg-white border rounded-lg text-slate-700"
        >
          <ShoppingCart size={18} />
        </button>
        <button
          onClick={() => setShowHistoryModal(true)}
          title="Ver histórico"
          className="w-11 h-11 flex items-center justify-center bg-white border rounded-lg text-slate-700"
        >
          <Search size={18} />
        </button>
        <button
          onClick={() => handlePaymentClick('dinheiro')}
          disabled={carrinho.length === 0}
          className={`px-3 py-2 rounded-lg text-white flex items-center gap-2 ${selectedPayment === 'dinheiro' ? 'bg-orange-800 scale-95 shadow-lg' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          <Banknote size={16} /> Dinheiro
        </button>
        <button
          onClick={() => handlePaymentClick('pix')}
          disabled={carrinho.length === 0}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 ${selectedPayment === 'pix' ? 'bg-teal-700 text-white scale-95 shadow-lg' : 'bg-white border text-teal-700 hover:bg-teal-50'}`}
        >
          <QrCode size={16} /> Pix
        </button>
        <button
          onClick={() => handlePaymentClick('cartao_credito')}
          disabled={carrinho.length === 0}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 ${selectedPayment === 'cartao_credito' ? 'bg-blue-700 text-white scale-95 shadow-lg' : 'bg-white border text-blue-700 hover:bg-blue-50'}`}
        >
          <CreditCard size={16} /> Cartão
        </button>
        <button
          onClick={() => void finalizarVenda()}
          disabled={carrinho.length === 0 || !selectedPayment}
          className="ml-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          Finalizar
        </button>
      </div>

      {/* Drawer (animated) for mobile and small screens */}
      {drawerMounted && (
        <div
          className={`fixed inset-0 z-60 flex ${drawerEntering ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          {/* overlay */}
          <div
            onClick={() => setShowCartModal(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerEntering ? 'opacity-100' : 'opacity-0'}`}
          />

          <aside
            className={`relative ml-auto bg-white shadow-2xl w-full md:w-96 h-full transform transition-transform duration-300 ${drawerEntering ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Carrinho</h3>
              <button onClick={() => setShowCartModal(false)} className="text-slate-600">
                Fechar
              </button>
            </div>

            <div className="p-4 overflow-auto h-full">
              <div className="space-y-3">
                {carrinho.length === 0 ? (
                  <div className="text-center text-slate-400 mt-6">
                    <ShoppingCart size={48} className="opacity-20 mx-auto mb-2" />
                    <p>Carrinho vazio</p>
                  </div>
                ) : (
                  carrinho.map((item) => (
                    <div
                      key={item.produto.id}
                      className="flex justify-between items-center border-b border-slate-100 pb-3"
                    >
                      <div>
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

              <div className="mt-4 border-t pt-4 sticky bottom-0 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-lg font-bold text-orange-700">
                    R$ {totalLiquido.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setShowCartModal(false);
                      handlePaymentClick('dinheiro');
                    }}
                    disabled={carrinho.length === 0}
                    className={`p-3 rounded-lg ${selectedPayment === 'dinheiro' ? 'bg-orange-800 text-white scale-95 shadow-lg' : 'bg-orange-600 text-white'} `}
                  >
                    <Banknote size={16} className="inline-block mr-1" />
                    Dinheiro
                  </button>
                  <button
                    onClick={() => {
                      setShowCartModal(false);
                      handlePaymentClick('pix');
                    }}
                    disabled={carrinho.length === 0}
                    className={`p-3 rounded-lg ${selectedPayment === 'pix' ? 'bg-teal-700 text-white scale-95 shadow-lg' : 'bg-white border text-teal-700'}`}
                  >
                    <QrCode size={16} className="inline-block mr-1" />
                    Pix
                  </button>
                  <button
                    onClick={() => {
                      setShowCartModal(false);
                      handlePaymentClick('cartao_credito');
                    }}
                    disabled={carrinho.length === 0}
                    className={`p-3 rounded-lg ${selectedPayment === 'cartao_credito' ? 'bg-blue-700 text-white scale-95 shadow-lg' : 'bg-white border text-blue-700'}`}
                  >
                    <CreditCard size={16} className="inline-block mr-1" />
                    Cartão
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
      <RegistroPerdaModal
        isOpen={isPerdaOpen}
        onClose={() => setIsPerdaOpen(false)}
        localId={localId}
        produtos={produtos}
        onSuccess={handlePerdaSuccess}
        initialProdutoId={selectedProdutoForPerda}
        initialQuantidade={selectedQuantidadeForPerda ?? undefined}
      />

      {/* Histórico de vendas (modal para mobile) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-white max-w-lg w-full p-4 rounded-lg shadow-lg z-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Últimas Vendas (Sessão Atual)</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-600">Fechar</button>
            </div>
            <div className={`space-y-3 overflow-auto text-sm text-slate-700 ${historyExpanded ? 'max-h-96' : 'max-h-72'}`}>
              {ultimasVendas.length === 0 ? (
                <div className="text-slate-400">Nenhuma venda registrada nesta sessão.</div>
              ) : (
                ultimasVendas.map((v) => (
                  <div key={v.id} className="py-2 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{new Date(v.created_at).toLocaleString()}</div>
                        <div className="text-xs text-slate-400">{v.metodo_pagamento ?? '—'} • {v.status}</div>
                        {v.items && v.items.length > 0 && (
                          <div className="mt-1 text-xs text-slate-600">
                            {v.items.slice(0, 3).map((it: any, idx: number) => (
                              <span key={idx} className="inline-block mr-2">{it.quantidade}x {it.nome}</span>
                            ))}
                            {v.items.length > 3 && <span className="text-slate-400">(+{v.items.length - 3} outros)</span>}
                          </div>
                        )}
                      </div>
                      <div className="font-bold">{formatCurrency(v.total_venda ?? 0)}</div>
                    </div>
                  </div>
                ))
              )}
              <div className="mt-2 text-right">
                <button onClick={() => setHistoryExpanded((s) => !s)} className="text-xs text-slate-500 hover:text-slate-700">
                  {historyExpanded ? 'Reduzir' : 'Ampliar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal exibido quando a venda falha por caixa inválido/fechado */}
      {showCaixaErroModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white max-w-md w-full p-6 rounded-lg shadow-lg z-70">
            <h3 className="text-lg font-bold mb-2">Caixa fechado ou inválido</h3>
            <p className="text-sm text-slate-600 mb-4">
              Não foi possível concluir a venda porque o turno do caixa não está mais disponível.
              Reabra o caixa e tente novamente.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCaixaErroModal(false)}
                className="px-4 py-2 rounded-lg border bg-white"
              >
                Fechar
              </button>
              <Link href="/dashboard/pdv/controle-caixa">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white">Ir para Abertura de Caixa</button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
