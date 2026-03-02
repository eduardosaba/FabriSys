'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { getActiveLocal } from '@/lib/activeLocal';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import {
  ChefHat,
  ArrowRight,
  Package,
  CheckCircle,
  Kanban as KanbanIcon,
  Printer,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/shared';
import getImageUrl from '@/lib/getImageUrl';
import { Clock, User } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Função utilitária: calcula tempo desde o updated_at
const calcularTempoNoEstagio = (updatedAt: string) => {
  try {
    const dataAntiga = new Date(updatedAt).getTime();
    const agora = Date.now();
    const diferencaEmMinutos = Math.floor((agora - dataAntiga) / (1000 * 60));

    if (diferencaEmMinutos < 60) {
      return `${diferencaEmMinutos}m`;
    }

    const horas = Math.floor(diferencaEmMinutos / 60);
    const mins = diferencaEmMinutos % 60;

    if (horas < 24) {
      return `${horas}h ${mins}m`;
    }

    const dias = Math.floor(horas / 24);
    return `${dias}d ${horas % 24}h`;
  } catch (e) {
    return '-';
  }
};

// Definição das colunas do fluxo
const COLUNAS = [
  { id: 'planejamento', label: '📦 A Fazer / OP', cor: 'bg-gray-100 border-gray-300' },
  { id: 'fogao', label: 'No Fogão 🔥', cor: 'bg-orange-50 border-orange-200' },
  { id: 'descanso', label: 'Descanso ❄️', cor: 'bg-blue-50 border-blue-200' },
  { id: 'finalizacao', label: '✨ Confeitagem 🍬', cor: 'bg-purple-50 border-purple-200' },
  { id: 'concluido', label: '✅ Concluído 🚚', cor: 'bg-green-50 border-green-200' },
];

interface OrdemKanban {
  id: string;
  numero_op: string;
  produto_nome: string;
  produto_final_id?: string;
  produto_tipo?: string;
  quantidade_prevista: number;
  qtd_receitas: number;
  massa_total: number;
  estagio: string;
  updated_at: string;
  supervisor?: { nome?: string; avatar_url?: string } | null;
  distribuicao: { local: string; qtd: number }[];
  baseDisponivel?: boolean;
  baseDetalhes?: any[];
}

