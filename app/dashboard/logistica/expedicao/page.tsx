'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/shared'; // Ajustado para o padrão do seu projeto
import Loading from '@/components/ui/Loading';
import {
  Truck,
  ArrowRight,
  Package,
  Warehouse,
  CheckCircle2,
  X,
  Kanban as KanbanIcon,
} from 'lucide-react';
import Image from 'next/image';
import getImageUrl from '@/lib/getImageUrl';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function ExpedicaoPage() {
  const { profile, loading: authLoading } = useAuth();
  // Logo maior para o modo fullscreen: preferir logo da empresa (configuracoes_sistema),
  // cair para logo do usuário ou do tema.
  const [fullscreenLogoSrc, setFullscreenLogoSrc] = useState<string>('/logo.png');

  useEffect(() => {
    const loadFullscreenLogo = async () => {
      try {
        if (profile?.organization_id) {
          const { data, error } = await supabase
            .from('configuracoes_sistema')
            .select('company_logo_url')
            .eq('organization_id', profile.organization_id)
            .eq('chave', 'system_settings')
            .limit(1)
            .maybeSingle();
          if (!error && data?.company_logo_url) {
            const src = data.company_logo_url?.toString?.().trim?.();
            if (src) {
              setFullscreenLogoSrc(getImageUrl(src) || src);
              return;
            }
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // fallback: try theme from localStorage then user avatar then app logo
      try {
        let theme: any = null;
        const raw = localStorage.getItem('theme');
        theme = raw ? JSON.parse(raw) : ((window as any)?.theme ?? null);
        const company = theme?.company_logo_url?.toString?.().trim?.();
        const logo = theme?.logo_url?.toString?.().trim?.();
        const userLogo = profile?.avatar_url || (profile as any)?.foto_url || '';
        const pick = company || userLogo || logo || '/logo.png';
        setFullscreenLogoSrc(getImageUrl(pick) || pick);
      } catch (e) {
        const userLogo = profile?.avatar_url || (profile as any)?.foto_url || '/logo.png';
        setFullscreenLogoSrc(getImageUrl(userLogo) || userLogo);
      }
    };

    void loadFullscreenLogo();
  }, [profile?.organization_id, profile?.avatar_url, (profile as any)?.foto_url, profile?.nome]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<any[]>([]);
  const [fabrica, setFabrica] = useState<{ id: string; nome?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Estado do Formulário
  const [ordemSelecionada, setOrdemSelecionada] = useState<string>('');
  const [lojaDestino, setLojaDestino] = useState('');
  const [quantidadeReal, setQuantidadeReal] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [saldoOrigem, setSaldoOrigem] = useState<number>(0);
  const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
  const [locaisMap, setLocaisMap] = useState<Record<string, string>>({});
  const [produtosMap, setProdutosMap] = useState<Record<string, string>>({});
  const [ordensHasDataExpedicao, setOrdensHasDataExpedicao] = useState(false);
  const [ordensHasStatusLogistica, setOrdensHasStatusLogistica] = useState(false);
  const [validStatusLogisticaValues, setValidStatusLogisticaValues] = useState<string[] | null>(
    null
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDistribId, setHistoryDistribId] = useState<string | null>(null);
  const [plannedByPdv, setPlannedByPdv] = useState<any[]>([]);
  const [selectedPdvs, setSelectedPdvs] = useState<Record<string, boolean>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState<'trello' | 'vertical'>('trello');

  // Header measurement to reserve vertical space in full-screen mode
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(160);
  useEffect(() => {
    const measure = () => {
      const h = headerRef.current?.offsetHeight ?? 160;
      setHeaderHeight(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isFullScreen, profile?.nome]);

  // Utilitário de confirmação estilo sistema usando react-hot-toast
  const confirmAction = (message: string) =>
    new Promise<boolean>((resolve) => {
      const id = toast(
        (t) => (
          <div className="max-w-xs">
            <div className="text-sm font-medium">{message}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(id);
                  resolve(false);
                }}
                className="px-3 py-1 rounded border bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.dismiss(id);
                  resolve(true);
                }}
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    });

  useEffect(() => {
    async function carregarDados() {
      if (authLoading) return; // aguarda autenticação
      if (!profile?.organization_id) return;

      try {
        setLoading(true);

        // 1. Carregar a Fábrica de Origem
        const { data: fab } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile?.organization_id)
          .eq('tipo', 'fabrica')
          .maybeSingle();

        if (fab) setFabrica(fab);

        // 2. Buscar itens na tabela `distribuicao_pedidos` com status 'pendente'
        try {
          let distribs: any[] = [];
          if (fab?.id) {
            // 🎯 Query correta: buscar diretamente em `distribuicao_pedidos` onde `status = 'pendente'`
            // e percorrer a relação: distribuicao_pedidos -> ordem (ordens_producao) -> produto (produtos_finais)
            const { data: distribData, error: errDistrib } = await supabase
              .from('distribuicao_pedidos')
              .select(
                `
                id,
                quantidade_solicitada,
                local_destino_id,
                status,
                ordem:ordens_producao(id, numero_op, produto:produtos_finais(id, nome))
              `
              )
              .eq('organization_id', profile?.organization_id)
              .eq('status', 'pendente');

            if (errDistrib) throw errDistrib;
            distribs = distribData || [];
          }

          // Mapear distribuições para que cada card seja uma linha de distribuicao_pedidos
          const mapped = (distribs || []).map((d: any) => {
            // Extrai nome e id tentando percorrer a árvore de relações: ordem?.produto ou caminhos diretos
            const produtoObj = d.ordem?.produto || d.produto || d.produtos_finais || null;
            const produtoId = produtoObj?.id || d.produto_id || d.produto_final_id || null;
            const produtoNome = produtoObj?.nome || d.produto_nome || d.nome || null;
            return {
              id: d.id,
              id_op: d.ordem?.id || null,
              numero_op: d.ordem?.numero_op || 'S/N',
              quantidade_prevista: d.quantidade_solicitada || 0,
              local_destino_id: d.local_destino_id,
              produtos_finais: { nome: produtoNome || 'Produto Indefinido' },
              produto_id: produtoId,
              produto_nome: produtoNome,
              // manter o objeto bruto para debug/compatibilidade
              _raw: d,
            };
          });

          setOrdensFinalizadas(mapped);
        } catch (e) {
          console.error('Erro ao buscar distribuições pendentes para expedição:', e);
          setOrdensFinalizadas([]);
        }

        // 3. Carregar PDVs de Destino
        const { data: listaLojas } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('organization_id', profile.organization_id)
          .eq('tipo', 'pdv')
          .order('nome');

        setLojas(listaLojas || []);

        // 4. Carregar distribuições (envios) recentes — somente se soubermos a fábrica
        try {
          let list: any[] = [];
          if (fab?.id) {
            const { data: distribs } = await supabase
              .from('distribuicao_pedidos')
              .select(
                'id, produto_id, quantidade_solicitada, local_origem_id, local_destino_id, status, created_at, observacao, quantidade_recebida, ordem:ordens_producao(numero_op, produto_final_id)'
              )
              .eq('local_origem_id', fab.id)
              .order('created_at', { ascending: false })
              .limit(200);

            list = distribs || [];
            setDistribuicoes(list);
          } else {
            list = [];
            setDistribuicoes([]);
          }

          // Preload nomes de produtos e locais usados
          const produtoIds = Array.from(
            new Set(list.map((d) => d.produto_id || d.ordem?.produto_final_id).filter(Boolean))
          );
          const cleanProdutoIds = (produtoIds || [])
            .filter(Boolean)
            .filter((id) => id !== 'undefined');
          const localIds = Array.from(
            new Set(list.flatMap((d) => [d.local_origem_id, d.local_destino_id]).filter(Boolean))
          );

          if (cleanProdutoIds.length) {
            const { data: produtos } = await supabase
              .from('produtos_finais')
              .select('id, nome')
              .in('id', cleanProdutoIds);
            const map: Record<string, string> = {};
            (produtos || []).forEach((p: any) => (map[p.id] = p.nome));
            setProdutosMap(map);
          }

          if (localIds.length) {
            const { data: locaisList } = await supabase
              .from('locais')
              .select('id, nome')
              .in('id', (localIds || []).filter(Boolean));
            const map: Record<string, string> = {};
            (locaisList || []).forEach((l: any) => (map[l.id] = l.nome));
            setLocaisMap(map);
          }
        } catch (err) {
          console.error('Erro ao carregar distribuições:', err);
        }

        // Verificar colunas de ordens_producao via RPC `has_column` (info_schema bloqueado pelo PostgREST)
        try {
          const { data: hasDataExp } = (await supabase.rpc('has_column', {
            p_table_name: 'ordens_producao',
            p_column_name: 'data_expedicao',
          })) as any;
          const { data: hasStatusLog } = (await supabase.rpc('has_column', {
            p_table_name: 'ordens_producao',
            p_column_name: 'status_logistica',
          })) as any;

          setOrdensHasDataExpedicao(Boolean(hasDataExp));
          setOrdensHasStatusLogistica(Boolean(hasStatusLog));
        } catch (err) {
          console.warn(
            'Não foi possível verificar colunas de ordens_producao via RPC has_column:',
            err
          );
          setOrdensHasDataExpedicao(false);
          setOrdensHasStatusLogistica(false);
        }
      } catch (err) {
        console.error('Erro ao carregar expedição:', err);
        toast.error('Erro ao carregar dados da fábrica');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [profile?.organization_id, authLoading, reloadKey]);

  // Quando sabemos que a coluna existe, tentamos carregar os valores distintos
  useEffect(() => {
    const loadStatusValues = async () => {
      if (!ordensHasStatusLogistica) return setValidStatusLogisticaValues(null);
      try {
        const { data, error } = await supabase
          .from('ordens_producao')
          .select('status_logistica')
          .neq('status_logistica', null)
          .limit(1000);
        if (error) throw error;
        const vals = Array.from(
          new Set((data || []).map((r: any) => r.status_logistica).filter(Boolean))
        );
        setValidStatusLogisticaValues(vals);
      } catch (err) {
        console.warn('Não foi possível carregar valores de status_logistica:', err);
        setValidStatusLogisticaValues(null);
      }
    };
    void loadStatusValues();
  }, [ordensHasStatusLogistica]);

  // Helper para recarregar explicitamente valores válidos de status_logistica
  const refreshValidStatusLogisticaValues = async () => {
    if (!ordensHasStatusLogistica) return null;
    try {
      const { data, error } = await supabase
        .from('ordens_producao')
        .select('status_logistica')
        .neq('status_logistica', null)
        .limit(2000);
      if (error) throw error;
      const vals = Array.from(
        new Set((data || []).map((r: any) => r.status_logistica).filter(Boolean))
      );
      setValidStatusLogisticaValues(vals);
      return vals;
    } catch (err) {
      console.debug('refreshValidStatusLogisticaValues falhou:', err);
      return null;
    }
  };

  // Ao selecionar uma OP, preenchemos automaticamente o produto e a quantidade sugerida
  const handleSelectOP = async (id: string) => {
    const op = ordensFinalizadas.find((o) => o.id === id);
    if (op) {
      setOrdemSelecionada(id);
      setProdutoId(op.produto_final_id);
      setQuantidadeReal(op.quantidade_prevista.toString());
      toast.success(`OP ${op.numero_op} selecionada.`, { icon: '📦' });

      // Buscar saldo disponível na fábrica para este produto
      try {
        // Se não tivermos fábrica carregada, tente localizar uma agora (tipo 'fabrica' ou 'producao')
        let fabId = fabrica?.id;
        if (!fabId) {
          try {
            const { data: found } = await supabase
              .from('locais')
              .select('id, nome')
              .eq('organization_id', profile?.organization_id)
              .in('tipo', ['fabrica', 'producao'])
              .limit(1)
              .maybeSingle();

            if (found) {
              setFabrica(found);
              fabId = found.id;
            }
          } catch (innerErr) {
            console.warn('Busca alternativa por fábrica falhou:', innerErr);
          }
        }

        if (!fabId) {
          setSaldoOrigem(0);
          return;
        }

        const { data } = await supabase
          .from('estoque_produtos')
          .select('quantidade')
          .eq('local_id', fabId)
          .eq('produto_id', op.produto_final_id)
          .maybeSingle();

        setSaldoOrigem((data && (data as any).quantidade) || 0);
      } catch (err) {
        console.warn('Não foi possível buscar saldo da fábrica:', err);
        setSaldoOrigem(0);
      }

      // Buscar distribuições planejadas para esta OP (se existirem)
      try {
        const { data: planned } = await supabase
          .from('distribuicao_pedidos')
          .select(
            'id, produto_id, quantidade_solicitada, local_destino_id, local_origem_id, status'
          )
          .eq('ordem_producao_id', id)
          .order('local_destino_id');

        const plannedList = planned || [];
        if (plannedList.length) {
          // agrupar por local_destino_id (PDV)
          const groups: Record<string, any> = {};
          const produtoIds: string[] = [];
          const localIds: string[] = [];

          plannedList.forEach((p: any) => {
            const key = p.local_destino_id || 'unknown';
            produtoIds.push(p.produto_id);
            localIds.push(p.local_destino_id);
            if (!groups[key]) groups[key] = { pdvId: p.local_destino_id, items: [] };
            groups[key].items.push(p);
          });

          const grouped = Object.values(groups);
          setPlannedByPdv(grouped);
          // marcar todos selecionados por padrão
          const sel: Record<string, boolean> = {};
          grouped.forEach((g: any) => {
            sel[g.pdvId] = true;
          });
          setSelectedPdvs(sel);

          // preload nomes
          const cleanProdutoIds2 = (produtoIds || [])
            .filter(Boolean)
            .filter((id) => id !== 'undefined');
          if (cleanProdutoIds2.length) {
            const { data: produtos } = await supabase
              .from('produtos_finais')
              .select('id, nome')
              .in('id', cleanProdutoIds2 as any[]);
            const map: Record<string, string> = {};
            (produtos || []).forEach((p: any) => (map[p.id] = p.nome));
            setProdutosMap((prev) => ({ ...prev, ...map }));
          }
          if (localIds.length) {
            const { data: locaisList } = await supabase
              .from('locais')
              .select('id, nome')
              .in('id', (localIds || []).filter(Boolean));
            const map: Record<string, string> = {};
            (locaisList || []).forEach((l: any) => (map[l.id] = l.nome));
            setLocaisMap((prev) => ({ ...prev, ...map }));
          }
        } else {
          setPlannedByPdv([]);
        }
      } catch (err) {
        console.warn('Erro ao carregar distribuições planejadas:', err);
        setPlannedByPdv([]);
      }
    }
  };

  // Tenta registrar uma entrada em `distribuicao_pedidos` para rastrear o despacho
  const ensureDistribuicaoRegistro = async (payload: {
    produto_id: string;
    quantidade: number;
    local_origem_id: string | undefined;
    local_destino_id: string;
    ordem_producao_id?: string;
    status?: string;
  }) => {
    try {
      // Verifica se já existe um registro equivalente (mesma OP + destino + produto)
      const where: any = {};
      if (payload.ordem_producao_id) where.ordem_producao_id = payload.ordem_producao_id;
      if (payload.local_destino_id) where.local_destino_id = payload.local_destino_id;
      if (payload.produto_id) where.produto_id = payload.produto_id;

      const { data: existing, error: selErr } = await supabase
        .from('distribuicao_pedidos')
        .select('id, status')
        .match(where)
        .limit(1)
        .maybeSingle();

      if (selErr) {
        // Se não conseguimos ler, abortamos silenciosamente
        console.warn('Não foi possível verificar distribuicao_pedidos existente:', selErr);
        return null;
      }

      if (existing && (existing as any).id) return (existing as any).id;

      // Inserir com status padrão 'pendente' (para evitar que PDV liste como 'enviado' antes do envio)
      const insertObj: any = {
        produto_id: payload.produto_id,
        quantidade_solicitada: payload.quantidade,
        local_origem_id: payload.local_origem_id,
        local_destino_id: payload.local_destino_id,
        ordem_producao_id: payload.ordem_producao_id || null,
        status: payload.status || 'pendente',
        organization_id: profile?.organization_id || null,
      };

      const { data: insData, error: insErr } = await supabase
        .from('distribuicao_pedidos')
        .insert(insertObj)
        .select('id')
        .single();
      if (insErr) {
        console.warn('Falha ao inserir distribuicao_pedidos (ignorando):', insErr);
        return null;
      }

      return (insData as any)?.id ?? null;
    } catch (err) {
      console.debug('distribuicao_pedidos não disponível ou erro ao inserir:', err);
      return null;
    }
  };

  const handleTogglePdv = (pdvId: string) => {
    setSelectedPdvs((prev) => ({ ...prev, [pdvId]: !prev[pdvId] }));
  };

  const handleDispatchPlanned = async () => {
    if (!ordemSelecionada) return toast.error('Selecione uma OP');
    if (!fabrica?.id) return toast.error('Fábrica não carregada');

    const groupsToSend = plannedByPdv.filter((g) => selectedPdvs[g.pdvId]);
    if (!groupsToSend.length) return toast.error('Nenhuma PDV selecionada para envio');

    try {
      setEnviando(true);
      for (const g of groupsToSend) {
        for (const item of g.items) {
          const payload = {
            p_produto_id: item.produto_id,
            p_quantidade: item.quantidade_solicitada,
            p_local_origem_id: fabrica.id,
            p_local_destino_id: g.pdvId,
            p_ordem_producao_id: ordemSelecionada,
          } as any;

          // Garantir registro de distribuição (pendente) antes da RPC para evitar condições de corrida
          const distribId = await ensureDistribuicaoRegistro({
            produto_id: item.produto_id,
            quantidade: item.quantidade_solicitada,
            local_origem_id: fabrica.id,
            local_destino_id: g.pdvId,
            ordem_producao_id: ordemSelecionada,
          });

          const { data: rpcData, error: rpcError } = (await supabase.rpc(
            'enviar_carga_loja',
            payload
          )) as any;
          if (rpcError) {
            const rawMsg = String(rpcError?.message || rpcError || '');
            toast.error(rawMsg || 'Erro ao despachar item');
            throw rpcError;
          }
          const result = rpcData || {};
          if (result.success === false) {
            toast.error(result.message || 'Erro na expedição: motivo desconhecido');
            throw new Error(result.message || 'RPC returned success=false');
          }

          // Após RPC bem-sucedida: 1) atualizar OP para 'enviado' 2) marcar distribuição como 'enviado'
          try {
            if (ordemSelecionada) {
              const opUpdate: any = { updated_at: new Date().toISOString() };
              if (ordensHasStatusLogistica) {
                const desired = 'enviado';
                let allowed = validStatusLogisticaValues;
                if (allowed && !allowed.includes(desired)) {
                  const refreshed = await refreshValidStatusLogisticaValues();
                  allowed = refreshed || allowed;
                }
                if (!allowed || allowed.includes(desired)) {
                  opUpdate.status_logistica = desired;
                }
              }
              const { error: opErr } = await supabase
                .from('ordens_producao')
                .update(opUpdate)
                .eq('id', ordemSelecionada);
              if (opErr)
                console.warn('Falha ao atualizar status_logistica da OP (não fatal):', opErr);
            }

            if (distribId) {
              await supabase
                .from('distribuicao_pedidos')
                .update({ status: 'enviado', updated_at: new Date().toISOString() })
                .eq('id', distribId);
              // Registrar histórico de envio (não-fatal)
              try {
                await supabase.from('envios_historico').insert({
                  distrib_id: distribId,
                  ordem_producao_id: ordemSelecionada || null,
                  produto_id: item.produto_id,
                  quantidade: item.quantidade_solicitada,
                  local_origem_id: fabrica?.id || null,
                  local_destino_id: g.pdvId,
                  enviado_por: profile?.id || null,
                  enviado_em: new Date().toISOString(),
                  status: 'enviado',
                });
              } catch (histErr) {
                console.warn('Falha ao registrar histórico de envio (não fatal):', histErr);
              }
            }
          } catch (e) {
            console.warn('Falha ao marcar distribuição como enviado (não fatal):', e);
          }
        }
      }

      // Atualizar OP como finalizada/enviado
      const updates: any = {
        status: 'finalizada',
        quantidade_produzida: Number(quantidadeReal) || undefined,
      };
      if (ordensHasStatusLogistica) {
        const desired = 'enviado';
        let allowed = validStatusLogisticaValues;
        if (allowed && !allowed.includes(desired)) {
          const refreshed = await refreshValidStatusLogisticaValues();
          allowed = refreshed || allowed;
        }
        if (!allowed || allowed.includes(desired)) {
          updates.status_logistica = desired;
        }
      }
      if (ordensHasDataExpedicao) updates.data_expedicao = new Date().toISOString();

      // Dois passos: atualiza primeiro campos sem `status_logistica`, depois tenta
      // aplicar `status_logistica` separadamente para evitar que a constraint
      // impeça a atualização principal.
      const updatesNoStatus = { ...updates };
      const hasStatus = Object.prototype.hasOwnProperty.call(updatesNoStatus, 'status_logistica');
      if (hasStatus) delete updatesNoStatus.status_logistica;

      const { error: updErr1 } = await supabase
        .from('ordens_producao')
        .update(updatesNoStatus)
        .eq('id', ordemSelecionada);
      if (updErr1) {
        const msg = String(updErr1?.message ?? updErr1);
        if (msg.includes('ordens_producao_status_logistica_check')) {
          toast(
            'Atualização parcial: campo status_logistica foi ignorado por restrição do banco.',
            { icon: '⚠️' }
          );
        } else {
          throw updErr1;
        }
      }

      if (hasStatus) {
        try {
          const { error: updErr2 } = await supabase
            .from('ordens_producao')
            .update({ status_logistica: updates.status_logistica })
            .eq('id', ordemSelecionada);
          if (updErr2) {
            const msg = String(updErr2?.message ?? updErr2);
            if (msg.includes('ordens_producao_status_logistica_check')) {
              toast(
                'Atualização parcial: campo status_logistica foi ignorado por restrição do banco.',
                { icon: '⚠️' }
              );
            } else {
              throw updErr2;
            }
          }
        } catch (e) {
          console.warn('Falha ao setar status_logistica separadamente:', e);
        }
      }

      toast.success('Despacho planejado confirmado e enviado para os PDVs.', { icon: '🚚' });

      // Remover OP da lista e limpar estados
      const selectedId = ordemSelecionada;
      setOrdensFinalizadas((prev) => prev.filter((o) => o.id !== selectedId));
      setOrdemSelecionada('');
      setPlannedByPdv([]);
      setSelectedPdvs({});
      setQuantidadeReal('');
      setLojaDestino('');
    } catch (err: any) {
      console.error('Erro ao despachar planejado:', err);
      toast.error('Erro ao despachar planejado: ' + (err?.message ?? String(err)));
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviar = async () => {
    if (!ordemSelecionada || !lojaDestino || !quantidadeReal) {
      return toast.error('Selecione a Ordem, o Destino e a Quantidade Real');
    }
    if (!fabrica?.id) {
      return toast.error('Fábrica de origem não encontrada.');
    }

    const selectedId = ordemSelecionada;
    const qtd = Number(parseFloat(quantidadeReal));
    if (!isFinite(qtd) || qtd <= 0) return toast.error('Quantidade inválida');
    if (saldoOrigem < qtd)
      return toast.error(`Saldo insuficiente na fábrica! Disponível: ${saldoOrigem}`);

    try {
      setEnviando(true);

      const payload = {
        p_produto_id: produtoId,
        p_quantidade: qtd,
        p_local_origem_id: fabrica.id,
        p_local_destino_id: lojaDestino,
        p_ordem_producao_id: selectedId,
      } as Record<string, any>;

      console.debug('Chamando RPC enviar_carga_loja com', payload);

      // 1. Garantir registro de distribuição (pendente) antes da transferência
      const distribId = await ensureDistribuicaoRegistro({
        produto_id: produtoId,
        quantidade: qtd,
        local_origem_id: fabrica.id,
        local_destino_id: lojaDestino,
        ordem_producao_id: selectedId,
      });

      // 2. Chamada para a RPC que transfere o estoque da fábrica para o PDV
      const { data: rpcData, error: rpcError } = (await supabase.rpc(
        'enviar_carga_loja',
        payload
      )) as any;
      if (rpcError) {
        toast.error(String(rpcError?.message || rpcError || 'Erro ao despachar item'));
        throw rpcError;
      }
      const rpcResult = rpcData || {};
      if (rpcResult.success === false) {
        toast.error(rpcResult.message || 'Erro na expedição');
        throw new Error(rpcResult.message || 'RPC returned success=false');
      }

      // 3. Atualizar OP para 'enviado' para que PDV passe a enxergar o item
      try {
        if (selectedId) {
          const opUpdate: any = { updated_at: new Date().toISOString() };
          if (ordensHasStatusLogistica) {
            const desired = 'enviado';
            let allowed = validStatusLogisticaValues;
            if (allowed && !allowed.includes(desired)) {
              const refreshed = await refreshValidStatusLogisticaValues();
              allowed = refreshed || allowed;
            }
            if (!allowed || allowed.includes(desired)) {
              opUpdate.status_logistica = desired;
            }
          }
          const { error: opErr } = await supabase
            .from('ordens_producao')
            .update(opUpdate)
            .eq('id', selectedId);
          if (opErr) console.warn('Falha ao atualizar status_logistica da OP (não fatal):', opErr);
        }
      } catch (e) {
        console.warn('Erro ao atualizar OP para enviado:', e);
      }

      // 4. Registrar/atualizar distribuição para rastreio (agora como enviado)
      try {
        if (distribId) {
          await supabase
            .from('distribuicao_pedidos')
            .update({ status: 'enviado', updated_at: new Date().toISOString() })
            .eq('id', distribId);
          try {
            await supabase.from('envios_historico').insert({
              distrib_id: distribId,
              ordem_producao_id: selectedId || null,
              produto_id: produtoId,
              quantidade: qtd,
              local_origem_id: fabrica?.id || null,
              local_destino_id: lojaDestino,
              enviado_por: profile?.id || null,
              enviado_em: new Date().toISOString(),
              status: 'enviado',
            });
          } catch (histErr) {
            console.warn('Falha ao registrar histórico de envio (não fatal):', histErr);
          }
        } else {
          // fallback: tentar inserir como 'enviado' para histórico e criar registro de distribuição
          try {
            const newDistrib = await ensureDistribuicaoRegistro({
              produto_id: produtoId,
              quantidade: qtd,
              local_origem_id: fabrica.id,
              local_destino_id: lojaDestino,
              ordem_producao_id: selectedId,
              status: 'enviado',
            });
            if (newDistrib) {
              await supabase.from('envios_historico').insert({
                distrib_id: newDistrib,
                ordem_producao_id: selectedId || null,
                produto_id: produtoId,
                quantidade: qtd,
                local_origem_id: fabrica?.id || null,
                local_destino_id: lojaDestino,
                enviado_por: profile?.id || null,
                enviado_em: new Date().toISOString(),
                status: 'enviado',
              });
            }
          } catch (histErr) {
            console.warn(
              'Falha ao garantir distribuição e registrar histórico (não fatal):',
              histErr
            );
          }
        }
      } catch (e) {
        console.warn('Falha ao garantir registro de distribuição pós-RPC:', e);
      }

      // 2. Atualizar a OP para tirá-la do fluxo de expedição e concluir o processo
      const updates: any = {
        status: 'finalizada',
        quantidade_produzida: parseFloat(quantidadeReal),
      };

      if (ordensHasStatusLogistica) {
        const desired = 'enviado';
        let allowed = validStatusLogisticaValues;
        if (allowed && !allowed.includes(desired)) {
          const refreshed = await refreshValidStatusLogisticaValues();
          allowed = refreshed || allowed;
        }
        if (!allowed || allowed.includes(desired)) {
          updates.status_logistica = desired;
        }
      }
      if (ordensHasDataExpedicao) updates.data_expedicao = new Date().toISOString();

      const updatesNoStatusB = { ...updates };
      const hasStatusB = Object.prototype.hasOwnProperty.call(updatesNoStatusB, 'status_logistica');
      if (hasStatusB) delete updatesNoStatusB.status_logistica;

      const { error: updErr3 } = await supabase
        .from('ordens_producao')
        .update(updatesNoStatusB)
        .eq('id', selectedId);
      if (updErr3) {
        const msg = String(updErr3?.message ?? updErr3);
        if (msg.includes('ordens_producao_status_logistica_check')) {
          toast(
            'Atualização parcial: campo status_logistica foi ignorado por restrição do banco.',
            { icon: '⚠️' }
          );
        } else {
          throw updErr3;
        }
      }

      if (hasStatusB) {
        try {
          const { error: updErr4 } = await supabase
            .from('ordens_producao')
            .update({ status_logistica: updates.status_logistica })
            .eq('id', selectedId);
          if (updErr4) {
            const msg = String(updErr4?.message ?? updErr4);
            if (msg.includes('ordens_producao_status_logistica_check')) {
              toast(
                'Atualização parcial: campo status_logistica foi ignorado por restrição do banco.',
                { icon: '⚠️' }
              );
            } else {
              throw updErr4;
            }
          }
        } catch (e) {
          console.warn('Falha ao setar status_logistica separadamente:', e);
        }
      }

      // Registrar/atualizar distribuição para rastreio (se não foi possível criar antes)
      try {
        if (distribId) {
          await supabase
            .from('distribuicao_pedidos')
            .update({ status: 'enviado', updated_at: new Date().toISOString() })
            .eq('id', distribId);
        } else {
          // fallback: tentar inserir como 'enviado' para histórico
          await ensureDistribuicaoRegistro({
            produto_id: produtoId,
            quantidade: qtd,
            local_origem_id: fabrica.id,
            local_destino_id: lojaDestino,
            ordem_producao_id: selectedId,
            status: 'enviado',
          });
        }
      } catch (e) {
        console.warn('Falha ao garantir registro de distribuição pós-RPC:', e);
      }

      toast.success('Produto despachado! Estoque do PDV atualizado.', {
        duration: 5000,
        icon: '🚚',
      });

      // Limpar formulário e atualizar lista (usar selectedId antes de limpar estados)
      setOrdensFinalizadas((prev) => prev.filter((o) => o.id !== selectedId));
      setOrdemSelecionada('');
      setLojaDestino('');
      setQuantidadeReal('');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro no despacho: ' + (err?.message ?? String(err)));
    } finally {
      setEnviando(false);
    }
  };

  // Agrupa ordens por PDV usando apenas os registros de `distribuicao_pedidos` (fonte única de verdade)
  const ordensPorPdv: Record<string, any[]> = {};

  // Inicializa todas as lojas com arrays vazios
  lojas.forEach((l) => (ordensPorPdv[l.id] = []));

  // Distribui os itens vindos do banco nas colunas das lojas
  ordensFinalizadas.forEach((item) => {
    const destinoId = item.local_destino_id;
    if (destinoId && ordensPorPdv[destinoId]) {
      ordensPorPdv[destinoId].push(item);
    }
  });

  // Envio em lote para os itens selecionados em uma coluna (PDV)
  const handleEnviarCargaCompleta = async (pdvId: string, itens: any[], forceSend = false) => {
    const selecionados = forceSend
      ? itens
      : itens.filter((item) => selectedPdvs[`${pdvId}-${item.id}`]);
    if (selecionados.length === 0) return toast.error('Selecione ao menos um item.');

    const toastId = toast.loading(`Despachando carga...`);
    setEnviando(true);

    try {
      // --- Pré-check de estoque: buscar saldos na fábrica para todos os produtos selecionados
      const produtoIds = Array.from(new Set(selecionados.map((s) => s.produto_id).filter(Boolean)));
      if (produtoIds.length > 0 && fabrica?.id) {
        const { data: stocks, error: stocksErr } = await supabase
          .from('estoque_produtos')
          .select('produto_id, quantidade')
          .eq('local_id', fabrica.id)
          .in('produto_id', produtoIds);

        if (stocksErr) {
          console.warn('Não foi possível carregar saldos para pré-check de expedição:', stocksErr);
        } else {
          const stockMap: Record<string, number> = {};
          (stocks || []).forEach((s: any) => (stockMap[s.produto_id] = Number(s.quantidade || 0)));
          const insuficientes = selecionados.filter(
            (s) => (stockMap[s.produto_id] || 0) < (s.quantidade_prevista || 0)
          );
          if (insuficientes.length > 0) {
            const nomes = insuficientes
              .map((it) => it.produto_nome || it.produtos_finais?.nome || it.produto_id)
              .slice(0, 3)
              .join(', ');
            toast.error(`Estoque insuficiente para: ${nomes}. Verifique antes de enviar.`, {
              id: toastId,
            });
            throw new Error('Pré-check: estoque insuficiente');
          }
        }
      }

      for (const item of selecionados) {
        // 1. Chama a RPC para movimentar o estoque (Fábrica -> Loja)
        const { data: rpcData, error: rpcError } = (await supabase.rpc('enviar_carga_loja', {
          p_produto_id: item.produto_id,
          p_quantidade: item.quantidade_prevista,
          p_local_origem_id: fabrica?.id,
          p_local_destino_id: pdvId,
          p_ordem_producao_id: item.id_op,
        })) as any;

        if (rpcError) {
          toast.error(String(rpcError?.message || rpcError || 'Erro ao despachar item'));
          throw rpcError;
        }
        const rpcResult = rpcData || {};
        if (rpcResult.success === false) {
          toast.error(rpcResult.message || 'Erro na expedição: motivo desconhecido');
          throw new Error(rpcResult.message || 'RPC returned success=false');
        }

        // 2. Atualiza a OP associada para 'enviado' para que o PDV passe a ver a carga
        try {
          if (item.id_op) {
            const opUpdate: any = { updated_at: new Date().toISOString() };
            if (ordensHasStatusLogistica) {
              const desired = 'enviado';
              let allowed = validStatusLogisticaValues;
              if (allowed && !allowed.includes(desired)) {
                const refreshed = await refreshValidStatusLogisticaValues();
                allowed = refreshed || allowed;
              }
              if (!allowed || allowed.includes(desired)) {
                opUpdate.status_logistica = desired;
              }
            }

            const { error: opErr } = await supabase
              .from('ordens_producao')
              .update(opUpdate)
              .eq('id', item.id_op);
            if (opErr)
              console.warn('Falha ao atualizar status_logistica da OP (não fatal):', opErr);
          }
        } catch (e) {
          console.warn('Erro não fatal ao atualizar OP após envio:', e);
        }

        // 3. Atualiza a linha da distribuição para 'enviado'
        const { error: distError } = await supabase
          .from('distribuicao_pedidos')
          .update({ status: 'enviado', updated_at: new Date().toISOString() })
          .eq('id', item.id);

        if (distError) throw distError;
      }

      toast.success('Carga enviada com sucesso!', { id: toastId });
      // Recarrega os dados e limpa seleção
      setSelectedPdvs({});
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      console.error('Erro no despacho em lote:', err);
      toast.error('Erro ao despachar itens: ' + (err?.message ?? String(err)), { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  // Seleciona / Desmarca todos os itens de uma coluna
  const handleToggleAllInColumn = (pdvId: string, itens: any[]) => {
    const todosMarcados = itens.every((it) => selectedPdvs[`${pdvId}-${it.id}`]);
    const novosStatus = { ...selectedPdvs };
    itens.forEach((it) => {
      novosStatus[`${pdvId}-${it.id}`] = !todosMarcados;
    });
    setSelectedPdvs(novosStatus);
  };

  // Gera mensagem e abre WhatsApp para aviso de saída
  const enviarAvisoWhatsapp = (lojaNome: string, itensEnviados: any[]) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    let mensagem = `*📦 AVISO DE EXPEDIÇÃO - ${lojaNome.toUpperCase()}*\n`;
    mensagem += `_Saída da Fábrica em: ${dataHora}_\n\n`;
    mensagem += `*Itens Enviados:*\n`;
    itensEnviados.forEach((item) => {
      const nomeProd =
        produtosMap[item.produto_id] ||
        item.produtos_finais?.nome ||
        item.produto_nome ||
        'Produto Indefinido';
      mensagem += `✅ ${item.quantidade_prevista} un - ${nomeProd}\n`;
    });
    mensagem += `\n*Status:* Em trânsito 🚚`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // Gera um romaneio imprimível (abre em nova janela para permitir salvar como PDF)
  const gerarRomaneioPdf = (lojaNome: string, itensEnviados: any[]) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    const titulo = `ROMANEIO - ${lojaNome}`;
    const rows = itensEnviados
      .map((it, idx) => {
        const nomeProduto =
          produtosMap[it.produto_id] || it.produtos_finais?.nome || it.produto_nome || '-';
        return `<tr><td style="padding:8px;border:1px solid #fcc4e3">${idx + 1}</td><td style="padding:8px;border:1px solid #fcc4e3;text-align:left">${nomeProduto}</td><td style="padding:8px;border:1px solid #fcc4e3;text-align:center">${it.quantidade_prevista || it.quantidade || 0}</td><td style="padding:8px;border:1px solid #fcc4e3">OP #${it.numero_op || it.ordem?.numero_op || ''}</td></tr>`;
      })
      .join('');

    const logoTag = fullscreenLogoSrc
      ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img src="${fullscreenLogoSrc}" style="height:48px;object-fit:contain;margin-right:12px"/><div><h1 style="margin:0;font-size:18px">${titulo}</h1><div style="font-size:12px;color:#666">Loja: ${lojaNome} · Data: ${dataHora}</div></div></div>`
      : `<h1>${titulo}</h1><div><strong>Loja:</strong> ${lojaNome}</div><div><strong>Data:</strong> ${dataHora}</div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Inter,system-ui,Arial;margin:24px;color:#111}h1{font-size:18px}table{border-collapse:collapse;width:100%;margin-top:12px}th{background:#fcc4e3;padding:8px;border:1px solid #fcc4e3;text-align:left}</style></head><body>${logoTag}<table><thead><tr><th style="padding:8px;border:1px solid #fcc4e3">#</th><th style="padding:8px;border:1px solid #fcc4e3">Produto</th><th style="padding:8px;border:1px solid #fcc4e3;text-align:center">Quantidade</th><th style="padding:8px;border:1px solid #fcc4e3">OP</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:18px;color:#666">Gerado pelo sistema de Expedição</p><script>setTimeout(()=>{window.print()},400)</script></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      toast.error(
        'Não foi possível abrir a janela do romaneio. Verifique o bloqueador de pop-ups.'
      );
    }
  };

  // Marca itens como em trânsito (confirma saída do motorista)
  const handleConfirmarSaida = async (pdvId: string, itens: any[]) => {
    if (!itens || itens.length === 0)
      return toast.error('Nenhum item selecionado para confirmar saída.');
    try {
      setEnviando(true);
      const processed: string[] = [];
      for (const item of itens) {
        // Se tivermos id_op, atualiza a OP correspondente (status_logistica)
        try {
          if (item.id_op) {
            const { error: err2 } = await supabase
              .from('ordens_producao')
              .update({ status_logistica: 'enviado' })
              .eq('id', item.id_op);
            if (err2) {
              const msg = String(err2?.message ?? err2);
              if (msg.includes('ordens_producao_status_logistica_check')) {
                toast(
                  `Atualização parcial OP ${item.numero_op}: status_logistica ignorado por restrição.`,
                  { icon: '⚠️' }
                );
              } else {
                console.warn('Erro ao setar status_logistica:', err2);
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao setar status_logistica:', e);
        }

        // Atualiza a linha da distribuicao_pedidos pela própria id da distribuição
        try {
          const { error: errD } = await supabase
            .from('distribuicao_pedidos')
            .update({ status: 'enviado', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          if (errD) console.warn('Falha ao atualizar distribucao_pedidos:', errD);
        } catch (e) {
          // ignora
        }

        // Garantir registro caso não exista
        void ensureDistribuicaoRegistro({
          produto_id: item.produto_id,
          quantidade: item.quantidade_prevista || item.quantidade || 0,
          local_origem_id: fabrica?.id,
          local_destino_id: pdvId,
          ordem_producao_id: item.id_op || undefined,
          status: 'enviado',
        });

        processed.push(item.id);
      }

      toast.success('Saída confirmada. Itens marcados como em trânsito.');
      // Remover itens processados da listagem local para feedback imediato
      setOrdensFinalizadas((prev) => prev.filter((o) => !processed.includes(o.id)));
      const novosSelecionados = { ...selectedPdvs };
      processed.forEach((id) => delete novosSelecionados[`${pdvId}-${id}`]);
      setSelectedPdvs(novosSelecionados);
      // Forçar recarregamento dos dados
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Erro ao confirmar saída:', err);
      toast.error('Erro ao confirmar saída.');
    } finally {
      setEnviando(false);
    }
  };

  // Atalho de teclado para tela cheia (F) e Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        )
          setIsFullScreen((prev) => !prev);
      }
      if (e.key === 'Escape' && isFullScreen) setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  if (loading) return <Loading />;

  const canDispatch = Boolean(fabrica && saldoOrigem > 0);
  const disabledReason = !fabrica
    ? 'Fábrica de origem não encontrada.'
    : saldoOrigem <= 0
      ? `Saldo insuficiente na fábrica. Disponível: ${saldoOrigem}`
      : '';

  return (
    <div
      className={`flex flex-col gap-6 animate-fade-up ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-100 p-4 h-screen w-screen overflow-auto' : 'p-6 max-w-5xl mx-auto'}`}
    >
      <Toaster position="top-right" />

      <div ref={headerRef as any}>
        <PageHeader
          title="Expedição & Logística"
          description="Envie o que foi produzido para as prateleiras dos PDVs."
          icon={Truck}
        >
          {isFullScreen && (
            <div className="mr-4 hidden sm:flex items-center">
              <div className="rounded-md overflow-hidden bg-white p-1 shadow-sm">
                <Image
                  src={fullscreenLogoSrc}
                  alt={profile?.nome || 'Logo'}
                  width={86}
                  height={86}
                  className="object-contain"
                  unoptimized
                  loading="eager"
                />
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                aria-pressed={viewMode === 'trello'}
                onClick={() => setViewMode('trello')}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                  viewMode === 'trello' ? 'bg-slate-800 text-white' : 'bg-white border'
                }`}
              >
                Trello
              </button>
              <button
                aria-pressed={viewMode === 'vertical'}
                onClick={() => setViewMode('vertical')}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                  viewMode === 'vertical' ? 'bg-slate-800 text-white' : 'bg-white border'
                }`}
              >
                Vertical
              </button>
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsFullScreen((s) => !s)}
              className="flex items-center gap-2"
            >
              {isFullScreen ? <X size={16} /> : <Truck size={16} />}
              {isFullScreen ? 'Sair da Tela Cheia' : 'Modo Foco (Tela Cheia)'}
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Container: suporta modo Trello (colunas) e Vertical (lista por loja) */}
      {viewMode === 'trello' ? (
        <div
          className={`flex-1 flex gap-6 overflow-x-auto overflow-y-auto pb-4 mt-2 h-full items-start custom-scrollbar`}
          style={isFullScreen ? { maxHeight: `calc(100vh - ${headerHeight + 40}px)` } : undefined}
        >
          {lojas.map((loja) => {
            const itens = ordensPorPdv[loja.id] || [];
            const selecionadosNaColuna = itens.filter(
              (it) => selectedPdvs[`${loja.id}-${it.id}`]
            ).length;
            const todosEstaoMarcados = itens.length > 0 && selecionadosNaColuna === itens.length;

            return (
              <div
                key={loja.id}
                className="min-w-[320px] w-[320px] max-h-full flex flex-col bg-slate-200/50 rounded-xl border border-slate-300 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-white border-b border-slate-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{loja.nome}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Destino PDV</p>
                    </div>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                      {itens.length}
                    </span>
                  </div>

                  {itens.length > 0 && (
                    <button
                      onClick={() => handleToggleAllInColumn(loja.id, itens)}
                      className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${
                        todosEstaoMarcados
                          ? 'text-emerald-600'
                          : 'text-slate-400 hover:text-blue-600'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {todosEstaoMarcados ? 'Desmarcar todos' : 'Conferir todos'}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {itens.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center opacity-30">
                      <Package size={40} />
                      <p className="text-xs font-bold mt-2">Sem carga pendente</p>
                    </div>
                  ) : (
                    itens.map((item) => {
                      const isChecked = !!selectedPdvs[`${loja.id}-${item.id}`];
                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            setSelectedPdvs((prev) => ({
                              ...prev,
                              [`${loja.id}-${item.id}`]: !isChecked,
                            }))
                          }
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all active:scale-95 ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-500 shadow-inner'
                              : 'bg-white border-transparent shadow-sm hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="text-[9px] font-black text-slate-400">
                              #{item.numero_op}
                            </span>
                            {isChecked && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </div>
                          <h4 className="font-bold text-slate-700 text-sm mt-1">
                            {produtosMap[item.produto_id] ||
                              item.produtos_finais?.nome ||
                              item.produto_nome ||
                              'Produto Indefinido'}
                          </h4>
                          <div className="flex justify-between items-end mt-3">
                            <span className="text-xs font-bold text-slate-500">Qtd:</span>
                            <span className="text-lg font-black text-blue-700">
                              {item.quantidade_prevista}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {itens.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>CONFERIDO:</span>
                      <span
                        className={selecionadosNaColuna === itens.length ? 'text-emerald-600' : ''}
                      >
                        {selecionadosNaColuna} / {itens.length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-300 flex gap-2 items-center">
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              const confirmed = await confirmAction(
                                `Confirmar despacho de TODOS os itens para ${loja.nome}?`
                              );
                              if (confirmed) void handleEnviarCargaCompleta(loja.id, itens, true);
                            }}
                            disabled={itens.length === 0 || enviando}
                            variant="secondary"
                            className="h-12"
                          >
                            Despachar Todos
                          </Button>

                          <Button
                            onClick={() => handleEnviarCargaCompleta(loja.id, itens)}
                            disabled={selecionadosNaColuna === 0 || enviando}
                            className="w-full font-bold h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg disabled:opacity-30 flex items-center justify-center gap-2"
                          >
                            {enviando ? <Loading /> : <Truck size={18} />}
                            {enviando ? 'Enviando...' : `Enviar (${selecionadosNaColuna})`}
                          </Button>
                        </div>
                      </div>
                      <div className="w-36 flex flex-col gap-2">
                        <Button
                          onClick={async () => {
                            const confirmed = await confirmAction(
                              `Confirmar saída dos itens para ${loja.nome}?`
                            );
                            if (confirmed) void handleConfirmarSaida(loja.id, itens);
                          }}
                          disabled={itens.length === 0 || enviando}
                          variant="secondary"
                          className="w-full h-12"
                        >
                          Confirmar Saída
                        </Button>
                        <Button
                          onClick={() =>
                            gerarRomaneioPdf(locaisMap[loja.id] || loja.nome || loja.id, itens)
                          }
                          variant="secondary"
                          className="w-full h-12"
                        >
                          Romaneio
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 mt-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {lojas.map((loja) => {
              const itens = ordensPorPdv[loja.id] || [];
              const selecionadosNaColuna = itens.filter(
                (it) => selectedPdvs[`${loja.id}-${it.id}`]
              ).length;
              return (
                <div key={loja.id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{loja.nome}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Destino PDV</p>
                    </div>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                      {itens.length}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {itens.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">Sem carga pendente</div>
                    ) : (
                      itens.map((item) => {
                        const isChecked = !!selectedPdvs[`${loja.id}-${item.id}`];
                        return (
                          <div
                            key={item.id}
                            onClick={() =>
                              setSelectedPdvs((prev) => ({
                                ...prev,
                                [`${loja.id}-${item.id}`]: !isChecked,
                              }))
                            }
                            className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'bg-white border-transparent'
                            }`}
                          >
                            <div className="flex justify-between">
                              <span className="text-xs font-black text-slate-400">
                                #{item.numero_op}
                              </span>
                              {isChecked && <CheckCircle2 size={16} className="text-emerald-500" />}
                            </div>
                            <div className="font-bold text-slate-700 text-sm mt-1">
                              {produtosMap[item.produto_id] ||
                                item.produtos_finais?.nome ||
                                item.produto_nome ||
                                'Produto Indefinido'}
                            </div>
                            <div className="flex justify-between items-end mt-2">
                              <span className="text-xs font-bold text-slate-500">Qtd:</span>
                              <span className="text-lg font-black text-blue-700">
                                {item.quantidade_prevista}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {itens.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-36">
                        <Button
                          onClick={async () => {
                            const confirmed = await confirmAction(
                              `Confirmar despacho de TODOS os itens para ${loja.nome}?`
                            );
                            if (confirmed) void handleEnviarCargaCompleta(loja.id, itens, true);
                          }}
                          disabled={itens.length === 0 || enviando}
                          variant="secondary"
                          className="w-full h-12"
                        >
                          Despachar Todos
                        </Button>
                      </div>
                      <div className="flex-1">
                        <Button
                          onClick={() => handleEnviarCargaCompleta(loja.id, itens)}
                          disabled={selecionadosNaColuna === 0 || enviando}
                          className="w-full font-bold h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          {enviando ? 'Enviando...' : `Enviar (${selecionadosNaColuna})`}
                        </Button>
                      </div>
                      <div className="w-36 flex flex-col gap-2">
                        <Button
                          onClick={async () => {
                            const confirmed = await confirmAction(
                              `Confirmar saída dos itens para ${loja.nome}?`
                            );
                            if (confirmed) void handleConfirmarSaida(loja.id, itens);
                          }}
                          disabled={itens.length === 0 || enviando}
                          variant="secondary"
                          className="w-full h-12"
                        >
                          Confirmar Saída
                        </Button>
                        <Button
                          onClick={() =>
                            gerarRomaneioPdf(locaisMap[loja.id] || loja.nome || loja.id, itens)
                          }
                          variant="secondary"
                          className="w-full h-12"
                        >
                          Romaneio
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Distribuições enviadas */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Distribuições enviadas</h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase">
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">OP</th>
                  <th className="px-3 py-2">Quantidade</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Observação</th>
                  <th className="px-3 py-2">Enviado em</th>
                  <th className="px-3 py-2">Histórico</th>
                </tr>
              </thead>
              <tbody>
                {distribuicoes.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 text-sm">
                    <td className="px-3 py-3">
                      {produtosMap[d.produto_id || d.ordem?.produto_final_id] ||
                        d.produto_id ||
                        d.ordem?.produto_final_id}
                    </td>
                    <td className="px-3 py-3 text-xs font-bold">{d.ordem?.numero_op || '—'}</td>
                    <td className="px-3 py-3">{d.quantidade_solicitada}</td>
                    <td className="px-3 py-3">
                      {locaisMap[d.local_origem_id] || d.local_origem_id}
                    </td>
                    <td className="px-3 py-3">
                      {locaisMap[d.local_destino_id] || d.local_destino_id}
                    </td>
                    <td className="px-3 py-3">
                      {d.status === 'enviado' ? (
                        <span className="inline-block px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold">
                          Pendente
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          Confirmada
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-xl text-xs text-slate-600">
                      {d.observacao ||
                        (d.quantidade_recebida && d.quantidade_recebida != d.quantidade_solicitada
                          ? `Recebido: ${d.quantidade_recebida}`
                          : '—')}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700"
                        onClick={async () => {
                          try {
                            setHistoryLoading(true);
                            setHistoryDistribId(d.id);
                            setHistoryOpen(true);
                            const { data } = await supabase
                              .from('movimentacao_estoque')
                              .select(
                                'id, produto_id, quantidade, tipo_movimento, origem, destino, observacao, referencia_id, created_at'
                              )
                              .eq('referencia_id', d.id)
                              .order('created_at', { ascending: false });
                            setHistoryRecords(data || []);
                          } catch (err) {
                            console.error('Erro ao carregar histórico:', err);
                            toast.error('Erro ao carregar histórico');
                          } finally {
                            setHistoryLoading(false);
                          }
                        }}
                      >
                        Ver histórico
                      </Button>
                    </td>
                  </tr>
                ))}
                {distribuicoes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                      Nenhuma distribuição encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Histórico Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">Histórico de Movimentações</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Distribuição: {historyDistribId}</span>
                <Button
                  size="sm"
                  variant="cancel"
                  onClick={() => {
                    setHistoryOpen(false);
                    setHistoryRecords([]);
                    setHistoryDistribId(null);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>

            {historyLoading ? (
              <div className="p-6 text-center">Carregando...</div>
            ) : historyRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Nenhum registro encontrado.</div>
            ) : (
              <div className="overflow-auto max-h-96">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="px-2 py-2">Data</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Quantidade</th>
                      <th className="px-2 py-2">Origem</th>
                      <th className="px-2 py-2">Destino</th>
                      <th className="px-2 py-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="px-2 py-2 text-xs text-slate-500">
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-sm">{h.tipo_movimento || h.tipo}</td>
                        <td className="px-2 py-2 text-sm">{h.quantidade}</td>
                        <td className="px-2 py-2 text-sm">{h.origem}</td>
                        <td className="px-2 py-2 text-sm">{h.destino}</td>
                        <td className="px-2 py-2 text-sm text-slate-600">{h.observacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