export default function KanbanPage() {
  const { profile, loading: authLoading } = useAuth();

  // Logo: tenta buscar em `configuracoes_sistema.company_logo_url`,
  // depois em localStorage `user_theme_colors`/`theme`, e por fim usa '/logo.png'.
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [fullscreenLogoSrc, setFullscreenLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        if (profile?.organization_id) {
          const { data, error } = await supabase
            .from('configuracoes_sistema')
            .select('company_logo_url')
            .eq('organization_id', profile.organization_id)
            .limit(1)
            .maybeSingle();

          if (!error && data?.company_logo_url) {
            const src = data.company_logo_url?.toString?.().trim?.();
            if (src) {
              setLogoSrc(getImageUrl(src) || src);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Falha ao obter logo de config:', err);
      }

      try {
        let theme: any = null;
        const raw = localStorage.getItem('user_theme_colors') ?? localStorage.getItem('theme');
        theme = raw ? JSON.parse(raw) : ((window as any)?.theme ?? null);
        const company = theme?.company_logo_url?.toString?.().trim?.();
        const logo = theme?.logo_url?.toString?.().trim?.();
        const pick = company || logo || '/logo.png';
        setLogoSrc(getImageUrl(pick) || pick);
      } catch (e) {
        setLogoSrc('/logo.png');
      }
    };

    void loadLogo();
  }, [profile?.organization_id]);

  // Garantir que, ao entrar em tela cheia, priorizamos a company_logo_url (configurações do sistema)
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

      // fallback: usar o logo carregado normalmente (tema/localStorage) ou '/logo.png'
      setFullscreenLogoSrc(logoSrc || '/logo.png');
    };

    void loadFullscreenLogo();
  }, [profile?.organization_id, logoSrc]);
  const [ordens, setOrdens] = useState<OrdemKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [movendo, setMovendo] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ordensHasStatusLogistica, setOrdensHasStatusLogistica] = useState(false);
  const [validStatusLogisticaValues, setValidStatusLogisticaValues] = useState<string[] | null>(
    null
  );

  const mountedRef = useRef(true);

  // Estado para controlar qual ordem está sendo expedida (abre o modal)
  const [ordemParaExpedir, setOrdemParaExpedir] = useState<OrdemKanban | null>(null);
  const kanbanRootRef = useRef<HTMLDivElement | null>(null);

  const carregarKanban = async () => {
    try {
      if (authLoading) return; // aguarda autenticação
      if (!profile?.organization_id) return; // precisa do organization para filtrar com RLS
      // Primeiro, tenta filtrar por status_logistica != 'pendente' (se a coluna existir)
      let data: any[] | null = null;
      let error: any = null;

      const localIdFilter = getActiveLocal() ?? profile?.local_id;

      const makeBaseQuery = () => {
        let q: any = supabase
          .from('ordens_producao')
          .select(
            `
          id, numero_op, quantidade_prevista,
          qtd_receitas_calculadas, massa_total_kg, estagio_atual, status,
          produto_final_id, updated_at, data_inicio, supervisor_producao,
          distribuicao:distribuicao_pedidos!ordem_producao_id(quantidade_solicitada, local:locais!local_destino_id(nome))
        `
          )
          .order('created_at', { ascending: true });

        // Mostrar ordens vivas + finalizadas enquanto pertencem ao estagio de producao
        q = q.in('status', ['pendente', 'em_producao', 'finalizada']);

        if (localIdFilter) q = q.eq('local_destino_id', localIdFilter);
        if (profile?.organization_id) q = q.eq('organization_id', profile.organization_id);

        return q;
      };

      // Tentar buscar ordens que ainda estão na produção (não entregues)
      try {
        // 🎯 AJUSTE: queremos ordens cujo fluxo logístico ainda não foi concluído
        // (status_logistica != 'entregue'). Isso mantém a ordem no Kanban mesmo
        // que o campo `status` seja 'finalizada'.
        const res = await makeBaseQuery().neq('estagio_atual', 'finalizado');

        data = res.data ?? null;
        error = res.error ?? null;
        if (error) throw error;
      } catch (e) {
        // Fallback caso a coluna `status_logistica` não exista ou gere erro:
        // traga tudo que o makeBaseQuery já filtra (pendente, em_producao, finalizada).
        const res2 = await makeBaseQuery();
        data = res2.data ?? null;
        error = res2.error ?? null;
        if (error) throw error;
      }

      if (error) throw error;

      const rows = data ?? [];

      const produtoIds = Array.from(
        new Set((rows || []).map((r: any) => String(r.produto_final_id)).filter(Boolean))
      );
      const cleanProdutoIds = (produtoIds || []).filter(Boolean).filter((id) => id !== 'undefined');
      const supervisorIds = Array.from(
        new Set(
          (rows || [])
            .map((r: any) => r.supervisor_producao)
            .filter((id: any) => id !== null && id !== undefined && id !== '')
            .map((id: any) => String(id))
        )
      );
      const produtoMap: Record<string, { nome?: string; tipo?: string }> = {};
      const supervisorMap: Record<string, { nome?: string; avatar_url?: string } | null> = {};
      if (cleanProdutoIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos_finais')
          .select('id, nome, tipo')
          .in('id', cleanProdutoIds as any[]);
        const produtosArr = (produtos as any[]) || [];
        produtosArr.forEach(
          (p: any) => (produtoMap[String(p.id)] = { nome: p.nome, tipo: p.tipo })
        );
      }

      if (supervisorIds.length > 0) {
        const { data: sups } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url')
          .in('id', (supervisorIds || []).filter(Boolean));
        const supsArr = (sups as any[]) || [];
        supsArr.forEach(
          (s: any) => (supervisorMap[String(s.id)] = { nome: s.nome, avatar_url: s.avatar_url })
        );
      }

      console.debug('[Kanban] carregarKanban rows=', (rows || []).length);

      const formatadas: OrdemKanban[] = rows.map((d) => {
        const obj = d as Record<string, unknown>;

        const distribuicaoRaw = (obj['distribuicao'] as unknown[]) ?? [];
        const distribuicao = distribuicaoRaw.map((dist) => {
          const di = dist as Record<string, unknown>;
          const localField = di['local'];
          const localObj = Array.isArray(localField) ? localField[0] : localField;
          return {
            local: String((localObj as Record<string, unknown> | undefined)?.['nome'] ?? ''),
            qtd: Number(di['quantidade_solicitada'] ?? 0),
          };
        });

        // Supervisor: usamos o id supervisor_producao e mapeamos com supervisorMap
        const supId = String(obj['supervisor_producao'] ?? '');
        const supervisor = supervisorMap[supId] ?? null;

        return {
          id: String(obj['id'] ?? ''),
          numero_op: String(obj['numero_op'] ?? ''),
          produto_final_id: String(obj['produto_final_id'] ?? ''),
          produto_nome: String(produtoMap[String(obj['produto_final_id'])]?.nome ?? ''),
          produto_tipo: String(produtoMap[String(obj['produto_final_id'])]?.tipo ?? ''),
          quantidade_prevista: Number(obj['quantidade_prevista'] ?? 0),
          qtd_receitas: Number(obj['qtd_receitas_calculadas'] ?? 0),
          massa_total: Number(obj['massa_total_kg'] ?? 0),
          estagio: String(obj['estagio_atual'] ?? 'planejamento'),
          updated_at: String(obj['updated_at'] ?? obj['data_inicio'] ?? new Date().toISOString()),
          supervisor,
          distribuicao,
          baseDisponivel: true,
          baseDetalhes: [] as any,
        };
      });

      // Para OPs que são produtos acabados, verificar disponibilidade de bases (semi-acabados)
      const checks = formatadas.map(async (o) => {
        // se o produto for acabado, verificar bases necessárias
        if (o.produto_tipo === 'acabado') {
          try {
            const { data }: any = await supabase.rpc('check_bases_disponiveis', { p_op_id: o.id });
            if (data) {
              o.baseDisponivel = Boolean(data.tem_base ?? true);
              o.baseDetalhes = data.detalhes ?? [];
            }
          } catch (err) {
            console.warn('check_bases_disponiveis falhou para OP', o.id, err);
            o.baseDisponivel = true;
          }
        }
        return o;
      });

      const withChecks = await Promise.all(checks);
      if (mountedRef.current) setOrdens(withChecks);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar quadro.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!authLoading && profile?.organization_id) {
      void carregarKanban();
    }

    const interval = setInterval(() => {
      if (!authLoading && profile?.organization_id) void carregarKanban();
    }, 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [authLoading, profile?.organization_id]);

  // Verifica se a coluna `status_logistica` existe e carrega valores distintos
  useEffect(() => {
    const loadStatusInfo = async () => {
      if (!profile?.organization_id) return;
      try {
        const { data: hasCol } = (await supabase.rpc('has_column', {
          p_table_name: 'ordens_producao',
          p_column_name: 'status_logistica',
        })) as any;
        setOrdensHasStatusLogistica(Boolean(hasCol));

        if (hasCol) {
          const { data, error } = await supabase
            .from('ordens_producao')
            .select('status_logistica')
            .neq('status_logistica', null)
            .limit(1000);
          if (!error) {
            const vals = Array.from(
              new Set((data || []).map((r: any) => r.status_logistica).filter(Boolean))
            );
            setValidStatusLogisticaValues(vals);
          }
        }
      } catch (err) {
        console.warn('Não foi possível checar status_logistica:', err);
        setOrdensHasStatusLogistica(false);
        setValidStatusLogisticaValues(null);
      }
    };

    void loadStatusInfo();
  }, [profile?.organization_id]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (kanbanRootRef.current) await kanbanRootRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('fullscreen error', err);
    }
  };

  const moverOrdem = async (ordemId: string, estagioAtual: string, novoEstagioManual?: string) => {
    // Se for manual (ex: expedição -> concluído), usa ele. Senão calcula o próximo.
    let proximoEstagio = novoEstagioManual;

    if (!proximoEstagio) {
      const idxAtual = COLUNAS.findIndex((c) => c.id === estagioAtual);
      if (idxAtual === -1 || idxAtual === COLUNAS.length - 1) return;
      proximoEstagio = COLUNAS[idxAtual + 1].id;
    }

    // Se o próximo estágio for 'concluido', apenas movemos o estagio —
    // não finalizamos automaticamente. Finalização / expedição deve ser
    // uma ação explícita do usuário (botão 'Enviar para Expedição').
    if (proximoEstagio === 'concluido') {
      setMovendo(ordemId);
      try {
        const rpcRes = (await supabase.rpc('movimentar_ordem', {
          p_ordem_id: ordemId,
          p_novo_estagio: proximoEstagio,
          p_novo_status: null,
        })) as unknown as { data?: unknown; error?: unknown };

        const error = rpcRes.error;
        const data = rpcRes.data;
        if (error) {
          const msg = String((error as any)?.message ?? error);
          if (msg.includes('ordens_producao_status_logistica_check')) {
            toast.error('Movimento inválido: conflito com campo status_logistica');
            return;
          }
          throw error;
        }

        const resp = data as Record<string, unknown> | null;
        const success = Boolean(resp?.['success']);
        const message = String(resp?.['message'] ?? 'Ordem movida para Concluído');

        if (!success) {
          toast.error(message || 'Falha ao mover ordem para Concluído');
          return;
        }

        // Registrar quem fez o movimento (supervisor_producao)
        try {
          await supabase
            .from('ordens_producao')
            .update({ supervisor_producao: profile?.id, updated_at: new Date().toISOString() })
            .eq('id', ordemId);
        } catch (updErr) {
          console.warn('Não foi possível registrar supervisor_producao:', updErr);
        }

        toast.success(message || 'Ordem movida');
        await carregarKanban();
      } catch (err: any) {
        console.error('Erro ao mover ordem para concluido:', err);
        const msg = String(err?.message ?? err);
        if (
          msg.includes('ordens_producao_status_logistica_check') ||
          msg.includes('status_logistica')
        ) {
          toast.error('Movimento inválido: conflito com o fluxo logístico (status_logistica).');
        } else {
          toast.error('Erro ao mover ordem.');
        }
      } finally {
        if (mountedRef.current) setMovendo(null);
      }
      return;
    }

    // Caso genérico: mantemos o comportamento anterior para mover entre colunas
    setMovendo(ordemId);
    try {
      const rpcRes = (await supabase.rpc('movimentar_ordem', {
        p_ordem_id: ordemId,
        p_novo_estagio: proximoEstagio,
        p_novo_status: null,
      })) as unknown as { data?: unknown; error?: unknown };

      const data = rpcRes.data;
      const error = rpcRes.error;

      if (error) {
        const msg = String((error as any)?.message ?? error);
        if (msg.includes('ordens_producao_status_logistica_check')) {
          toast.error('Movimento inválido: conflito com campo status_logistica');
          return;
        }
        throw error;
      }

      const resp = data as Record<string, unknown> | null;
      const success = Boolean(resp?.['success']);
      const message = String(resp?.['message'] ?? '');

      if (success) {
        toast.success(message || 'Ordem movida');
        // Registrar supervisor da movimentação (não interrompe o fluxo se falhar)
        try {
          await supabase
            .from('ordens_producao')
            .update({ supervisor_producao: profile?.id, updated_at: new Date().toISOString() })
            .eq('id', ordemId);
        } catch (updErr) {
          console.warn('Não foi possível registrar supervisor_producao:', updErr);
        }

        // Atualizar o Kanban local — a RPC já mudou o estado no servidor
        await carregarKanban();
      } else {
        toast.error(message || 'Falha ao mover ordem');
      }
    } catch (err: any) {
      console.error(err);
      const msg = String(err?.message ?? err);
      if (
        msg.includes('ordens_producao_status_logistica_check') ||
        msg.includes('status_logistica')
      ) {
        toast.error('Movimento inválido: conflito com o fluxo logístico (status_logistica).');
      } else {
        toast.error('Erro ao mover ordem.');
      }
    } finally {
      if (mountedRef.current) setMovendo(null);
    }
  };

  // --- Funções de Expedição ---
  const handleExpedir = (ordem: OrdemKanban) => {
    setOrdemParaExpedir(ordem);
  };

  const enviarParaExpedicao = async (ordemId: string) => {
    const toastId = toast.loading('Enviando para expedição...');
    try {
      const updates: any = { data_entrega_prevista: new Date().toISOString() };
      const desired = 'em_transito';
      if (ordensHasStatusLogistica) {
        if (!validStatusLogisticaValues || validStatusLogisticaValues.includes(desired)) {
          updates.status_logistica = desired;
        } else {
          console.warn(
            'Skipping status_logistica update: value not allowed by DB constraint',
            desired
          );
          toast('Campo status_logistica ignorado: valor não permitido pelo banco.', { icon: '⚠️' });
        }
      } else {
        // coluna não existe — tentar setar mesmo assim (silencioso)
        updates.status_logistica = desired;
      }

      // Primeiro atualiza campos que não sejam `status_logistica` para evitar que
      // a constraint bloqueie toda a atualização. Depois tentamos aplicar
      // `status_logistica` separadamente e apenas avisamos se houver problema.
      const updatesNoStatus = { ...updates };
      const hasStatus = Object.prototype.hasOwnProperty.call(updatesNoStatus, 'status_logistica');
      if (hasStatus) delete updatesNoStatus.status_logistica;

      const { error: err1 } = await supabase
        .from('ordens_producao')
        .update(updatesNoStatus)
        .eq('id', ordemId);

      if (err1) {
        const msg = String(err1?.message ?? err1);
        // Se o erro for especificamente sobre a constraint de status_logistica,
        // permitimos continuar; caso contrário, relançamos.
        if (msg.includes('ordens_producao_status_logistica_check')) {
          console.warn('Atualização parcial: campo status_logistica não aceito pelo banco.');
        } else {
          throw err1;
        }
      }

      if (hasStatus) {
        try {
          const { error: err2 } = await supabase
            .from('ordens_producao')
            .update({ status_logistica: updates.status_logistica })
            .eq('id', ordemId);
          if (err2) {
            const msg = String(err2?.message ?? err2);
            if (msg.includes('ordens_producao_status_logistica_check')) {
              console.warn(
                'Atualização parcial: campo status_logistica foi ignorado por restrição do banco.'
              );
            } else {
              throw err2;
            }
          }
        } catch (e) {
          console.warn('Falha ao setar status_logistica separadamente:', e);
        }
      }

      toast.success('Ordem enviada para a logística!', { id: toastId });
      // Remover do Kanban localmente se necessário
      setOrdens((prev) => prev.filter((o) => o.id !== ordemId));
      // Garantir que existam registros de distribuição para expedição
      try {
        const { data: ordemRow } = await supabase
          .from('ordens_producao')
          .select(
            'distribuicao:distribuicao_pedidos(quantidade_solicitada, local:locais!local_destino_id(nome)), produto_final_id'
          )
          .eq('id', ordemId)
          .limit(1)
          .maybeSingle();

        const distrib = (ordemRow as any)?.distribuicao || [];
        const produtoId = (ordemRow as any)?.produto_final_id ?? null;

        for (const dest of distrib) {
          try {
            let localId: string | null = null;
            try {
              const { data: localRow } = await supabase
                .from('locais')
                .select('id')
                .ilike('nome', dest.local)
                .limit(1)
                .maybeSingle();
              localId = (localRow as any)?.id ?? null;
            } catch (e) {
              console.warn('Não foi possível resolver local por nome:', dest.local, e);
            }

            const upsertBody: any = {
              ordem_producao_id: ordemId,
              quantidade_solicitada: dest.quantidade_solicitada ?? dest.qtd,
              status: 'pendente',
            };
            if (localId) upsertBody.local_destino_id = localId;
            if (produtoId) upsertBody.produto_final_id = produtoId;

            const onConflict = localId ? 'ordem_producao_id,local_destino_id' : 'ordem_producao_id';
            const { error: upErr } = await supabase
              .from('distribuicao_pedidos')
              .upsert(upsertBody, { onConflict });
            if (upErr) {
              // Se o banco não tiver o índice único para o ON CONFLICT, fallback para insert/select
              const msg = String(upErr?.message || upErr || '');
              if (
                msg.includes(
                  'there is no unique or exclusion constraint matching the ON CONFLICT specification'
                )
              ) {
                try {
                  // Tenta encontrar registro existente por ordem+local
                  const match: any = {};
                  match.ordem_producao_id = ordemId;
                  if (localId) match.local_destino_id = localId;
                  const { data: existing } = await supabase
                    .from('distribuicao_pedidos')
                    .select('id')
                    .match(match)
                    .limit(1)
                    .maybeSingle();
                  if (!existing) {
                    // inserir manualmente
                    const { error: insErr } = await supabase
                      .from('distribuicao_pedidos')
                      .insert(upsertBody);
                    if (insErr)
                      console.warn('Falha ao inserir distribuicao_pedidos no fallback:', insErr);
                  }
                } catch (fbErr) {
                  console.warn('Fallback insert/upsert falhou:', fbErr);
                }
              } else {
                console.warn('Falha ao upsert em distribucao_pedidos:', upErr);
              }
            }
          } catch (e) {
            console.warn('Erro ao criar/atualizar distribuicao_pedidos para destino', dest, e);
          }
        }
      } catch (e) {
        console.warn('Erro ao garantir registros de distribuicao_pedidos:', e);
      }

      await carregarKanban();
    } catch (err: any) {
      console.error('Erro ao enviar para expedição:', err);
      toast.error('Falha ao enviar para expedição: ' + (err?.message || 'Erro desconhecido'), {
        id: toastId,
      });
    }
  };

  const confirmarExpedicao = async () => {
    if (!ordemParaExpedir) return;
    const toastId = toast.loading('Finalizando e abastecendo estoque...');

    try {
      // 1) Executa a RPC de finalização (o servidor deve atualizar estoque_produtos)
      if (ordemParaExpedir.produto_tipo === 'semi_acabado') {
        const { error } = await supabase.rpc('finalizar_producao_intermediaria', {
          p_op_id: ordemParaExpedir.id,
          p_quantidade: ordemParaExpedir.quantidade_prevista,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('finalizar_op_kanban', {
          p_op_id: ordemParaExpedir.id,
          p_quantidade_produzida: ordemParaExpedir.quantidade_prevista,
        });
        if (error) throw error;
      }

      // 2) Atualiza a OP Mestre para liberar para expedição
      const { error: opError } = await supabase
        .from('ordens_producao')
        .update({
          status: 'finalizada',
          estagio_atual: 'finalizado',
          quantidade_produzida: ordemParaExpedir.quantidade_prevista,
          data_fim: new Date().toISOString(),
          finalizado_por: profile?.id,
          status_logistica: 'aguardando_expedicao',
        })
        .eq('id', ordemParaExpedir.id);

      if (opError) throw opError;

      // 3) Sincroniza/garante registros em distribuicao_pedidos (sem tocar updated_at)
      for (const dest of ordemParaExpedir.distribuicao || []) {
        try {
          const { data: localData } = await supabase
            .from('locais')
            .select('id')
            .ilike('nome', dest.local)
            .limit(1)
            .maybeSingle();

          const localId = (localData as any)?.id ?? null;

          const upsertBody: any = {
            ordem_producao_id: ordemParaExpedir.id,
            local_destino_id: localId ?? null,
            produto_id: ordemParaExpedir.produto_final_id ?? null,
            quantidade_solicitada: dest.qtd,
            status: 'pendente',
            organization_id: profile?.organization_id,
          };

          const onConflict = localId ? 'ordem_producao_id,local_destino_id' : 'ordem_producao_id';
          const { error: upErr } = await supabase
            .from('distribuicao_pedidos')
            .upsert(upsertBody, { onConflict });
          if (upErr) {
            const msg = String(upErr?.message || upErr || '');
            if (
              msg.includes(
                'there is no unique or exclusion constraint matching the ON CONFLICT specification'
              )
            ) {
              try {
                const match: any = { ordem_producao_id: ordemParaExpedir.id };
                if (localId) match.local_destino_id = localId;
                const { data: existing } = await supabase
                  .from('distribuicao_pedidos')
                  .select('id')
                  .match(match)
                  .limit(1)
                  .maybeSingle();
                if (!existing) {
                  const { error: insErr } = await supabase
                    .from('distribuicao_pedidos')
                    .insert(upsertBody);
                  if (insErr)
                    console.warn('Falha ao inserir distribuicao_pedidos no fallback:', insErr);
                }
              } catch (fbErr) {
                console.warn('Fallback insert/upsert falhou:', fbErr);
              }
            } else {
              console.error('Erro no upsert de distribuicao_pedidos:', upErr);
            }
          }
        } catch (e) {
          console.warn('Erro ao sincronizar distribuicao_pedidos para destino', dest, e);
        }
      }

      toast.success('Concluído! Produto disponível na Fábrica e na Expedição.', { id: toastId });
      setOrdens((prev) => prev.filter((o) => o.id !== ordemParaExpedir.id));
      setOrdemParaExpedir(null);
      await carregarKanban();
    } catch (err: any) {
      console.error('Erro ao finalizar:', err);
      toast.error('Erro: ' + (err?.message || String(err)), { id: toastId });
    }
  };

  if (loading) return <Loading />;

  return (
    <div
      ref={kanbanRootRef}
      className="flex flex-col h-[calc(100vh-6rem)] p-6 overflow-hidden animate-fade-up"
    >
      <Toaster position="top-center" />

      <PageHeader
        title="Quadro de Produção (Kanban)"
        description="Acompanhamento em tempo real do chão de fábrica."
        icon={KanbanIcon}
      >
        <div className="flex items-center gap-3">
          {isFullscreen ? (
            <div className="hidden sm:block w-16 h-16 rounded-md overflow-hidden bg-slate-100">
              <Image
                src={fullscreenLogoSrc || logoSrc || '/logo.png'}
                alt={profile?.nome || profile?.email || 'Logo do sistema'}
                width={86}
                height={86}
                className="object-contain"
                unoptimized
                loading="eager"
              />
            </div>
          ) : null}

          <div className="ml-2">
            <Button
              variant="secondary"
              onClick={() => void toggleFullscreen()}
              className="flex items-center gap-2"
            >
              {isFullscreen ? <X size={16} /> : <KanbanIcon size={16} />}
              {isFullscreen ? 'Sair da Tela Cheia' : 'Modo Foco (Tela Cheia)'}
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-x-auto overflow-y-hidden mt-4">
        <div className="flex gap-4 h-full min-w-[1200px]">
          {COLUNAS.map((coluna) => {
            const ordensColuna = ordens.filter((o) => o.estagio === coluna.id);

            return (
              <div
                key={coluna.id}
                className={`flex flex-col w-80 rounded-xl border-t-4 ${coluna.cor} bg-white shadow-sm h-full`}
              >
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-700">{coluna.label}</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">
                    {ordensColuna.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-gray-50/30">
                  {ordensColuna.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-10 italic">Vazio</div>
                  )}

                  {ordensColuna.map((ordem: OrdemKanban) => {
                    const tempoEmHoras =
                      (Date.now() - new Date(ordem.updated_at).getTime()) / (1000 * 60 * 60);
                    const isAlerta = ordem.estagio === 'descanso' && tempoEmHoras > 24;

                    return (
                      <div
                        key={ordem.id}
                        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 rounded w-fit">
                              #{ordem.numero_op}
                            </span>
                            <div
                              className={`flex items-center gap-1 text-[10px] font-bold ${isAlerta ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}
                            >
                              <Clock size={10} />
                              <span>
                                {isAlerta ? 'ATENÇÃO: ' : 'Há '}
                                {calcularTempoNoEstagio(ordem.updated_at)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-blue-600">
                            {ordem.quantidade_prevista} un
                          </span>
                        </div>

                        {ordem.supervisor && (
                          <div className="flex items-center gap-1.5 mt-2 border-t pt-2 border-gray-100">
                            <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                              {ordem.supervisor.avatar_url ? (
                                <img
                                  src={ordem.supervisor.avatar_url}
                                  className="h-full w-full object-cover"
                                  alt={ordem.supervisor.nome ?? 'Supervisor'}
                                />
                              ) : (
                                <User size={10} className="text-blue-600" />
                              )}
                            </div>
                            <span className="text-[9px] font-medium text-gray-400 uppercase tracking-tight">
                              Resp: {String(ordem.supervisor.nome ?? '').split(' ')[0]}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-800">{ordem.produto_nome}</h4>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold"
                            title={
                              ordem.produto_tipo === 'semi_acabado'
                                ? 'Semi-acabado (ingrediente interno)'
                                : ordem.produto_tipo === 'acabado'
                                  ? 'Produto acabado'
                                  : 'Tipo desconhecido'
                            }
                          >
                            {ordem.produto_tipo === 'semi_acabado'
                              ? 'Semi'
                              : ordem.produto_tipo === 'acabado'
                                ? 'Acabado'
                                : '—'}
                          </span>
                          {ordem.produto_tipo === 'acabado' && (
                            <div
                              className={`text-[10px] ml-2 px-2 py-0.5 rounded-full font-semibold ${ordem.baseDisponivel ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
                              title={
                                ordem.baseDisponivel
                                  ? 'Bases disponíveis na geladeira'
                                  : 'Faltam bases (semi-acabados)'
                              }
                            >
                              {ordem.baseDisponivel ? 'Base OK' : 'Aguardando Base'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-3 bg-orange-50 p-2 rounded border border-orange-100 text-orange-800 text-xs font-medium">
                          <ChefHat size={14} />
                          <span>{ordem.qtd_receitas} Panelas</span>
                          <span className="text-orange-400">|</span>
                          <span>{ordem.massa_total?.toFixed(1)} kg massa</span>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1 mb-4">
                          {ordem.distribuicao.map((d, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {d.local}</span>
                              <span className="font-medium">{d.qtd}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 space-y-2">
                          {coluna.id === 'concluido' ? (
                            <>
                              <button
                                onClick={() => handleExpedir(ordem)}
                                className="w-full py-2 rounded flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all"
                              >
                                <Package size={16} /> Finalizar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => void moverOrdem(ordem.id, ordem.estagio)}
                              disabled={movendo === ordem.id}
                              className={`w-full py-2 rounded flex items-center justify-center gap-2 text-sm font-bold text-white transition-all ${coluna.id === 'planejamento' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-800'} ${movendo === ordem.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {coluna.id === 'planejamento' ? (
                                <>
                                  <span>Iniciar Produção</span> <ChefHat size={16} />
                                </>
                              ) : (
                                <>
                                  <span>Próxima Etapa</span> <ArrowRight size={16} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Finalização */}
      {ordemParaExpedir && (
        <ModalExpedicao
          ordem={ordemParaExpedir}
          onClose={() => setOrdemParaExpedir(null)}
          onConfirmar={confirmarExpedicao}
        />
      )}
    </div>
  );
}

// --- COMPONENTE DE MODAL DE EXPEDIÇÃO ---
function ModalExpedicao({
  ordem,
  onClose,
  onConfirmar,
}: {
  ordem: OrdemKanban;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:h-screen print:z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Cabeçalho */}
        <div className="bg-green-600 p-4 text-white print:bg-white print:text-black print:border-b print:p-0 print:mb-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="print:hidden" /> Finalizar Produção
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-green-700 rounded-full p-1 print:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1 print:text-gray-600">OP #{ordem.numero_op}</p>
        </div>

        {/* Conteúdo da Etiqueta */}
        <div className="p-6 space-y-6 print:p-0">
          <div className="text-center border-b pb-4 print:border-b-2 print:border-black">
            <h2 className="text-2xl font-bold text-gray-800 print:text-black print:text-3xl">
              {ordem.produto_nome}
            </h2>
            <p className="text-gray-500 print:text-black font-medium mt-2">
              Total: {ordem.quantidade_prevista} unidades
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wider print:text-black">
              Distribuição / Destinos:
            </p>
            {ordem.distribuicao.map((dest, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-gray-50 p-3 rounded border print:border-2 print:border-black print:bg-transparent print:mb-2"
              >
                <span className="font-bold text-lg text-gray-800 print:text-black">
                  {dest.local}
                </span>
                <span className="text-xl font-bold text-black">{dest.qtd} un</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 print:hidden">
            ⚠️ Confira as quantidades antes de confirmar a finalização.
          </div>
        </div>

        {/* Rodapé com Ações (Escondido na impressão) */}
        <div className="bg-gray-50 p-4 flex gap-3 justify-end print:hidden border-t">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-100 flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={18} /> Confirmar Finalização
          </button>
        </div>
      </div>
    </div>
  );
}
