'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  GitMerge,
  Layers,
  ListOrdered,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  TrendingUp,
  Truck,
  Trash2,
  Unlock,
  X,
  LayoutGrid,
  AlignJustify,
  Download,
  FileText,
  Printer,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { supabase } from '@/lib/supabase-client';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import confetti from 'canvas-confetti';
import ReciboEModaDetalhamentoModal, { ReciboRegistroData } from './ReciboEModaDetalhamentoModal';
import {
  apurarFechamentoUnificado,
  calcularItemIndividual,
  calcularTaxaPercentualEquivalente,
  classificarResultadoCaixa,
  ItemMovimentacaoPDV,
  TurnoFechamentoInput,
} from '@/lib/services/fechamento-pdv-calc';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalPDV {
  id: string;
  nome: string;
  tipo?: string;
  logo_url?: string;
}

interface ProdutoItem {
  id: string;
  nome: string;
  preco: number;
}

interface ItemGradeKanban {
  produto_id: string;
  nome: string;
  preco_unitario: number;
  qtd_sobra_anterior?: number;
  qtd_enviada: number;
  qtd_retorno: number | null;
  qtd_transferencia_recebida?: number;
  qtd_transferencia_enviada?: number;
  qtd_devolucao_fabrica?: number;
  qtd_perda?: number;
}

interface RemessaKanban {
  id: string;
  organization_id: string;
  local_id: string;
  data: string;
  turno: string;
  vendedor_nome: string | null;
  modo_lancamento: string;
  tipo_fechamento?: string;
  fechamento_unificado_id?: string | null;
  legado_inconsistente?: boolean;
  qtd_total_enviada: number;
  qtd_total_retorno: number;
  preco_medio_rapido: number;
  itens_grade: ItemGradeKanban[];
  ajustes_perdas: any[];
  total_descontos_perdas: number;
  valor_dinheiro_gaveta: number;
  faturamento_bruto_teorico: number;
  faturamento_liquido_esperado: number;
  pix_cartao_esperado: number;
  valor_pix_declarado: number;
  valor_cartao_declarado: number;
  taxa_cartao_reais?: number;
  diferenca_auditoria: number;
  observacoes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  locais?: { nome: string; logo_url?: string };
}

export interface PDVKanbanViewProps {
  locais: LocalPDV[];
  produtosBase: ProdutoItem[];
  profile: any;
  dataAcerto: string;
  onDataChange: (data: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTurno(turno: string): string {
  switch (turno) {
    case 'manha':
      return 'Manhã';
    case 'tarde':
      return 'Tarde';
    case 'noite':
      return 'Noite';
    case 'integral':
      return 'Integral';
    default:
      return turno || 'Integral';
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function calcTaxaSobra(enviado: number, retorno: number): number {
  if (enviado <= 0) return 0;
  return (retorno / enviado) * 100;
}

// ─── Column Header ───────────────────────────────────────────────────────────

function KanbanColumnHeader({
  title,
  subtitle,
  icon: Icon,
  count,
  colorClass,
  bgClass,
  borderClass,
}: {
  title: string;
  subtitle: string;
  icon: any;
  count: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}) {
  return (
    <div className={`rounded-t-2xl border-b-2 ${borderClass} ${bgClass} px-4 py-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text/80">
              {title}
            </h3>
            <p className="text-[10px] text-text/50 font-medium">{subtitle}</p>
          </div>
        </div>
        <span
          className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-black ${colorClass}`}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({
  registro,
  locais,
  actionLabel,
  actionIcon: ActionIcon,
  actionColor,
  onAction,
  onViewRomaneio,
  onDelete,
  onRevert,
  showFinancials,
  showTaxaSobra,
}: {
  registro: RemessaKanban;
  locais: LocalPDV[];
  actionLabel?: string;
  actionIcon?: any;
  actionColor?: string;
  onAction?: () => void;
  onViewRomaneio?: () => void;
  onDelete?: () => void;
  onRevert?: () => void;
  showFinancials?: boolean;
  showTaxaSobra?: boolean;
}) {
  const pdv = locais.find((l) => l.id === registro.local_id);
  const pdvNome = registro.locais?.nome || pdv?.nome || 'PDV';
  const logoUrl = registro.locais?.logo_url || pdv?.logo_url;
  const [imgError, setImgError] = useState(false);
  const hasLogo = Boolean(logoUrl) && !imgError;

  const enviado = Number(registro.qtd_total_enviada) || 0;
  const isAberto = registro.status === 'aberto';
  const temSobraRegistrada =
    registro.status !== 'aberto' &&
    registro.qtd_total_retorno !== null &&
    registro.qtd_total_retorno !== undefined;
  const retorno = temSobraRegistrada ? Number(registro.qtd_total_retorno) : 0;
  const vendido = temSobraRegistrada ? Math.max(0, enviado - retorno) : 0;
  const dinheiro = Number(registro.valor_dinheiro_gaveta) || 0;
  const pix = Number(registro.valor_pix_declarado) || 0;
  const cartao = Number(registro.valor_cartao_declarado) || 0;
  const faturamento = isAberto
    ? 0
    : Number(registro.faturamento_liquido_esperado) ||
    Number(registro.faturamento_bruto_teorico) ||
    dinheiro + pix + cartao;
  const taxaSobra = isAberto ? 0 : calcTaxaSobra(enviado, retorno);
  const caixaBatido = Math.abs(faturamento - (dinheiro + pix + cartao)) < 1;

  return (
    <div className="group rounded-2xl border border-primary/15 bg-background shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-2.5 p-3 border-b border-primary/10">
        {hasLogo ? (
          <img
            src={logoUrl}
            alt={pdvNome}
            onError={() => setImgError(true)}
            className="h-8 w-8 rounded-full object-cover border border-primary/20 shadow-xs shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <Store className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text/90 truncate">{pdvNome}</p>
          <div className="flex items-center gap-2 text-[10px] text-text/50 font-medium">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatTurno(registro.turno)}
            </span>
            <span className="text-text/30">•</span>
            <span>{formatTime(registro.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 space-y-2.5">
        {/* Grid de métricas */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-text/40 block">
              Enviado
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
              {enviado}
            </span>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Sobra
            </span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">
              {isAberto ? '-' : retorno}
            </span>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Vendido
            </span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {isAberto ? '-' : vendido}
            </span>
          </div>
        </div>

        {/* Financeiros */}
        {showFinancials && (
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <Banknote className="h-3 w-3 text-emerald-400" /> Dinheiro
              </span>
              <span className="font-mono font-bold text-emerald-400">R$ {dinheiro.toFixed(2)}</span>
            </div>
            {pix > 0 && (
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-purple-400" /> Pix
                </span>
                <span className="font-mono font-bold text-purple-400">R$ {pix.toFixed(2)}</span>
              </div>
            )}
            {cartao > 0 && (
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-cyan-400" /> Cartão
                </span>
                <span className="font-mono font-bold text-cyan-400">R$ {cartao.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-700 pt-1.5 text-white">
              <span className="font-bold">Faturamento</span>
              <span className="font-mono font-black text-primary">R$ {faturamento.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Badge de caixa batido + taxa de sobra */}
        {showTaxaSobra && (
          <div className="flex items-center justify-between gap-2 text-[10px]">
            {caixaBatido ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-bold border border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Caixa batido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-bold border border-amber-300 dark:border-amber-700">
                <AlertTriangle className="h-3 w-3" /> Diferença
              </span>
            )}
            <span
              className={`font-mono font-bold ${taxaSobra > 30
                  ? 'text-rose-600 dark:text-rose-400'
                  : taxaSobra > 15
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
            >
              {taxaSobra.toFixed(1)}% sobra
            </span>
          </div>
        )}

        {/* Vendedor */}
        {registro.vendedor_nome && (
          <div className="flex items-center gap-1.5 text-[10px] text-text/40 font-medium pt-1 border-t border-primary/5">
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">Atend: {registro.vendedor_nome}</span>
          </div>
        )}
      </div>

      {/* Card Footer / Action */}
      {(actionLabel || onViewRomaneio || onRevert || onDelete) && (
        <div className="px-3 pb-3 flex gap-2">
          {onViewRomaneio && (
            <button
              type="button"
              onClick={onViewRomaneio}
              className="flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 py-2 px-3 transition-all active:scale-[0.97]"
              title="Ver Romaneio"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
          )}
          {onRevert && (
            <button
              type="button"
              onClick={onRevert}
              className="flex items-center justify-center rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300 py-2 px-3 transition-all active:scale-[0.97]"
              title="Voltar etapa"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-300 py-2 px-3 transition-all active:scale-[0.97]"
              title="Excluir carga"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all active:scale-[0.97] ${actionColor || 'bg-primary text-white hover:opacity-90'
                }`}
            >
              {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modais Operacionais ─────────────────────────────────────────────────────

function RegistrarSobrasModal({
  registro,
  locais,
  produtosBase,
  onClose,
  onSave,
}: {
  registro: RemessaKanban;
  locais: LocalPDV[];
  produtosBase: ProdutoItem[];
  onClose: () => void;
  onSave: (updated: RemessaKanban) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const pdvNome =
    registro.locais?.nome || locais.find((l) => l.id === registro.local_id)?.nome || 'PDV';
  const [salvando, setSalvando] = useState(false);
  const [valorDinheiro, setValorDinheiro] = useState(Number(registro.valor_dinheiro_gaveta) || 0);
  const [valorPix, setValorPix] = useState(Number(registro.valor_pix_declarado) || 0);
  const [valorCartao, setValorCartao] = useState(Number(registro.valor_cartao_declarado) || 0);

  const [gradeItens, setGradeItens] = useState<ItemGradeKanban[]>(() => {
    if (Array.isArray(registro.itens_grade) && registro.itens_grade.length > 0) {
      return registro.itens_grade.map((it) => ({
        ...it,
        qtd_retorno:
          it.qtd_retorno !== undefined && it.qtd_retorno !== null ? Number(it.qtd_retorno) : null,
      }));
    }
    return produtosBase.map((p) => ({
      produto_id: p.id,
      nome: p.nome,
      preco_unitario: p.preco,
      qtd_sobra_anterior: 0,
      qtd_enviada: 0,
      qtd_retorno: null,
    }));
  });

  const itensCalculados = gradeItens.map((it) =>
    calcularItemIndividual({
      produto_id: it.produto_id,
      nome: it.nome,
      preco_unitario: it.preco_unitario,
      qtd_estoque_inicial: it.qtd_sobra_anterior,
      qtd_enviada: it.qtd_enviada,
      qtd_transferencia_recebida: it.qtd_transferencia_recebida,
      qtd_transferencia_enviada: it.qtd_transferencia_enviada,
      qtd_devolucao_fabrica: it.qtd_devolucao_fabrica,
      qtd_perda: it.qtd_perda,
      qtd_retorno: it.qtd_retorno,
    })
  );

  const temPendenciaSobras = itensCalculados.some(
    (it) => it.tem_pendencia_sobra && (it.qtd_disponivel || 0) > 0
  );
  const totalRetorno = gradeItens.reduce(
    (acc, it) =>
      acc + (it.qtd_retorno !== null && it.qtd_retorno !== undefined ? Number(it.qtd_retorno) : 0),
    0
  );
  const totalEnviado = gradeItens.reduce(
    (acc, it) => acc + (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0),
    0
  );
  const totalVendido = itensCalculados.reduce((acc, it) => acc + it.qtd_vendida, 0);
  const faturamentoBruto = itensCalculados.reduce((acc, it) => acc + it.faturamento_bruto, 0);
  const pixCartaoEsperado = Math.max(0, faturamentoBruto - valorDinheiro);

  const handleSalvar = async () => {
    if (temPendenciaSobras) {
      toast({
        title: 'Sobras Pendentes',
        description:
          'Existem produtos sem conferência de sobra física. Preencha todos ou clique em "Vendeu Tudo".',
        variant: 'warning',
      });
      return;
    }

    const totalEnviadoNum = gradeItens.reduce(
      (acc, it) => acc + (Number(it.qtd_enviada) || 0),
      0
    );

    const confirmou = await confirmDialog.confirm({
      title: `Registrar Sobras — ${pdvNome}`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDV</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block">{pdvNome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Turno</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatTurno(registro.turno)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Atendente</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{registro.vendedor_nome || 'Não informado'}</span>
            </div>
          </div>

          {/* Cards de Métricas de Estoque */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Enviado</span>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{totalEnviadoNum} un</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold block">Sobras em Loja</span>
              <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400">{totalRetorno} un</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">Vendidos</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{Math.max(0, totalEnviadoNum - totalRetorno)} un</span>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro Físico na Gaveta:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">R$ {valorDinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> Pix / Cartão Esperado:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {pixCartaoEsperado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 text-white font-extrabold">
              <span>Faturamento Teórico Bruto:</span>
              <span className="font-mono text-primary text-sm">R$ {faturamentoBruto.toFixed(2)}</span>
            </div>
          </div>

          {/* Mini-lista dos produtos e sobras */}
          {gradeItens.filter((it) => (Number(it.qtd_enviada) || 0) > 0 || (Number(it.qtd_retorno) || 0) > 0).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Conferência das Sobras por Produto:
              </p>
              <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                {gradeItens
                  .filter((it) => (Number(it.qtd_enviada) || 0) > 0 || (Number(it.qtd_retorno) || 0) > 0)
                  .map((it, idx) => {
                    const env = Number(it.qtd_enviada) || 0;
                    const sob = it.qtd_retorno !== null && it.qtd_retorno !== undefined ? Number(it.qtd_retorno) : 0;
                    const vend = Math.max(0, env - sob);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{it.nome}</span>
                        <div className="flex items-center gap-2 text-[11px] shrink-0 font-mono">
                          <span className="text-slate-400">Env: {env}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">Sobra: {sob}</span>
                          <span className="text-primary font-bold">Vend: {vend}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ),
      confirmText: 'Confirmar Sobras + Dinheiro',
      cancelText: 'Revisar',
      variant: 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {

      const payload = {
        qtd_total_retorno: totalRetorno,
        qtd_total_enviada: totalEnviadoNum,
        itens_grade: gradeItens,
        valor_dinheiro_gaveta: valorDinheiro,
        faturamento_bruto_teorico: faturamentoBruto,
        faturamento_liquido_esperado: faturamentoBruto,
        pix_cartao_esperado: pixCartaoEsperado,
        valor_pix_declarado: valorPix,
        valor_cartao_declarado: valorCartao,
        status: 'dinheiro_informado',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update(payload)
        .eq('id', registro.id);

      if (error) throw error;

      toast({
        title: 'Sobras + Dinheiro Registrados!',
        description: `${totalRetorno} itens de sobra e R$ ${valorDinheiro.toFixed(2)} salvos para ${pdvNome}.`,
        variant: 'success',
      });

      onSave({
        ...registro,
        ...payload,
        itens_grade: gradeItens,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  const handleZerarSobras = () => {
    setGradeItens((prev) => prev.map((it) => ({ ...it, qtd_retorno: 0 })));
    toast({
      title: 'Vendeu tudo!',
      description: 'Todas as sobras zeradas (100% vendido).',
      variant: 'info',
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/20 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Package className="h-4 w-4" /> Registrar Sobras — {pdvNome}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-text/60 bg-primary/5 rounded-xl p-3 border border-primary/10">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong className="text-text/80">
                {registro.data?.split('-').reverse().join('/')}
              </strong>{' '}
              — {formatTurno(registro.turno)}
              {registro.vendedor_nome && <> • Atend: {registro.vendedor_nome}</>}
            </span>
          </div>

          <button
            type="button"
            onClick={handleZerarSobras}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" /> Vendeu Tudo (Sobra Zero)
          </button>

          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {gradeItens
              .filter(
                (it) => (Number(it.qtd_enviada) || 0) + (Number(it.qtd_sobra_anterior) || 0) > 0
              )
              .map((item) => {
                const disponivel =
                  (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
                return (
                  <div
                    key={item.produto_id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text/80 truncate">{item.nome}</p>
                      <p className="text-[10px] text-text/40">
                        Disponível: <span className="font-mono font-bold">{disponivel}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                        Sobra:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={disponivel}
                        placeholder="Pend."
                        value={
                          item.qtd_retorno === null || item.qtd_retorno === undefined
                            ? ''
                            : item.qtd_retorno
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val =
                            raw === '' ? 0 : Math.max(0, Math.min(disponivel, Number(raw)));
                          setGradeItens((prev) =>
                            prev.map((it) =>
                              it.produto_id === item.produto_id ? { ...it, qtd_retorno: val } : it
                            )
                          );
                        }}
                        className={`w-18 rounded-lg border px-2 py-1 text-center text-sm font-mono font-bold outline-none focus:ring-2 ${item.qtd_retorno === null || item.qtd_retorno === undefined
                            ? 'border-amber-400 bg-amber-100/50 text-amber-900 placeholder:text-amber-500 focus:ring-amber-400'
                            : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 focus:ring-emerald-400'
                          }`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2">
              <span className="text-[9px] font-bold uppercase text-text/40 block">Disponível</span>
              <span className="font-mono font-black text-text/80 text-sm">{totalEnviado}</span>
            </div>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2">
              <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                Sobra
              </span>
              <span className="font-mono font-black text-amber-700 dark:text-amber-300 text-sm">
                {totalRetorno}
              </span>
            </div>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2">
              <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                Vendido
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                {totalVendido}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                <Banknote className="h-4 w-4" /> Valor em Dinheiro Opcional (R$)
              </label>
              <BRLCurrencyInput
                value={valorDinheiro}
                onChange={(val) => setValorDinheiro(val)}
                className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 font-mono text-base font-bold text-emerald-800 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1.5">
                  <Smartphone className="h-4 w-4" /> Pix Opcional (R$)
                </label>
                <BRLCurrencyInput
                  value={valorPix}
                  onChange={(val) => setValorPix(val)}
                  className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 font-mono text-sm font-bold text-purple-800 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 mb-1.5">
                  <CreditCard className="h-4 w-4" /> Cartão Opcional (R$)
                </label>
                <BRLCurrencyInput
                  value={valorCartao}
                  onChange={(val) => setValorCartao(val)}
                  className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Faturamento Bruto Teórico:</span>
              <span className="font-mono font-bold text-white">
                R$ {faturamentoBruto.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1">
              <span>Pix/Cartão Esperado:</span>
              <span className="font-mono font-bold text-cyan-300">
                R$ {pixCartaoEsperado.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.97]"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Banknote className="h-3.5 w-3.5" /> Salvar Sobras + Dinheiro
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

function LancarPixCartaoModal({
  registro,
  locais,
  onClose,
  onSave,
}: {
  registro: RemessaKanban;
  locais: LocalPDV[];
  onClose: () => void;
  onSave: (updated: RemessaKanban) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const pdvNome =
    registro.locais?.nome || locais.find((l) => l.id === registro.local_id)?.nome || 'PDV';
  const [salvando, setSalvando] = useState(false);
  const [valorPix, setValorPix] = useState(Number(registro.valor_pix_declarado) || 0);
  const [valorCartao, setValorCartao] = useState(Number(registro.valor_cartao_declarado) || 0);
  const [taxaCartaoReais, setTaxaCartaoReais] = useState(Number(registro.taxa_cartao_reais) || 0);
  const dinheiroInicial = Number(registro.valor_dinheiro_gaveta) || 0;
  const [valorDinheiro, setValorDinheiro] = useState(dinheiroInicial);
  const precisaInformarDinheiro = dinheiroInicial === 0;
  const [justificativa, setJustificativa] = useState('');

  const taxaCartaoPercentual = valorCartao > 0 ? (taxaCartaoReais / valorCartao) * 100 : 0;
  const cartaoLiquido = Math.max(0, valorCartao - taxaCartaoReais);

  const faturamento =
    Number(registro.faturamento_liquido_esperado) ||
    Number(registro.faturamento_bruto_teorico) ||
    0;
  const pixCartaoEsperado = Math.max(0, faturamento - valorDinheiro);
  const totalDigital = valorPix + valorCartao;
  const diferencaDigital = totalDigital - pixCartaoEsperado;
  const totalRecebido = valorDinheiro + totalDigital;
  const diferencaCaixa = totalRecebido - faturamento;
  const caixaBatido = Math.abs(diferencaCaixa) < 0.05;

  const handleSalvar = async () => {
    const confirmou = await confirmDialog.confirm({
      title: `Encerrar Turno — ${pdvNome}`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDV</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block">{pdvNome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Turno</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatTurno(registro.turno)} ({registro.data || 'Hoje'})</span>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro Gaveta:</span>
              <span className="font-mono font-bold text-emerald-400">R$ {valorDinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-purple-400" /> Pix Declarado:</span>
              <span className="font-mono font-bold text-purple-300">R$ {valorPix.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> Cartão Bruto:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {valorCartao.toFixed(2)}</span>
            </div>
            {taxaCartaoReais > 0 && (
              <div className="flex justify-between items-center text-amber-300 border-t border-slate-800 pt-1">
                <span>Taxa Cartão ({taxaCartaoPercentual.toFixed(2)}%):</span>
                <span className="font-mono font-bold">-R$ {taxaCartaoReais.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-700 pt-1.5 text-white font-extrabold">
              <span>Total Apurado:</span>
              <span className="font-mono text-primary text-sm">R$ {totalRecebido.toFixed(2)}</span>
            </div>
          </div>

          {/* Conciliação de Caixa */}
          <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${caixaBatido
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : diferencaCaixa < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
            <span>{caixaBatido ? '✓ Caixa 100% Batido' : diferencaCaixa < 0 ? '⚠ Quebra de Caixa / Falta' : '⚠ Sobra no Caixa'}</span>
            <span className="font-mono font-bold">
              {diferencaCaixa === 0 ? 'R$ 0,00' : `${diferencaCaixa > 0 ? '+' : ''}R$ ${diferencaCaixa.toFixed(2)}`}
            </span>
          </div>

          {justificativa.trim() && (
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">Justificativa:</span>
              "{justificativa.trim()}"
            </div>
          )}
        </div>
      ),
      confirmText: 'Confirmar e Encerrar',
      cancelText: 'Revisar',
      variant: !caixaBatido && diferencaCaixa < 0 ? 'danger' : 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      const payload: any = {
        valor_dinheiro_gaveta: valorDinheiro,
        valor_pix_declarado: valorPix,
        valor_cartao_declarado: valorCartao,
        pix_cartao_esperado: pixCartaoEsperado,
        diferenca_auditoria: diferencaCaixa,
        observacoes: justificativa
          ? registro.observacoes
            ? `${registro.observacoes}\nCaixa: ${justificativa}`
            : `Caixa: ${justificativa}`
          : registro.observacoes,
        status: 'encerrado',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update(payload)
        .eq('id', registro.id);

      if (error) throw error;

      toast({
        title: 'Turno Encerrado!',
        description: `Pix/Cartão lançados e turno encerrado para ${pdvNome}.`,
        variant: 'success',
      });

      onSave({ ...registro, ...payload } as RemessaKanban);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-cyan-200 dark:border-cyan-800/60 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-800/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
              {precisaInformarDinheiro ? (
                <Banknote className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {precisaInformarDinheiro ? 'Lançar Dinheiro / Pix / Cartão' : 'Lançar Pix / Cartão'} —{' '}
              {pdvNome}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Faturamento Esperado:</span>
              <span className="font-mono font-bold text-white">R$ {faturamento.toFixed(2)}</span>
            </div>
            {!precisaInformarDinheiro && (
              <div className="flex justify-between text-slate-300">
                <span>Dinheiro na Gaveta:</span>
                <span className="font-mono font-bold text-emerald-400">
                  R$ {valorDinheiro.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1.5">
              <span>Pix/Cartão Esperado:</span>
              <span className="font-mono font-bold text-cyan-300">
                R$ {pixCartaoEsperado.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {precisaInformarDinheiro && (
              <div>
                <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <Banknote className="h-4 w-4" /> Dinheiro na Gaveta (R$)
                </label>
                <BRLCurrencyInput
                  value={valorDinheiro}
                  onChange={(val) => setValorDinheiro(val)}
                  className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 font-mono text-lg font-bold text-emerald-800 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1.5">
                <Smartphone className="h-4 w-4" /> Pix Declarado (R$)
              </label>
              <BRLCurrencyInput
                value={valorPix}
                onChange={(val) => setValorPix(val)}
                className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 px-4 py-2.5 font-mono text-lg font-bold text-purple-800 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 mb-1.5">
                <CreditCard className="h-4 w-4" /> Cartão Bruto (R$)
              </label>
              <BRLCurrencyInput
                value={valorCartao}
                onChange={(val) => setValorCartao(val)}
                className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-4 py-2.5 font-mono text-lg font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Taxa/Maquininha (R$)
                </span>
                {valorCartao > 0 && (
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-extrabold">
                    {taxaCartaoPercentual.toFixed(2)}%
                  </span>
                )}
              </label>
              <BRLCurrencyInput
                value={taxaCartaoReais}
                onChange={(val) => setTaxaCartaoReais(val)}
                placeholder="R$ 0,00"
                className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 font-mono text-lg font-bold text-amber-900 dark:text-amber-100 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Digital Declarado (Pix + Cartão):</span>
              <span className="font-mono font-bold text-cyan-200">
                R$ {totalDigital.toFixed(2)}
              </span>
            </div>
            {taxaCartaoReais > 0 && (
              <div className="flex justify-between text-amber-300 font-bold border-t border-slate-800 pt-1">
                <span>Taxa Cartão Aplicada:</span>
                <span className="font-mono">
                  -R$ {taxaCartaoReais.toFixed(2)} ({taxaCartaoPercentual.toFixed(2)}%)
                </span>
              </div>
            )}
            <div className="flex justify-between text-emerald-300 font-extrabold border-t border-slate-800 pt-1">
              <span>Líquido Estimado (Gaveta + Pix + Cartão Líq.):</span>
              <span className="font-mono">
                R$ {(valorDinheiro + valorPix + cartaoLiquido).toFixed(2)}
              </span>
            </div>
            <div
              className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${diferencaDigital < -0.05
                  ? 'text-rose-400'
                  : diferencaDigital > 0.05
                    ? 'text-emerald-400'
                    : 'text-cyan-300'
                }`}
            >
              <span>Diferença Digital:</span>
              <span className="font-mono">
                {diferencaDigital > 0 ? '+' : ''}R$ {diferencaDigital.toFixed(2)}
              </span>
            </div>
            {Math.abs(diferencaCaixa) > 0.05 && (
              <div
                className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${diferencaCaixa < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
              >
                <span>{diferencaCaixa < 0 ? 'Furo de Caixa:' : 'Sobra no Caixa:'}</span>
                <span className="font-mono">R$ {Math.abs(diferencaCaixa).toFixed(2)}</span>
              </div>
            )}
          </div>

          {Math.abs(diferencaCaixa) > 0.05 && (
            <div className="space-y-1 mt-2">
              <label className="text-xs font-bold text-rose-500 mb-1 block">
                Justificativa da Diferença *
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="Por que houve diferença de valores no fechamento?"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-cyan-200 dark:border-cyan-800/40">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 py-2.5 text-xs font-bold text-text/70 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={
                salvando || (Math.abs(diferencaCaixa) > 0.05 && justificativa.trim() === '')
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Encerrar Turno
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

function NovoEnvioModal({
  locais,
  produtosBase,
  profile,
  dataAcerto,
  turnoInicial,
  localInicialId,
  sobrasAnteriores,
  onClose,
  onSave,
}: {
  locais: LocalPDV[];
  produtosBase: ProdutoItem[];
  profile: any;
  dataAcerto: string;
  turnoInicial: 'manha' | 'tarde' | 'noite' | 'integral';
  localInicialId?: string;
  sobrasAnteriores: ItemGradeKanban[] | null;
  onClose: () => void;
  onSave: (created: RemessaKanban) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const [salvando, setSalvando] = useState(false);
  const [localId, setLocalId] = useState(localInicialId || locais[0]?.id || '');
  const [turno, setTurno] = useState<string>(turnoInicial);
  const [vendedorNome, setVendedorNome] = useState('');

  const [gradeItens, setGradeItens] = useState<ItemGradeKanban[]>(() =>
    produtosBase.map((p) => ({
      produto_id: p.id,
      nome: p.nome,
      preco_unitario: p.preco,
      qtd_sobra_anterior: 0,
      qtd_enviada: 0,
      qtd_retorno: 0,
    }))
  );

  const totalEnviado = gradeItens.reduce((acc, it) => acc + (Number(it.qtd_enviada) || 0), 0);

  const handleSalvar = async () => {
    if (!localId) {
      toast({ title: 'Atenção', description: 'Selecione o PDV.', variant: 'warning' });
      return;
    }
    if (totalEnviado <= 0) {
      toast({ title: 'Atenção', description: 'Informe ao menos 1 produto.', variant: 'warning' });
      return;
    }

    const pdvNome = locais.find((l) => l.id === localId)?.nome || 'PDV';
    const itensEnviados = gradeItens.filter((it) => (Number(it.qtd_enviada) || 0) > 0);

    const confirmou = await confirmDialog.confirm({
      title: `Confirmar Envio — ${pdvNome}`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDV de Destino</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block">{pdvNome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Data / Turno</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{dataAcerto} ({formatTurno(turno)})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Atendente</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{vendedorNome.trim() || 'Não informado'}</span>
            </div>
          </div>

          {/* Destaque de Quantidade */}
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Total de Produtos a Enviar:
            </span>
            <span className="font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-indigo-900/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-700">
              {totalEnviado} un
            </span>
          </div>

          {/* Romaneio dos Produtos */}
          {itensEnviados.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Romaneio Detalhado da Carga ({itensEnviados.length} itens):
              </p>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                {itensEnviados.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{it.nome}</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                      {it.qtd_enviada} un
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      confirmText: 'Confirmar e Enviar Carga',
      cancelText: 'Revisar Quantidades',
      variant: 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      const gradeItensSalvar = gradeItens.map((it) => ({
        produto_id: it.produto_id,
        nome: it.nome,
        preco_unitario: it.preco_unitario,
        qtd_sobra_anterior: it.qtd_sobra_anterior || 0,
        qtd_enviada: Number(it.qtd_enviada) || 0,
        qtd_enviada_anterior: Number(it.qtd_enviada) || 0,
        qtd_enviada_nova: 0,
        qtd_retorno: 0,
      }));

      const { data: existentes } = await supabase
        .from('remessas_cargas_pdv')
        .select('id, status, itens_grade, qtd_total_enviada')
        .eq('local_id', localId)
        .eq('data', dataAcerto)
        .eq('turno', turno)
        .order('created_at', { ascending: true });

      const existente = existentes && existentes.length > 0 ? existentes[0] : null;

      let gradeFinal = gradeItensSalvar;
      let totalFinal = totalEnviado;

      if (existente) {
        const itensExistentes = (existente.itens_grade as any[]) || [];
        gradeFinal = gradeItensSalvar.map((novoItem) => {
          const existenteItem = itensExistentes.find((e) => e.produto_id === novoItem.produto_id);
          const enviadaAnterior = Number(existenteItem?.qtd_enviada || 0);
          const finalEnviada = enviadaAnterior + novoItem.qtd_enviada;
          return {
            ...novoItem,
            qtd_enviada: finalEnviada,
            qtd_enviada_anterior: finalEnviada,
            qtd_sobra_anterior: Number(
              existenteItem?.qtd_sobra_anterior || novoItem.qtd_sobra_anterior || 0
            ),
            qtd_retorno: Number(existenteItem?.qtd_retorno || 0),
          };
        });
        totalFinal = Number(existente.qtd_total_enviada || 0) + totalEnviado;
      }

      const payload: any = {
        organization_id: profile?.organization_id,
        local_id: localId,
        data: dataAcerto,
        turno,
        vendedor_nome: vendedorNome.trim() || null,
        modo_lancamento: 'detalhado',
        qtd_total_enviada: totalFinal,
        itens_grade: gradeFinal,
        status: existente
          ? existente.status === 'aberto'
            ? 'aberto'
            : existente.status
          : 'aberto',
      };

      if (!existente) {
        payload.qtd_total_retorno = 0;
        payload.ajustes_perdas = [];
        payload.total_descontos_perdas = 0;
        payload.valor_dinheiro_gaveta = 0;
        payload.faturamento_bruto_teorico = 0;
        payload.faturamento_liquido_esperado = 0;
        payload.pix_cartao_esperado = 0;
        payload.valor_pix_declarado = 0;
        payload.valor_cartao_declarado = 0;
        payload.diferenca_auditoria = 0;
      }

      let result: any;
      if (existente) {
        payload.updated_at = new Date().toISOString();
        result = await supabase
          .from('remessas_cargas_pdv')
          .update(payload)
          .eq('id', existente.id)
          .select('*, locais:local_id(nome, logo_url)')
          .single();
      } else {
        result = await supabase
          .from('remessas_cargas_pdv')
          .insert([payload])
          .select('*, locais:local_id(nome, logo_url)')
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: 'Envio Registrado!',
        description: `${totalEnviado} produtos enviados para ${pdvNome}.`,
        variant: 'success',
      });

      onSave(result.data as RemessaKanban);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/20 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
              <Truck className="h-4 w-4" /> Novo Envio de Carga
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text/70">Ponto de Venda</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {locais.map((pdv) => (
                <button
                  key={pdv.id}
                  type="button"
                  onClick={() => setLocalId(pdv.id)}
                  className={`flex flex-col items-center justify-center rounded-xl border overflow-hidden transition-all ${pdv.logo_url ? 'p-0' : 'p-2 gap-1.5'
                    } ${localId === pdv.id
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                      : 'border-primary/15 bg-background text-text/70 hover:border-primary/40'
                    }`}
                >
                  {pdv.logo_url ? (
                    <img
                      src={pdv.logo_url}
                      alt={pdv.nome}
                      className="w-full h-full aspect-square rounded-[10px] object-cover"
                    />
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Store className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center">
                        {pdv.nome}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text/70 block mb-1">Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="integral">Integral</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-text/70 block mb-1">Atendente</label>
              <input
                type="text"
                value={vendedorNome}
                onChange={(e) => setVendedorNome(e.target.value)}
                placeholder="Ex: Maria"
                className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {gradeItens.map((item) => (
              <div
                key={item.produto_id}
                className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text/80 truncate">{item.nome}</p>
                  <p className="text-[10px] text-text/40">
                    R$ {item.preco_unitario.toFixed(2)} / un
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[10px] font-bold text-primary uppercase">Qtd:</label>
                  <input
                    type="number"
                    min={0}
                    value={item.qtd_enviada}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setGradeItens((prev) =>
                        prev.map((it) =>
                          it.produto_id === item.produto_id ? { ...it, qtd_enviada: val } : it
                        )
                      );
                    }}
                    className="w-16 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-center text-sm font-mono font-bold text-primary outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3 text-xs font-bold">
            <span className="text-text/70 uppercase tracking-wider">Total a Enviar:</span>
            <span className="font-mono text-lg font-black text-primary">{totalEnviado} un</span>
          </div>

          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary hover:opacity-90 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.97]"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5" /> Registrar Envio
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

function VerRomaneioModal({ registro, onClose }: { registro: RemessaKanban; onClose: () => void }) {
  const pdvNome = registro.locais?.nome || 'PDV';
  const itens = Array.isArray(registro.itens_grade) ? registro.itens_grade : [];

  const totalDisponivel = itens.reduce((acc: number, item: any) => {
    return acc + (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-background shadow-xl animate-scale-up overflow-hidden">
        <div className="flex items-center justify-between border-b border-primary/10 p-4 shrink-0 bg-background">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Romaneio do PDV
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto bg-background">
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl mb-4">
            <p className="text-sm font-bold text-text/80">{pdvNome}</p>
            <p className="text-xs text-text/50">
              {formatTurno(registro.turno)} •{' '}
              {registro.data ? registro.data.split('-').reverse().join('/') : ''}
            </p>
          </div>

          <div className="space-y-2 pb-2">
            {itens.length > 0 ? (
              itens.map((item: any) => {
                const disp =
                  (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
                if (disp <= 0) return null;
                return (
                  <div
                    key={item.produto_id}
                    className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                  >
                    <span className="text-xs font-bold text-text/80">{item.nome}</span>
                    <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {disp} un
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-text/40">
                Nenhum produto enviado para este PDV neste turno.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-primary/10 bg-background shrink-0">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-bold text-text/70 uppercase">Total na Loja</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
              {totalDisponivel} un
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PDVGroupCard({
  local,
  records,
  actionLabel,
  actionIcon: ActionIcon,
  actionColor,
  onAction,
  onOpenRecibo,
  onRevert,
  onReabrirAuditoria,
  fechamentoUnificado,
}: {
  local: LocalPDV;
  records: RemessaKanban[];
  actionLabel?: string;
  actionIcon?: any;
  actionColor?: string;
  onAction?: () => void;
  onOpenRecibo?: (data: ReciboRegistroData) => void;
  onRevert?: () => void;
  onReabrirAuditoria?: () => void;
  fechamentoUnificado?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const pdvNome = local.nome || 'PDV';
  const logoUrl = local.logo_url;
  const hasLogo = Boolean(logoUrl);

  const isAuditado = records.some((r) => r.status === 'auditado' || r.status === 'conferido');
  const isUnificado =
    records.some((r) => r.fechamento_unificado_id || r.tipo_fechamento === 'unificado') ||
    Boolean(fechamentoUnificado && isAuditado);

  const dinheiro = records.reduce((acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0), 0);
  const pix =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_pix_declarado || 0)
      : records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
  const cartao =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_cartao_debito_declarado || 0) +
      Number(fechamentoUnificado.total_cartao_credito_declarado || 0) +
      Number(fechamentoUnificado.total_outros_declarado || 0)
      : records.reduce((acc, r) => acc + (Number(r.valor_cartao_declarado) || 0), 0);
  const taxaReais =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_taxas_operacionais || 0)
      : records.reduce((acc, r) => acc + (Number(r.taxa_cartao_reais) || 0), 0);

  const faturamento = records.reduce((acc, r) => {
    if (r.itens_grade && Array.isArray(r.itens_grade) && r.itens_grade.length > 0) {
      const somaItens = r.itens_grade.reduce((sum, it) => {
        const env = (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
        const ret = Number(it.qtd_retorno) || 0;
        const vend = Math.max(0, env - ret);
        const preco = Number(it.preco_unitario || 0);
        return sum + vend * preco;
      }, 0);
      if (somaItens > 0) return acc + somaItens;
    }
    return (
      acc + (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0)
    );
  }, 0);

  const dif =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.diferenca_caixa || 0)
      : records.reduce((acc, r) => acc + (Number(r.diferenca_auditoria) || 0), 0);

  const totalRecebido = dinheiro + pix + cartao;
  const totalLiquido = totalRecebido - taxaReais;

  const handleOpenReciboData = () => {
    if (!onOpenRecibo) return;
    const primaryRecord = records[records.length - 1] || records[0];
    const gradeItensConsolidada = primaryRecord?.itens_grade || [];
    const reciboData: ReciboRegistroData = {
      id: primaryRecord?.id || 'recibo',
      data: primaryRecord?.data || '',
      turno: records.map((r) => r.turno).join(' + '),
      vendedor_nome: primaryRecord?.vendedor_nome || undefined,
      pdvNome: pdvNome,
      status: primaryRecord?.status || (isAuditado ? 'auditado' : 'encerrado'),
      tipo_fechamento: isUnificado ? 'unificado' : primaryRecord?.tipo_fechamento,
      valor_dinheiro_gaveta: dinheiro,
      valor_pix_declarado: pix,
      valor_cartao_declarado: cartao,
      taxa_cartao_reais: taxaReais,
      faturamento_bruto_teorico: faturamento,
      faturamento_liquido_esperado: faturamento,
      diferenca_auditoria: dif,
      observacoes: primaryRecord?.observacoes || fechamentoUnificado?.justificativa || undefined,
      itens_grade: gradeItensConsolidada,
    };
    onOpenRecibo(reciboData);
  };

  return (
    <div className="group rounded-2xl border border-primary/15 bg-background shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-2.5 p-3 border-b border-primary/10">
        {hasLogo ? (
          <img
            src={logoUrl}
            alt={pdvNome}
            className="h-8 w-8 rounded-full object-cover border border-primary/20 shadow-xs shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <Store className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-text/90 truncate">{pdvNome}</p>
            {isUnificado && (
              <span className="rounded bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                🟣 Unificado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text/50 font-medium mt-0.5">
            <span className="inline-flex items-center gap-0.5">
              <Layers className="h-3 w-3" />
              {records.length} turno(s)
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Banknote className="h-3 w-3 text-emerald-400" /> Dinheiro Gaveta:
            </span>
            <span className="font-mono font-bold text-emerald-400">R$ {dinheiro.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3 text-purple-400" /> Pix {isUnificado ? '(Unificado)' : 'Decl.'}:
            </span>
            <span className="font-mono font-bold text-purple-400">R$ {pix.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-cyan-400" /> Cartão {isUnificado ? '(Unificado)' : 'Decl.'}:
            </span>
            <span className="font-mono font-bold text-cyan-400">R$ {cartao.toFixed(2)}</span>
          </div>
          {taxaReais > 0 && (
            <div className="flex justify-between text-rose-300 font-bold border-t border-slate-800 pt-1">
              <span>Taxas Operacionais:</span>
              <span className="font-mono">-R$ {taxaReais.toFixed(2)}</span>
            </div>
          )}
          {isAuditado && (
            <div className="flex justify-between text-emerald-300 font-bold border-t border-slate-800 pt-1">
              <span>Líquido em Conta:</span>
              <span className="font-mono">R$ {totalLiquido.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-700 pt-1.5 text-white">
            <span className="font-bold">Faturamento Total:</span>
            <span className="font-mono font-black text-primary">R$ {faturamento.toFixed(2)}</span>
          </div>
        </div>

        {isAuditado && (
          dif !== 0 ? (
            <div
              className={`flex items-center justify-between gap-2 text-[10px] px-2 py-1.5 rounded-lg border ${dif < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                }`}
            >
              <span className="font-bold">{dif < 0 ? 'Furo de Caixa:' : 'Sobra de Caixa:'}</span>
              <span className="font-mono font-black">R$ {dif.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Caixa 100% Conferido
              </span>
              <span className="font-mono">R$ 0,00</span>
            </div>
          )
        )}

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 py-1 text-[10px] font-bold text-primary/70 hover:text-primary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Ver Menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Ver Resumo por Turno
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-2 mt-2 pt-2 border-t border-primary/10">
            {records.map((r, i) => {
              const rFatur =
                Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0;
              const rRec =
                (Number(r.valor_dinheiro_gaveta) || 0) +
                (Number(r.valor_pix_declarado) || 0) +
                (Number(r.valor_cartao_declarado) || 0);
              const rDif = rRec - rFatur;
              return (
                <div
                  key={r.id || i}
                  className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-2 text-[10px] border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1 pb-1 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="capitalize">{formatTurno(r.turno)}</span>
                    <span className="text-primary">Fat: R$ {rFatur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Rec. Total:</span>
                    <span className="font-mono">R$ {rRec.toFixed(2)}</span>
                  </div>
                  {isAuditado && rDif !== 0 && (
                    <div className="flex justify-between text-slate-500 mt-0.5">
                      <span>Dif:</span>
                      <span
                        className={`font-mono font-bold ${rDif < 0 ? 'text-rose-500' : 'text-emerald-500'}`}
                      >
                        R$ {rDif.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        {actionLabel && onAction && !isAuditado && (
          <button
            type="button"
            onClick={onAction}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all active:scale-[0.97] ${actionColor || 'bg-primary text-white hover:opacity-90'
              }`}
          >
            {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
            {actionLabel}
          </button>
        )}

        {onRevert && !isAuditado && (
          <button
            type="button"
            onClick={onRevert}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            ↩ Retornar para Sobras & Caixa
          </button>
        )}

        {isAuditado && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleOpenReciboData}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold shadow-xs transition-all active:scale-[0.97]"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              Ver Fechamento Auditado
            </button>

            {onReabrirAuditoria && (
              <button
                type="button"
                onClick={onReabrirAuditoria}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
              >
                <Unlock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                Reabrir / Editar
              </button>
            )}
          </div>
        )}

        {!isAuditado && (
          <button
            type="button"
            onClick={handleOpenReciboData}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-[0.97]"
          >
            <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
            Ver Detalhes / Recibo
          </button>
        )}
      </div>
    </div>
  );
}

function AuditarPDVModal({
  local,
  records,
  onClose,
  onSave,
}: {
  local: LocalPDV;
  records: RemessaKanban[];
  onClose: () => void;
  onSave: (updated: RemessaKanban[]) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const pdvNome = local.nome;
  const [salvando, setSalvando] = useState(false);

  const isUnificado = records.some(
    (r) => r.tipo_fechamento === 'unificado' || Boolean(r.fechamento_unificado_id)
  );

  const dinheiro = records.reduce((acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0), 0);
  const pixDeclarado = records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
  const cartaoDeclarado = records.reduce(
    (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
    0
  );
  const faturamento = records.reduce(
    (acc, r) =>
      acc + (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0),
    0
  );

  const [pixReal, setPixReal] = useState(pixDeclarado);
  const [cartaoReal, setCartaoReal] = useState(cartaoDeclarado);
  const [justificativa, setJustificativa] = useState('');

  const qtdEnviadaTotal = records.reduce((acc, r) => acc + (Number(r.qtd_total_enviada) || 0), 0);
  const qtdRetornoTotal = records.reduce((acc, r) => acc + (Number(r.qtd_total_retorno) || 0), 0);
  const qtdVendidaTotal = Math.max(0, qtdEnviadaTotal - qtdRetornoTotal);
  const taxaDevolucao = qtdEnviadaTotal > 0 ? (qtdRetornoTotal / qtdEnviadaTotal) * 100 : 0;

  const totalRecebidoReal = isUnificado ? dinheiro : dinheiro + pixReal + cartaoReal;
  const diferenca = isUnificado ? 0 : totalRecebidoReal - faturamento;

  const handleDevolver = async () => {
    const confirmou = await confirmDialog.confirm({
      title: `Devolver para Ajuste - ${pdvNome}`,
      message: `Tem certeza que deseja devolver este fechamento? O status voltará para a etapa de lançamentos (Coluna 3).`,
      confirmText: 'Sim, devolver',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      const payloadOthers = { status: 'sobras_informadas', updated_at: new Date().toISOString() };
      for (const r of records) {
        await supabase.from('remessas_cargas_pdv').update(payloadOthers).eq('id', r.id);
      }

      toast({
        title: 'Devolvido para Ajuste',
        description: 'O card voltou para a etapa de lançamentos.',
        variant: 'warning',
      });
      onSave(records.map((r) => ({ ...r, ...payloadOthers })));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvar = async () => {
    const confirmou = await confirmDialog.confirm({
      title: `Auditar ${pdvNome}`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDV</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block">{pdvNome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Turnos Auditados</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{records.length} {records.length === 1 ? 'Turno' : 'Turnos'}</span>
            </div>
          </div>

          {/* Resumo Financeiro da Auditoria */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span>Faturamento Esperado:</span>
              <span className="font-mono font-bold text-slate-200">R$ {faturamento.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro Físico:</span>
              <span className="font-mono font-bold text-emerald-400">R$ {dinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-purple-400" /> Pix Real Conferido:</span>
              <span className="font-mono font-bold text-purple-300">R$ {pixReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> Cartão Real Conferido:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {cartaoReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-700 pt-1.5 text-white font-extrabold">
              <span>Total Recebido Real:</span>
              <span className="font-mono text-emerald-400 text-sm">R$ {totalRecebidoReal.toFixed(2)}</span>
            </div>
          </div>

          {/* Status Auditoria / Diferença */}
          <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${diferenca === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : diferenca < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
            <span>{diferenca === 0 ? '✓ Auditoria 100% Batida' : diferenca < 0 ? '⚠ Diferença Negativa / Falta' : '⚠ Sobra no Caixa'}</span>
            <span className="font-mono font-bold">
              {diferenca === 0 ? 'R$ 0,00' : `${diferenca > 0 ? '+' : ''}R$ ${diferenca.toFixed(2)}`}
            </span>
          </div>

          {justificativa.trim() && (
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">Justificativa da Auditoria:</span>
              "{justificativa.trim()}"
            </div>
          )}
        </div>
      ),
      confirmText: 'Auditar e Finalizar',
      cancelText: 'Revisar',
      variant: diferenca < 0 ? 'danger' : 'info',
    });
    if (!confirmou) return;

    if (isUnificado) {
      setSalvando(true);
      try {
        const nowIso = new Date().toISOString();
        for (const r of records) {
          const obsAtual = r.observacoes || '';
          const obsNova = justificativa
            ? obsAtual
              ? `${obsAtual}\nAuditoria: ${justificativa}`
              : `Auditoria: ${justificativa}`
            : obsAtual;

          const { error: errRemessa } = await supabase
            .from('remessas_cargas_pdv')
            .update({
              status: 'auditado',
              diferenca_auditoria: 0,
              observacoes: obsNova,
              updated_at: nowIso,
            })
            .eq('id', r.id);
          if (errRemessa) throw errRemessa;
        }

        toast({
          title: 'PDV Auditado!',
          description: `Mercadorias e dinheiro de gaveta de ${pdvNome} conferidos com sucesso.`,
          variant: 'success',
        });

        const updatedRecords = records.map((r) => ({
          ...r,
          diferenca_auditoria: 0,
          status: 'auditado',
          observacoes: justificativa
            ? r.observacoes
              ? `${r.observacoes}\nAuditoria: ${justificativa}`
              : `Auditoria: ${justificativa}`
            : r.observacoes,
          updated_at: nowIso,
        }));

        onSave(updatedRecords);
        onClose();
      } catch (err: any) {
        toast({ title: 'Erro ao auditar', description: err.message, variant: 'error' });
      } finally {
        setSalvando(false);
      }
      return;
    }

    setSalvando(true);
    try {
      const lastRecord = records[records.length - 1];

      const payloadLast = {
        valor_pix_declarado: Number(lastRecord.valor_pix_declarado) + (pixReal - pixDeclarado),
        valor_cartao_declarado:
          Number(lastRecord.valor_cartao_declarado) + (cartaoReal - cartaoDeclarado),
        diferenca_auditoria: diferenca,
        observacoes: justificativa
          ? lastRecord.observacoes
            ? `${lastRecord.observacoes}\nAuditoria: ${justificativa}`
            : `Auditoria: ${justificativa}`
          : lastRecord.observacoes,
        status: 'auditado',
        updated_at: new Date().toISOString(),
      };

      const payloadOthers = {
        diferenca_auditoria: 0,
        status: 'auditado',
        updated_at: new Date().toISOString(),
      };

      const { error: errLast } = await supabase
        .from('remessas_cargas_pdv')
        .update(payloadLast)
        .eq('id', lastRecord.id);
      if (errLast) throw errLast;

      for (const r of records) {
        if (r.id !== lastRecord.id) {
          await supabase.from('remessas_cargas_pdv').update(payloadOthers).eq('id', r.id);
        }
      }

      if (diferenca === 0) {
        try {
          void confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {
          void e;
        }
      }

      toast({
        title: 'PDV Auditado!',
        description: `O PDV ${pdvNome} foi auditado com sucesso.${diferenca === 0 ? ' Caixa 100% perfeito!' : ''}`,
        variant: 'success',
      });

      const updatedRecords = records.map((r) =>
        r.id === lastRecord.id ? { ...r, ...payloadLast } : { ...r, ...payloadOthers }
      );

      onSave(updatedRecords);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/40 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Auditar PDV — {pdvNome}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3 space-y-1.5 text-xs text-text/70">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1.5">
              <span>Balanço Físico:</span>
              <span className="font-mono text-text/90">
                Env: {qtdEnviadaTotal} | Ret: {qtdRetornoTotal} | Vnd: {qtdVendidaTotal}
                <span
                  className={`ml-1 px-1 rounded ${taxaDevolucao > 30 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                >
                  ({taxaDevolucao.toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Faturamento Total Esperado:</span>
              <span className="font-mono font-bold text-text/90">R$ {faturamento.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Dinheiro Físico Declarado:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                R$ {dinheiro.toFixed(2)}
              </span>
            </div>
          </div>

          {records.length > 1 && (
            <div className="space-y-1.5 mt-2">
              <h4 className="text-[11px] font-bold text-text/70">Valores Declarados por Turno:</h4>
              {records.map((r, i) => {
                const rFatur =
                  Number(r.faturamento_liquido_esperado) ||
                  Number(r.faturamento_bruto_teorico) ||
                  0;
                const rRec =
                  (Number(r.valor_dinheiro_gaveta) || 0) +
                  (Number(r.valor_pix_declarado) || 0) +
                  (Number(r.valor_cartao_declarado) || 0);
                const rDif = rRec - rFatur;
                return (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2 text-[10px] border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex gap-2.5">
                      <span className="font-bold capitalize text-slate-700 dark:text-slate-300">
                        {formatTurno(r.turno)}
                      </span>
                      <span className="text-slate-500">
                        Fat: <span className="font-mono">R$ {rFatur.toFixed(2)}</span>
                      </span>
                      <span className="text-slate-500">
                        Dec: <span className="font-mono">R$ {rRec.toFixed(2)}</span>
                      </span>
                    </div>
                    {rDif !== 0 && (
                      <span
                        className={`font-mono font-bold ${rDif < 0 ? 'text-rose-500' : 'text-emerald-500'}`}
                      >
                        Dif: R$ {rDif.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isUnificado ? (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
                <Layers className="h-4 w-4 shrink-0 text-blue-600" />
                Valores digitais centralizados no fechamento unificado
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
                Os valores de Pix, Cartão Débito, Cartão Crédito, Outros e Taxas deste dia foram informados de forma centralizada no <strong>Fechamento Unificado</strong>. Não há rateio artificial por PDV/turno. Esta conferência valida o balanço físico e o dinheiro de gaveta deste PDV. Para a conciliação digital consolidada, utilize a <strong>Auditoria Consolidada</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1 block">
                    Pix Extrato Bancário
                  </label>
                  <BRLCurrencyInput
                    value={pixReal}
                    onChange={(val) => setPixReal(val)}
                    className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 font-mono text-sm font-bold text-purple-800 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 mb-1 block">
                    Cartão Maquininha
                  </label>
                  <BRLCurrencyInput
                    value={cartaoReal}
                    onChange={(val) => setCartaoReal(val)}
                    className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>{isUnificado ? 'Dinheiro Físico deste PDV:' : 'Total Recebido:'}</span>
              <span className="font-mono font-bold text-emerald-400">
                R$ {totalRecebidoReal.toFixed(2)}
              </span>
            </div>
            {!isUnificado && (
              <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                <span className="font-bold text-white">Diferença de Caixa:</span>
                <span
                  className={`font-mono font-black ${diferenca < 0 ? 'text-rose-500 bg-rose-500/20 px-2 py-0.5 rounded' : diferenca > 0 ? 'text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded' : 'text-emerald-400'}`}
                >
                  R$ {diferenca.toFixed(2)} {diferenca === 0 && '✅'}
                </span>
              </div>
            )}
          </div>

          {diferenca !== 0 && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-rose-500 block">
                  Justificativa da Diferença *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const diffNeed = faturamento - dinheiro;
                    const half = Math.max(0, diffNeed / 2);
                    setPixReal(Math.round(half * 100) / 100);
                    setCartaoReal(Math.round((diffNeed - half) * 100) / 100);
                    setJustificativa(
                      'Erro de digitação no fechamento original — valores corrigidos na auditoria'
                    );
                  }}
                  className="text-[10px] font-bold text-purple-700 dark:text-purple-300 underline hover:text-purple-900 cursor-pointer flex items-center gap-1"
                >
                  ✏️ Foi Erro de Digitação (Zerar Diferença)
                </button>
              </div>

              {/* Botões de atalho rápido */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setJustificativa('Erro de digitação no lançamento de caixa')}
                  className="px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 font-semibold hover:bg-purple-200 transition-colors"
                >
                  ✏️ Erro de Digitação
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) =>
                      prev ? `${prev}, Perda/Quebra` : 'Perda/Quebra de produto'
                    )
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-text/80 font-semibold hover:bg-slate-200 transition-colors"
                >
                  🍌 Perda/Quebra
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) => (prev ? `${prev}, Doação` : 'Doação/Degustação'))
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-text/80 font-semibold hover:bg-slate-200 transition-colors"
                >
                  🎁 Doação/Degustação
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) => (prev ? `${prev}, Consumo` : 'Consumo Interno'))
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-text/80 font-semibold hover:bg-slate-200 transition-colors"
                >
                  ☕ Consumo
                </button>
              </div>

              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="Por que houve diferença de valores?"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <button
              type="button"
              onClick={handleDevolver}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Devolver
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando || (diferenca !== 0 && justificativa.trim() === '')}
              className="flex-[1.5] flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Aprovar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

// ─── Modal Auditar Todos os PDVs (Auditoria Consolidada Bancária) ────────────

function AuditarTodosPDVsModal({
  allPdvs,
  dataAcerto,
  profile,
  onClose,
  onSave,
}: {
  allPdvs: { local: LocalPDV; records: RemessaKanban[] }[];
  dataAcerto: string;
  profile: any;
  onClose: () => void;
  onSave: (updated: RemessaKanban[]) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const [salvando, setSalvando] = useState(false);

  // Consulta à entidade fechamentos_unificados_pdv do dia
  const [fechamentoUnificado, setFechamentoUnificado] = useState<any>(null);
  const [carregandoFechamento, setCarregandoFechamento] = useState(true);

  // Todos os PDVs começam selecionados
  const [selectedPdvIds, setSelectedPdvIds] = useState<Set<string>>(
    () => new Set(allPdvs.map((p) => p.local.id))
  );

  const selectedPdvs = allPdvs.filter((p) => selectedPdvIds.has(p.local.id));
  const selectedRecords = selectedPdvs.flatMap((p) => p.records);

  const organizationId = profile?.organization_id || selectedRecords[0]?.organization_id;

  // Carrega fechamento unificado do Supabase
  useEffect(() => {
    async function carregarFechamento() {
      if (!organizationId || !dataAcerto) {
        setCarregandoFechamento(false);
        return;
      }
      try {
        setCarregandoFechamento(true);
        const { data, error } = await supabase
          .from('fechamentos_unificados_pdv')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('data', dataAcerto)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('Erro ao consultar fechamentos_unificados_pdv:', error);
        }
        setFechamentoUnificado(data || null);
      } catch (e) {
        console.warn('Exceção ao buscar fechamento unificado:', e);
      } finally {
        setCarregandoFechamento(false);
      }
    }
    carregarFechamento();
  }, [organizationId, dataAcerto]);

  // 1. Apuração de Vendas Comerciais
  const faturamentoBruto = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.faturamento_bruto_teorico) || 0),
    0
  );

  const descontosPerdas = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.total_descontos_perdas) || 0),
    0
  );

  const faturamentoLiquido = selectedRecords.reduce(
    (acc, r) =>
      acc + (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0),
    0
  );

  // 2. Dinheiro dos Turnos (Automático)
  const dinheiroTurnos = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );

  // 3. Recebimentos Declarados: origem no fechamento unificado (ou fallback em remessas legadas)
  const pixDeclarado = fechamentoUnificado
    ? Number(fechamentoUnificado.total_pix_declarado || 0)
    : selectedRecords.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);

  const debitoDeclarado = fechamentoUnificado
    ? Number(fechamentoUnificado.total_cartao_debito_declarado || 0)
    : 0;

  const creditoDeclarado = fechamentoUnificado
    ? Number(fechamentoUnificado.total_cartao_credito_declarado || 0)
    : selectedRecords.reduce((acc, r) => acc + (Number(r.valor_cartao_declarado) || 0), 0);

  const outrosDeclarado = fechamentoUnificado
    ? Number(fechamentoUnificado.total_outros_declarado || 0)
    : 0;

  const taxaDeclarada = fechamentoUnificado
    ? Number(fechamentoUnificado.total_taxas_operacionais || 0)
    : selectedRecords.reduce((acc, r) => acc + (Number(r.taxa_cartao_reais) || 0), 0);

  // Percentual equivalente da taxa declarada
  const totalDigitalDeclarado = pixDeclarado + debitoDeclarado + creditoDeclarado;
  const taxaDeclaradaPct = calcularTaxaPercentualEquivalente(taxaDeclarada, totalDigitalDeclarado);

  // 4. Estados de Conferência Real (Bancária / Maquininhas)
  const [pixReal, setPixReal] = useState<number>(0);
  const [debitoReal, setDebitoReal] = useState<number>(0);
  const [creditoReal, setCreditoReal] = useState<number>(0);
  const [outrosReal, setOutrosReal] = useState<number>(0);
  const [taxaReal, setTaxaReal] = useState<number>(0);
  const [justificativa, setJustificativa] = useState<string>('');

  // Atualiza os valores reais com os declarados ao carregar
  useEffect(() => {
    setPixReal(pixDeclarado);
    setDebitoReal(debitoDeclarado);
    setCreditoReal(creditoDeclarado);
    setOutrosReal(outrosDeclarado);
    setTaxaReal(taxaDeclarada);
    setJustificativa(fechamentoUnificado?.justificativa || '');
  }, [
    fechamentoUnificado,
    pixDeclarado,
    debitoDeclarado,
    creditoDeclarado,
    outrosDeclarado,
    taxaDeclarada,
  ]);

  // 5. Cálculos Financeiros em Tempo Real
  // Total bruto recebido = Dinheiro físico dos turnos + Pix + Débito + Crédito + Outros
  const totalDigitalReal = pixReal + debitoReal + creditoReal + outrosReal;
  const totalBrutoRecebidoReal =
    Math.round((dinheiroTurnos + totalDigitalReal) * 100) / 100;

  // Total líquido após taxas = Total bruto recebido - Taxa única informada
  const totalLiquidoAposTaxas =
    Math.max(0, Math.round((totalBrutoRecebidoReal - taxaReal) * 100) / 100);

  // Diferença de conciliação comercial = Total bruto recebido - Faturamento líquido comercial
  // (A taxa financeira é despesa operacional e NÃO entra no furo comercial de caixa)
  const diferencaCaixa = Math.round((totalBrutoRecebidoReal - faturamentoLiquido) * 100) / 100;

  // Percentual equivalente da taxa operacional conferida: (taxa / (pix + debito + credito)) * 100
  const taxaPercentualReal = calcularTaxaPercentualEquivalente(
    taxaReal,
    pixReal + debitoReal + creditoReal
  );

  // Classificação formal de Furo, Sobra ou Caixa Conferido
  const resultadoCaixa = classificarResultadoCaixa(totalBrutoRecebidoReal, faturamentoLiquido);
  const temDiferenca = !resultadoCaixa.is_perfeito;

  const togglePdv = (id: string) => {
    setSelectedPdvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPdvIds.size === allPdvs.length) {
      setSelectedPdvIds(new Set());
    } else {
      setSelectedPdvIds(new Set(allPdvs.map((p) => p.local.id)));
    }
  };

  const handleSalvar = async () => {
    if (selectedPdvs.length === 0 || selectedRecords.length === 0) {
      toast({
        title: 'Selecione ao menos 1 PDV',
        description: 'Marque pelo menos um PDV para realizar a auditoria.',
        variant: 'warning',
      });
      return;
    }

    if (temDiferenca && justificativa.trim() === '') {
      toast({
        title: 'Justificativa obrigatória',
        description:
          resultadoCaixa.status === 'furo'
            ? 'Informe a justificativa do furo de caixa identificado.'
            : 'Informe a justificativa da sobra de caixa identificada.',
        variant: 'warning',
      });
      return;
    }

    const confirmou = await confirmDialog.confirm({
      title: `Concluir Auditoria Consolidada (${selectedPdvs.length} PDVs)`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDVs Auditados</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{selectedPdvs.length} PDVs</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Data da Auditoria</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{dataAcerto}</span>
            </div>
          </div>

          {/* Resumo Financeiro da Auditoria */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span>Faturamento Líquido Comercial:</span>
              <span className="font-mono font-bold text-slate-200">R$ {faturamentoLiquido.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Dinheiro Físico Turnos:</span>
              <span className="font-mono font-bold text-emerald-400">R$ {dinheiroTurnos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Pix Conferido (Extrato):</span>
              <span className="font-mono font-bold text-purple-300">R$ {pixReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Débito Conferido:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {debitoReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Crédito Conferido:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {creditoReal.toFixed(2)}</span>
            </div>
            {outrosReal > 0 && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Outros Recebimentos:</span>
                <span className="font-mono font-bold text-slate-200">R$ {outrosReal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-700 pt-1 text-white font-extrabold">
              <span>Total Bruto Recebido:</span>
              <span className="font-mono text-emerald-400 text-sm">R$ {totalBrutoRecebidoReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-300 text-[11px]">
              <span>Taxa Financeira Única:</span>
              <span className="font-mono font-bold">-R$ {taxaReal.toFixed(2)} ({taxaPercentualReal.formatado})</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-700 pt-1 text-slate-200 font-bold">
              <span>Líquido Após Taxas:</span>
              <span className="font-mono text-slate-100">R$ {totalLiquidoAposTaxas.toFixed(2)}</span>
            </div>
          </div>

          {/* Card de Furo / Sobra / Conferido */}
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${resultadoCaixa.is_perfeito
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : resultadoCaixa.status === 'furo'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
          >
            <span>{resultadoCaixa.rotulo}</span>
            <span className="font-mono font-bold">
              {resultadoCaixa.is_perfeito ? '✓ Batido' : `${diferencaCaixa > 0 ? '+' : ''}R$ ${diferencaCaixa.toFixed(2)}`}
            </span>
          </div>

          {justificativa.trim() && (
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">
                Justificativa da Auditoria:
              </span>
              "{justificativa.trim()}"
            </div>
          )}
        </div>
      ),
      confirmText: 'Auditar e Finalizar',
      cancelText: 'Revisar',
      variant: resultadoCaixa.status === 'furo' ? 'danger' : 'info',
    });

    if (!confirmou) return;

    setSalvando(true);

    try {
      const nowIso = new Date().toISOString();
      const remessaIds = selectedRecords.map((r) => r.id);

      // 1. Atualiza cabeçalho fechamentos_unificados_pdv se existir
      if (fechamentoUnificado?.id) {
        const { error: errFech } = await supabase
          .from('fechamentos_unificados_pdv')
          .update({
            total_pix_declarado: pixReal,
            total_cartao_debito_declarado: debitoReal,
            total_cartao_credito_declarado: creditoReal,
            total_outros_declarado: outrosReal,
            total_taxas_operacionais: taxaReal,
            total_recebido: totalBrutoRecebidoReal,
            total_liquido_apos_taxas: totalLiquidoAposTaxas,
            diferenca_caixa: diferencaCaixa,
            justificativa: justificativa.trim() || fechamentoUnificado.justificativa || null,
            status: 'auditado',
            updated_at: nowIso,
          })
          .eq('id', fechamentoUnificado.id);

        if (errFech) throw errFech;
      }

      // 2. Atualiza remessas_cargas_pdv selecionadas
      const { error: errRemessas } = await supabase
        .from('remessas_cargas_pdv')
        .update({
          status: 'auditado',
          diferenca_auditoria: 0,
          updated_at: nowIso,
        })
        .in('id', remessaIds);

      if (errRemessas) throw errRemessas;

      const updatedList: RemessaKanban[] = selectedRecords.map((r) => ({
        ...r,
        diferenca_auditoria: 0,
        status: 'auditado',
        updated_at: nowIso,
      }));

      if (resultadoCaixa.is_perfeito) {
        try {
          void confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
          });
        } catch {
          // Confetti é visual
        }
      }

      toast({
        title: resultadoCaixa.is_perfeito ? 'Auditoria Concluída! 🎉' : 'Auditoria Concluída',
        description: `${selectedPdvs.length} PDV(s) e ${selectedRecords.length} turno(s) auditados com sucesso.`,
        variant: 'success',
      });

      onSave(updatedList);
      onClose();
    } catch (err: any) {
      console.error('Erro na auditoria consolidada:', err);
      toast({
        title: 'Erro ao auditar',
        description: err?.message || 'Não foi possível concluir a auditoria.',
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-purple-400 dark:border-purple-700 bg-background p-5 shadow-2xl space-y-4 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                Auditoria Consolidada
              </h3>
              <p className="text-[11px] font-medium text-text/50 mt-0.5">
                {selectedPdvs.length} de {allPdvs.length} PDV(s) selecionados •{' '}
                {selectedRecords.length} turno(s)
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Seleção dos PDVs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                <Store className="h-4 w-4" />
                PDVs Participantes
              </h4>

              <button
                type="button"
                onClick={toggleAll}
                disabled={salvando}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 underline disabled:opacity-50"
              >
                {selectedPdvIds.size === allPdvs.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {allPdvs.map(({ local, records }) => {
                const isSelected = selectedPdvIds.has(local.id);
                const fatPdv = records.reduce(
                  (acc, r) =>
                    acc +
                    (Number(r.faturamento_liquido_esperado) ||
                      Number(r.faturamento_bruto_teorico) ||
                      0),
                  0
                );
                const dinPdv = records.reduce(
                  (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
                  0
                );

                return (
                  <button
                    key={local.id}
                    type="button"
                    onClick={() => togglePdv(local.id)}
                    disabled={salvando}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border-2 text-left transition-all disabled:cursor-not-allowed ${isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40'
                        : 'border-transparent bg-slate-50 dark:bg-slate-900/50 opacity-50 hover:opacity-80'
                      }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${isSelected
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-300 bg-background'
                        }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-text/80">{local.nome}</p>
                      <p className="text-[10px] font-mono text-text/50">
                        {records.length} turno(s) • Fat: R$ {fatPdv.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Dinheiro: R$ {dinPdv.toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recebimentos informados no fechamento */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1 mb-1">
              <span>Recebimentos Declarados:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {fechamentoUnificado ? 'Origem: Fechamento Unificado' : 'Origem: Lançamentos Individuais'}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                Dinheiro Físico (Turnos):
              </span>
              <span className="font-mono font-bold text-emerald-400">
                R$ {dinheiroTurnos.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-purple-400" />
                Pix Declarado:
              </span>
              <span className="font-mono font-bold text-purple-300">
                R$ {pixDeclarado.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                Cartão Débito:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                R$ {debitoDeclarado.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                Cartão Crédito:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                R$ {creditoDeclarado.toFixed(2)}
              </span>
            </div>

            {outrosDeclarado > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Outros Recebimentos:</span>
                <span className="font-mono font-bold text-slate-200">
                  R$ {outrosDeclarado.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
              <span>Taxa Única das Operações:</span>
              <span className="font-mono font-bold text-amber-300">
                R$ {taxaDeclarada.toFixed(2)}
                <span className="text-[10px] text-amber-400/80 ml-1">
                  ({taxaDeclaradaPct.formatado})
                </span>
              </span>
            </div>
          </div>

          {/* Conferência Bancária e Maquininhas */}
          <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800 p-3 space-y-3">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Conferência Bancária & Maquininhas (Extrato Real)
              </h4>
              <p className="text-[10px] text-text/50 mt-0.5">
                Confira os valores creditados no extrato Pix e nas operadoras de cartão.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 mb-1 block">
                  Pix Total — Extrato
                </label>
                <BRLCurrencyInput
                  value={pixReal}
                  onChange={(val) => setPixReal(val)}
                  className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 font-mono text-sm font-bold text-purple-800 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 mb-1 block">
                  Cartão Débito Real
                </label>
                <BRLCurrencyInput
                  value={debitoReal}
                  onChange={(val) => setDebitoReal(val)}
                  className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-2.5 py-1.5 font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 mb-1 block">
                  Cartão Crédito Real
                </label>
                <BRLCurrencyInput
                  value={creditoReal}
                  onChange={(val) => setCreditoReal(val)}
                  className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-2.5 py-1.5 font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-400 mb-1 block">
                  Outros Recebimentos
                </label>
                <BRLCurrencyInput
                  value={outrosReal}
                  onChange={(val) => setOutrosReal(val)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 px-2.5 py-1.5 font-mono text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                    Taxa das Operações (R$)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    Equivalente: {taxaPercentualReal.formatado} sobre R$ {(pixReal + debitoReal + creditoReal).toFixed(2)} digitais
                  </span>
                </div>
                <BRLCurrencyInput
                  value={taxaReal}
                  onChange={(val) => setTaxaReal(val)}
                  className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 font-mono text-sm font-bold text-amber-800 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Resumo Financeiro da Auditoria */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Faturamento Bruto das Vendas:</span>
              <span className="font-mono text-slate-200">R$ {faturamentoBruto.toFixed(2)}</span>
            </div>
            {descontosPerdas > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Descontos Comerciais / Perdas:</span>
                <span className="font-mono text-rose-400">-R$ {descontosPerdas.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-200 font-bold border-t border-slate-800 pt-1">
              <span>Faturamento Líquido Comercial:</span>
              <span className="font-mono text-white">R$ {faturamentoLiquido.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Bruto Recebido (Dinheiro + Digitais):</span>
              <span className="font-mono font-bold text-emerald-400">
                R$ {totalBrutoRecebidoReal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-amber-300 text-[11px]">
              <span>Taxa das Operações:</span>
              <span className="font-mono font-bold">-R$ {taxaReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
              <span>Total Líquido após Taxas:</span>
              <span className="font-mono font-bold text-white">
                R$ {totalLiquidoAposTaxas.toFixed(2)}
              </span>
            </div>

            {/* Resultado de Caixa (Furo / Sobra / Conferido) */}
            <div
              className={`flex items-center justify-between p-2.5 rounded-xl border mt-2 ${resultadoCaixa.is_perfeito
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : resultadoCaixa.status === 'furo'
                    ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                    : 'bg-amber-950/60 border-amber-700 text-amber-300'
                }`}
            >
              <div>
                <span className="font-black text-xs block">{resultadoCaixa.rotulo}</span>
                <span className="text-[10px] text-slate-300 block">
                  {resultadoCaixa.is_perfeito
                    ? 'Total bruto recebido igual ao faturamento comercial (100% batido)'
                    : resultadoCaixa.status === 'furo'
                      ? 'Diferença financeira negativa comercial (não reduz faturamento)'
                      : 'Recebido a maior que o faturamento comercial'}
                </span>
              </div>
              <span className="font-mono font-black text-sm">
                {resultadoCaixa.is_perfeito ? 'R$ 0,00' : `${diferencaCaixa > 0 ? '+' : ''}R$ ${diferencaCaixa.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Comparativo de Reauditoria (Antes vs Depois) */}
          {fechamentoUnificado && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2.5 text-[11px] grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Antes (Fechamento)</span>
                <p className="font-mono text-slate-700 dark:text-slate-300">
                  Rec: R$ {Number(fechamentoUnificado.total_recebido || 0).toFixed(2)}
                </p>
                <p className="font-mono text-slate-500 text-[10px]">
                  Dif: R$ {Number(fechamentoUnificado.diferenca_caixa || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Depois (Auditoria Recalculada)</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  Rec: R$ {totalBrutoRecebidoReal.toFixed(2)}
                </p>
                <p className={`font-mono font-bold text-[10px] ${resultadoCaixa.status === 'furo' ? 'text-rose-500' : resultadoCaixa.status === 'sobra' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {resultadoCaixa.rotulo}
                </p>
              </div>
            </div>
          )}

          {temDiferenca && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-500 block">
                Justificativa da Diferença *
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-xs text-text outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="Informe o motivo da divergência encontrada na conciliação comercial..."
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSalvar}
              disabled={
                salvando ||
                selectedPdvs.length === 0 ||
                selectedRecords.length === 0 ||
                (temDiferenca && justificativa.trim() === '')
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Auditar e Concluir ({selectedPdvs.length} PDVs)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

// ─── Modal Reabrir Auditoria (auditado -> encerrado) ─────────────────────────

function ReabrirAuditoriaModal({
  target,
  profile,
  onClose,
  onSave,
}: {
  target: {
    localNome: string;
    records: RemessaKanban[];
    isGeral: boolean;
  };
  profile: any;
  onClose: () => void;
  onSave: (updated: RemessaKanban[]) => void;
}) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const userName = profile?.nome || profile?.email || 'Administrador';
  const dataHoraAtual = new Date().toLocaleString('pt-BR');

  // Valores preservados para exibição
  const faturamentoTotal = target.records.reduce(
    (acc, r) =>
      acc +
      (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0),
    0
  );
  const dinheiroTotal = target.records.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );

  const handleConfirmarReabertura = async () => {
    if (!motivo.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo detalhado para a reabertura da auditoria.',
        variant: 'warning',
      });
      return;
    }

    setSalvando(true);
    try {
      const nowIso = new Date().toISOString();
      const carimboLog = `[Reabertura Auditoria em ${dataHoraAtual} por ${userName}]: ${motivo.trim()} (Transição: auditado -> encerrado)`;

      // 1. Atualizar remessas selecionadas (auditado -> encerrado)
      // Preserva intactos: itens_grade, sobras, valor_dinheiro_gaveta, fechamento_unificado_id, faturamentos, etc.
      for (const r of target.records) {
        const obsAtual = r.observacoes || '';
        const obsNova = obsAtual ? `${obsAtual}\n${carimboLog}` : carimboLog;

        const { error: errRem } = await supabase
          .from('remessas_cargas_pdv')
          .update({
            status: 'encerrado',
            observacoes: obsNova,
            updated_at: nowIso,
          })
          .eq('id', r.id);

        if (errRem) throw errRem;
      }

      // 2. Se houver fechamentos_unificados_pdv relacionados, reabrir de maneira consistente
      const fechamentoIds = Array.from(
        new Set(target.records.map((r) => r.fechamento_unificado_id).filter(Boolean))
      );

      for (const fechId of fechamentoIds) {
        const { error: errFech } = await supabase
          .from('fechamentos_unificados_pdv')
          .update({
            status: 'encerrado',
            updated_at: nowIso,
          })
          .eq('id', fechId);

        if (errFech) {
          console.warn('Erro ao atualizar status do fechamento unificado para encerrado:', errFech);
        }
      }

      const updatedRecords: RemessaKanban[] = target.records.map((r) => {
        const obsAtual = r.observacoes || '';
        const obsNova = obsAtual ? `${obsAtual}\n${carimboLog}` : carimboLog;
        return {
          ...r,
          status: 'encerrado',
          observacoes: obsNova,
          updated_at: nowIso,
        };
      });

      toast({
        title: 'Auditoria Reaberta com Sucesso',
        description: `${target.isGeral ? 'Todos os PDVs' : target.localNome} retornaram para "Aguardando Auditoria" para conferência e recálculo.`,
        variant: 'success',
      });

      onSave(updatedRecords);
      onClose();
    } catch (err: any) {
      console.error('Erro ao reabrir auditoria:', err);
      toast({
        title: 'Erro ao reabrir auditoria',
        description: err?.message || 'Falha ao processar reabertura no banco.',
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-background p-5 shadow-2xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-100">
                Reabrir Auditoria — {target.localNome}
              </h3>
              <p className="text-[11px] text-text/50">
                {target.records.length} turno(s) auditado(s) • Transição administrativa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informação sobre a transição */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-2 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-semibold leading-relaxed">
            Esta ação retornará os registros auditados para o estado{' '}
            <span className="font-black underline">"Aguardando Auditoria" (encerrado)</span>.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-amber-200/60 dark:border-amber-800/60 font-mono">
            <div>
              <span className="text-amber-700 dark:text-amber-400 block font-bold">Status Anterior:</span>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold">
                auditado
              </span>
            </div>
            <div>
              <span className="text-amber-700 dark:text-amber-400 block font-bold">Novo Status:</span>
              <span className="inline-block px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold">
                encerrado
              </span>
            </div>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-1">
            ✓ Sobras físicas, itens da grade, dinheiro de gaveta e valores financeiros são preservados intactos para nova conferência humana.
          </p>
        </div>

        {/* Dados Administrativos */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Responsável pela Reabertura:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{userName}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Data / Hora:</span>
            <span className="font-mono text-slate-800 dark:text-slate-100">{dataHoraAtual}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Faturamento Preservado:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
              R$ {faturamentoTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Dinheiro em Gaveta Preservado:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              R$ {dinheiroTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Motivo Obrigatório */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-text/80 block">
            Motivo da Reabertura da Auditoria <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            disabled={salvando}
            placeholder="Descreva obrigatoriamente a razão para reabrir esta auditoria (ex: ajuste de extrato bancário, correção de taxa de cartão, retificação de turno)..."
            className="w-full resize-none rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs text-text outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex-1 rounded-xl bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmarReabertura}
            disabled={salvando || !motivo.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {salvando ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Reabrindo...
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" /> Confirmar Reabertura
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Unificar Todos os PDVs (Sobras e Caixa Centralizado) ──────────────

function UnificarTodosPDVsModal({
  allPdvs,
  produtosBase,
  onClose,
  onSave,
}: {
  allPdvs: { local: LocalPDV; records: RemessaKanban[] }[];
  produtosBase: ProdutoItem[];
  onClose: () => void;
  onSave: (updated: RemessaKanban[]) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const [salvando, setSalvando] = useState(false);
  const [mostrarDetalhesTurnos, setMostrarDetalhesTurnos] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  // Todos os PDVs começam selecionados
  const [selectedPdvIds, setSelectedPdvIds] = useState<Set<string>>(
    () => new Set(allPdvs.map((p) => p.local.id))
  );

  const selectedPdvs = allPdvs.filter((p) => selectedPdvIds.has(p.local.id));
  const selectedRecords = selectedPdvs.flatMap((p) => p.records);

  // Recebimentos Digitais Consolidados (Extrato bancário / maquininhas)
  const initialPixSum = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.valor_pix_declarado) || 0),
    0
  );
  const initialCartaoSum = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
    0
  );

  const [globalPix, setGlobalPix] = useState<number>(initialPixSum);
  const [globalDebito, setGlobalDebito] = useState<number>(0);
  const [globalCredito, setGlobalCredito] = useState<number>(initialCartaoSum);
  const [globalOutros, setGlobalOutros] = useState<number>(0);

  // Taxa Financeira Única em Reais (R$) consolidada do dia
  const initialTaxaSum = selectedRecords.reduce(
    (acc, r) => acc + (Number(r.taxa_cartao_reais) || 0),
    0
  );
  const [globalTaxas, setGlobalTaxas] = useState<number>(initialTaxaSum);

  // Mapeamento de Sobras por Remessa/PDV: Record<remessa_id, Record<produto_id, number | null>>
  // Regra Larissa Saba: a sobra NUNCA é distribuída entre PDVs. Cada remessa retorna fisicamente à fábrica.
  const [sobrasPorRemessa, setSobrasPorRemessa] = useState<
    Record<string, Record<string, number | null>>
  >(() => {
    const map: Record<string, Record<string, number | null>> = {};
    selectedRecords.forEach((r) => {
      map[r.id] = {};
      (r.itens_grade || []).forEach((it) => {
        const disp = (Number(it.qtd_enviada) || 0) + (Number(it.qtd_sobra_anterior) || 0);
        if (disp <= 0 && (!it.qtd_retorno || Number(it.qtd_retorno) <= 0)) {
          map[r.id][it.produto_id] = 0;
          return;
        }
        if (
          it.qtd_retorno !== null &&
          it.qtd_retorno !== undefined &&
          !isNaN(Number(it.qtd_retorno))
        ) {
          map[r.id][it.produto_id] = Number(it.qtd_retorno);
        } else {
          map[r.id][it.produto_id] = 0;
        }
      });
    });
    return map;
  });

  const togglePdv = (id: string) => {
    setSelectedPdvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPdvIds.size === allPdvs.length) {
      setSelectedPdvIds(new Set());
    } else {
      setSelectedPdvIds(new Set(allPdvs.map((p) => p.local.id)));
    }
  };

  const handleZerarTodasSobras = () => {
    setSobrasPorRemessa((prev) => {
      const next: Record<string, Record<string, number | null>> = {};
      selectedRecords.forEach((r) => {
        next[r.id] = { ...(prev[r.id] || {}) };
        (r.itens_grade || []).forEach((it) => {
          next[r.id][it.produto_id] = 0;
        });
      });
      return next;
    });
    toast({
      title: 'Vendeu tudo nos PDVs!',
      description: 'Todas as sobras foram confirmadas como zero (0 un).',
      variant: 'info',
    });
  };

  // Monta a estrutura TurnoFechamentoInput[] para o motor centralizado fechamento-pdv-calc
  // Cada remessa preserva seu próprio retorno físico à fábrica (sem distribuição nem duplicação)
  const turnosInput: TurnoFechamentoInput[] = useMemo(() => {
    return selectedRecords.map((r) => {
      const pdvNome =
        r.locais?.nome || allPdvs.find((p) => p.local.id === r.local_id)?.local.nome || 'PDV';
      const itensInput: ItemMovimentacaoPDV[] = (r.itens_grade || []).map((it) => {
        const ret = sobrasPorRemessa[r.id]?.[it.produto_id];
        return {
          produto_id: it.produto_id,
          nome: it.nome,
          preco_unitario: Number(it.preco_unitario || 0),
          qtd_estoque_inicial: Number(it.qtd_sobra_anterior || 0),
          qtd_enviada: Number(it.qtd_enviada || 0),
          qtd_retorno: ret !== undefined ? ret : null,
        };
      });

      return {
        id: r.id,
        local_id: r.local_id,
        pdv_nome: pdvNome,
        data: r.data,
        turno: r.turno,
        status: r.status,
        valor_dinheiro_gaveta:
          r.valor_dinheiro_gaveta !== null && r.valor_dinheiro_gaveta !== undefined
            ? Number(r.valor_dinheiro_gaveta)
            : null,
        itens_grade: itensInput,
      };
    });
  }, [selectedRecords, sobrasPorRemessa, allPdvs]);

  // Executa o cálculo oficial unificado compartilhado
  const apuracao = useMemo(() => {
    return apurarFechamentoUnificado(turnosInput, {
      pix: globalPix,
      cartao_debito: globalDebito,
      cartao_credito: globalCredito,
      outros: globalOutros,
      taxas_operacionais: globalTaxas,
    });
  }, [turnosInput, globalPix, globalDebito, globalCredito, globalOutros, globalTaxas]);

  const temDiferenca = Math.abs(apuracao.diferenca_caixa) > 0.05;

  // Salvar Fechamento Unificado Atômico via RPC PostgreSQL
  const handleSalvarUnificacao = async () => {
    if (selectedPdvs.length === 0 || selectedRecords.length === 0) {
      toast({
        title: 'Selecione ao menos 1 PDV',
        description: 'Marque pelo menos um PDV para realizar a unificação.',
        variant: 'warning',
      });
      return;
    }

    if (apuracao.tem_pendencias) {
      toast({
        title: 'Sobras Pendentes de Conferência',
        description:
          'Existem produtos sem conferência de sobras. Preencha as sobras físicas ou clique em "Confirmar Vendeu Tudo".',
        variant: 'warning',
      });
      return;
    }

    if (temDiferenca && justificativa.trim() === '') {
      toast({
        title: 'Informe a Justificativa',
        description: `Existe uma diferença de R$ ${Math.abs(apuracao.diferenca_caixa).toFixed(2)} no fechamento. Por favor, escreva o motivo (ex: perda, doação, consumo, erro de troco) para prosseguir.`,
        variant: 'warning',
      });
      return;
    }

    const confirmou = await confirmDialog.confirm({
      title: `Confirmar Fechamento Unificado (${selectedPdvs.length} PDVs)`,
      size: 'lg',
      message: (
        <div className="space-y-3 text-left">
          {/* Header Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDVs</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{selectedPdvs.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Turnos</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{selectedRecords.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Sobras Físicas</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm font-mono">{apuracao.total_sobras_conferidas} un</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Itens Vendidos</span>
              <span className="font-extrabold text-primary text-sm font-mono">{apuracao.total_vendido} un</span>
            </div>
          </div>

          {/* Card Financeiro Consolidado */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro Gaveta (Todos os PDVs):</span>
              <span className="font-mono font-bold text-emerald-400">R$ {apuracao.total_dinheiro_turnos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-purple-400" /> Pix Extrato Bancário:</span>
              <span className="font-mono font-bold text-purple-300">R$ {globalPix.toFixed(2)}</span>
            </div>
            {(globalDebito > 0 || globalCredito > 0) && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> Cartão Débito / Crédito:</span>
                <span className="font-mono font-bold text-cyan-300">
                  R$ {(globalDebito + globalCredito).toFixed(2)}
                  <span className="text-[10px] text-slate-400 ml-1">
                    (Déb: {globalDebito.toFixed(2)} | Créd: {globalCredito.toFixed(2)})
                  </span>
                </span>
              </div>
            )}
            {globalOutros > 0 && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Outros Recebimentos:</span>
                <span className="font-mono font-bold text-slate-200">R$ {globalOutros.toFixed(2)}</span>
              </div>
            )}
            {apuracao.total_taxas_operacionais > 0 && (
              <div className="flex justify-between items-center text-amber-300 border-t border-slate-800 pt-1">
                <span>Taxas das Operações de Cartão:</span>
                <span className="font-mono font-bold">-R$ {apuracao.total_taxas_operacionais.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 text-white font-extrabold">
              <span>Total Líquido Consolidado a Receber:</span>
              <span className="font-mono text-emerald-400 text-sm">R$ {apuracao.total_liquido_apos_taxas.toFixed(2)}</span>
            </div>
          </div>

          {/* Conciliação Comercial Geral */}
          <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${!temDiferenca
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : apuracao.diferenca_caixa < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
            <span>{!temDiferenca ? '✓ Caixa Geral 100% Batido' : apuracao.diferenca_caixa < 0 ? '⚠ Diferença Geral Negativa' : '⚠ Sobra Geral no Caixa'}</span>
            <span className="font-mono font-bold">
              {apuracao.diferenca_caixa === 0 ? 'R$ 0,00' : `${apuracao.diferenca_caixa > 0 ? '+' : ''}R$ ${apuracao.diferenca_caixa.toFixed(2)}`}
            </span>
          </div>

          {/* Relação dos PDVs Participantes */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              PDVs no Fechamento ({selectedPdvs.length}):
            </p>
            <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
              {selectedPdvs.map((p) => {
                const dinPdv = p.records.reduce((acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0), 0);
                const sobPdv = p.records.reduce((acc, r) => acc + (Number(r.qtd_total_retorno) || 0), 0);
                return (
                  <div key={p.local.id} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{p.local.nome}</span>
                    <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                      <span className="text-slate-400">{p.records.length} turnos</span>
                      <span className="text-amber-600 dark:text-amber-400">Sobra: {sobPdv} un</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Din: R$ {dinPdv.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {justificativa.trim() && (
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">Justificativa:</span>
              "{justificativa.trim()}"
            </div>
          )}
        </div>
      ),
      confirmText: 'Confirmar Fechamento Geral',
      cancelText: 'Revisar',
      variant: temDiferenca && apuracao.diferenca_caixa < 0 ? 'danger' : 'info',
    });

    if (!confirmou) return;

    setSalvando(true);

    try {
      const organizationId = selectedRecords[0]?.organization_id;
      const dataFechamento = selectedRecords[0]?.data;

      if (!organizationId || !dataFechamento) {
        throw new Error('Organização ou data não identificada nos registros selecionados.');
      }

      // Prepara o array de atualização atômica das remessas sem zerar dinheiro nem registros secundários
      const remessasUpdates = selectedRecords.map((r) => {
        const turnoCalc = turnosInput.find((t) => t.id === r.id);
        const itensAtualizados = (r.itens_grade || []).map((it) => {
          const itemCalc = turnoCalc?.itens_grade.find((gi) => gi.produto_id === it.produto_id);
          const ret =
            itemCalc?.qtd_retorno !== null && itemCalc?.qtd_retorno !== undefined
              ? Math.max(0, Number(itemCalc.qtd_retorno))
              : 0;
          return {
            ...it,
            qtd_retorno: ret,
          };
        });

        const totalRetorno = itensAtualizados.reduce(
          (acc, it) => acc + Number(it.qtd_retorno || 0),
          0
        );
        const fatCalculado = itensAtualizados.reduce((acc, it) => {
          const env = Number(it.qtd_sobra_anterior || 0) + Number(it.qtd_enviada || 0);
          const ret = Number(it.qtd_retorno || 0);
          const vend = Math.max(0, env - ret);
          return acc + vend * (Number(it.preco_unitario) || 0);
        }, 0);

        return {
          id: r.id,
          itens_grade: itensAtualizados,
          qtd_total_retorno: totalRetorno,
          faturamento_bruto_teorico: fatCalculado,
          faturamento_liquido_esperado: fatCalculado,
        };
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('fechar_pdvs_unificado', {
        p_organization_id: organizationId,
        p_data: dataFechamento,
        p_remessa_ids: selectedRecords.map((r) => r.id),
        p_pix_declarado: globalPix,
        p_cartao_debito_declarado: globalDebito,
        p_cartao_credito_declarado: globalCredito,
        p_outros_declarado: globalOutros,
        p_justificativa: justificativa.trim() || null,
        p_remessas_updates: remessasUpdates,
        p_taxas_operacionais: globalTaxas,
      });

      if (rpcError) throw rpcError;

      // Persistência das taxas operacionais no registro do fechamento geral
      if (rpcResult?.fechamento_id && globalTaxas > 0) {
        try {
          await supabase
            .from('fechamentos_unificados_pdv')
            .update({
              total_taxas_operacionais: globalTaxas,
              total_liquido_apos_taxas: apuracao.total_liquido_apos_taxas,
            })
            .eq('id', rpcResult.fechamento_id);
        } catch (e) {
          console.warn('Aguardando migração de total_taxas_operacionais:', e);
        }
      }

      toast({
        title: '⚡ Fechamento Unificado Concluído!',
        description: `${selectedPdvs.length} PDV(s) (${selectedRecords.length} turnos) fechados com sucesso. Registros preservados integralmente.`,
        variant: 'success',
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });

      const updatedRecords: RemessaKanban[] = selectedRecords.map((r) => {
        const updateData = remessasUpdates.find((u) => u.id === r.id);
        return {
          ...r,
          itens_grade: updateData?.itens_grade || r.itens_grade,
          qtd_total_retorno: updateData?.qtd_total_retorno ?? r.qtd_total_retorno,
          faturamento_bruto_teorico:
            updateData?.faturamento_bruto_teorico ?? r.faturamento_bruto_teorico,
          faturamento_liquido_esperado:
            updateData?.faturamento_liquido_esperado ?? r.faturamento_liquido_esperado,
          fechamento_unificado_id: rpcResult?.fechamento_id,
          tipo_fechamento: 'unificado',
          status: 'encerrado',
        };
      });

      onSave(updatedRecords);
    } catch (err: any) {
      console.error('Erro no Fechamento Unificado:', err);
      toast({ title: 'Erro ao Salvar Fechamento', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-300 dark:border-cyan-800 bg-background p-5 shadow-2xl space-y-4 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-600" /> Fechamento Unificado de PDVs
              </h3>
              <p className="text-xs font-medium text-text/60 mt-0.5">
                Apuração física de mercadorias e conciliação financeira de {allPdvs.length} PDVs (
                {selectedRecords.length} turnos)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Seleção de PDVs */}
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-cyan-950 dark:text-cyan-200 uppercase tracking-wide flex items-center gap-1.5">
                <Store className="h-4 w-4 text-cyan-600" /> PDVs Incluídos no Fechamento (
                {selectedPdvs.length} de {allPdvs.length}):
              </h4>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-extrabold text-cyan-700 dark:text-cyan-300 underline hover:text-cyan-900 cursor-pointer"
              >
                {selectedPdvIds.size === allPdvs.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {allPdvs.map(({ local, records }) => {
                const isSelected = selectedPdvIds.has(local.id);
                const dinPdv = records.reduce(
                  (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
                  0
                );

                return (
                  <label
                    key={local.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${isSelected
                        ? 'border-cyan-400 bg-white dark:bg-slate-900 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePdv(local.id)}
                        className="h-4 w-4 rounded-md border-cyan-400 text-cyan-600 focus:ring-cyan-500 accent-cyan-600 cursor-pointer shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-xs font-black uppercase text-cyan-950 dark:text-cyan-100 block truncate">
                          {local.nome}
                        </span>
                        <span className="text-[10px] text-text/50">
                          {records.length} {records.length === 1 ? 'turno' : 'turnos'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                      💵 R$ {dinPdv.toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Área A: Apuração Operacional de Mercadorias (Estoque & Vendas) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-background p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text/80 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-cyan-600" /> Área A: Apuração Operacional de
                  Mercadorias
                </h4>
                <p className="text-[11px] text-text/50 mt-0.5">
                  Conferência física das sobras dos PDVs selecionados. Zero é aceito como venda
                  total confirmada.
                </p>
              </div>
              <button
                type="button"
                onClick={handleZerarTodasSobras}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 shadow-xs transition-all active:scale-[0.97] cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> ⚡ Confirmar Vendeu Tudo (Sobras = 0)
              </button>
            </div>

            {/* Alerta de Pendências de Sobra */}
            {apuracao.tem_pendencias && (
              <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Existem produtos com conferência de sobras pendente. Digite a quantidade de sobra
                  ou clique no botão &quot;Confirmar Vendeu Tudo&quot; acima.
                </span>
              </div>
            )}

            {/* Tabela de Produtos */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-black text-text/70 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Preço</th>
                    <th className="p-2.5 text-center">Enviado</th>
                    <th className="p-2.5 text-center bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                      Sobra Fís. (Retorno Fábrica)
                    </th>
                    <th className="p-2.5 text-center">Vendido</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {apuracao.itens_consolidados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-xs text-text/40 font-sans font-medium"
                      >
                        Nenhum produto com carga enviada para os PDVs selecionados.
                      </td>
                    </tr>
                  ) : (
                    apuracao.itens_consolidados.map((item) => {
                      const remessasDoItem = selectedRecords.filter((r) => {
                        const it = (r.itens_grade || []).find(
                          (g) => g.produto_id === item.produto_id
                        );
                        const disp =
                          (Number(it?.qtd_enviada) || 0) + (Number(it?.qtd_sobra_anterior) || 0);
                        const ret = sobrasPorRemessa[r.id]?.[item.produto_id];
                        return disp > 0 || (ret !== null && ret !== undefined && ret > 0);
                      });

                      return (
                        <tr
                          key={item.produto_id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        >
                          <td className="p-2.5 font-sans font-bold text-text/90">{item.nome}</td>
                          <td className="p-2.5 text-center text-text/60">
                            R$ {item.preco_unitario.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center font-bold text-text/80">
                            {item.qtd_disponivel} un
                          </td>
                          <td className="p-2.5 bg-amber-50/40 dark:bg-amber-950/20">
                            {remessasDoItem.length <= 1 ? (
                              <div className="flex justify-center">
                                {(() => {
                                  const r = remessasDoItem[0] || selectedRecords[0];
                                  if (!r) return null;
                                  const it = (r.itens_grade || []).find(
                                    (g) => g.produto_id === item.produto_id
                                  );
                                  const disp =
                                    (Number(it?.qtd_enviada) || 0) +
                                    (Number(it?.qtd_sobra_anterior) || 0);
                                  const sobraVal = sobrasPorRemessa[r.id]?.[item.produto_id];
                                  const isPendente = sobraVal === null || sobraVal === undefined;

                                  return (
                                    <input
                                      type="number"
                                      min={0}
                                      max={disp}
                                      value={sobraVal ?? ''}
                                      placeholder="Pend."
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === ''
                                            ? 0
                                            : Math.max(0, Math.min(disp, Number(e.target.value)));
                                        setSobrasPorRemessa((prev) => ({
                                          ...prev,
                                          [r.id]: {
                                            ...(prev[r.id] || {}),
                                            [item.produto_id]: val,
                                          },
                                        }));
                                      }}
                                      className={`w-18 rounded-lg border px-2 py-1 text-center font-mono font-bold text-xs outline-none transition-all ${isPendente
                                          ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-700/60'
                                          : 'border-slate-300 dark:border-slate-700 bg-background text-text focus:border-cyan-500'
                                        }`}
                                    />
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {remessasDoItem.map((r) => {
                                  const pdvNome =
                                    r.locais?.nome ||
                                    allPdvs.find((p) => p.local.id === r.local_id)?.local.nome ||
                                    'PDV';
                                  const it = (r.itens_grade || []).find(
                                    (g) => g.produto_id === item.produto_id
                                  );
                                  const disp =
                                    (Number(it?.qtd_enviada) || 0) +
                                    (Number(it?.qtd_sobra_anterior) || 0);
                                  const sobraVal = sobrasPorRemessa[r.id]?.[item.produto_id];
                                  const isPendente = sobraVal === null || sobraVal === undefined;

                                  return (
                                    <div
                                      key={r.id}
                                      className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-900/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800"
                                    >
                                      <span
                                        className="text-[10px] text-text/70 font-semibold truncate max-w-[90px]"
                                        title={`${pdvNome} (${formatTurno(r.turno)})`}
                                      >
                                        {pdvNome.split(' ')[0]} ({disp}):
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={disp}
                                        value={sobraVal ?? ''}
                                        placeholder="Pend."
                                        onChange={(e) => {
                                          const val =
                                            e.target.value === ''
                                              ? 0
                                              : Math.max(0, Math.min(disp, Number(e.target.value)));
                                          setSobrasPorRemessa((prev) => ({
                                            ...prev,
                                            [r.id]: {
                                              ...(prev[r.id] || {}),
                                              [item.produto_id]: val,
                                            },
                                          }));
                                        }}
                                        className={`w-14 rounded-md border px-1.5 py-0.5 text-center font-mono font-bold text-xs outline-none transition-all ${isPendente
                                            ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-700/60'
                                            : 'border-slate-300 dark:border-slate-700 bg-background text-text focus:border-cyan-500'
                                          }`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                            {item.tem_pendencia_sobra ? '—' : `${item.qtd_vendida} un`}
                          </td>
                          <td className="p-2.5 text-right font-extrabold text-text/90">
                            {item.tem_pendencia_sobra
                              ? '—'
                              : `R$ ${item.faturamento_bruto.toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais do Estoque */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-text/50 font-bold block uppercase">
                  Enviado Fábrica
                </span>
                <span className="font-mono font-black text-sm text-text/90">
                  {apuracao.total_enviado_fabrica} un
                </span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-2 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block uppercase">
                  Sobras Físicas
                </span>
                <span className="font-mono font-black text-sm text-amber-700 dark:text-amber-300">
                  {apuracao.tem_pendencias
                    ? 'Pendências'
                    : `${apuracao.total_sobras_conferidas} un`}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-2 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block uppercase">
                  Vendido Estimado
                </span>
                <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                  {apuracao.tem_pendencias ? 'Aguardando Sobras' : `${apuracao.total_vendido} un`}
                </span>
              </div>
            </div>
          </div>

          {/* Área B: Conciliação Financeira Centralizada */}
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/30 dark:bg-cyan-950/20 p-4 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-950 dark:text-cyan-200 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-cyan-600" /> Área B: Conciliação Financeira dos
              Pagamentos
            </h4>

            {/* Dinheiro dos Turnos (Soma Automática - Read Only) */}
            <div className="bg-background rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 shadow-2xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-emerald-600" /> Dinheiro em Gaveta (Soma
                    Automática dos Turnos)
                  </span>
                  <p className="text-[10px] text-text/50">
                    Recuperado diretamente dos registros individuais informados pelos operadores dos
                    turnos.
                  </p>
                </div>
                <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400">
                  R$ {apuracao.total_dinheiro_turnos.toFixed(2)}
                </span>
              </div>

              {/* Botão de Expandir Turnos */}
              <button
                type="button"
                onClick={() => setMostrarDetalhesTurnos(!mostrarDetalhesTurnos)}
                className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
              >
                {mostrarDetalhesTurnos ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {mostrarDetalhesTurnos ? 'Ocultar Turnos' : 'Ver Composição em Dinheiro por Turno'}
              </button>

              {mostrarDetalhesTurnos && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedRecords.map((r) => {
                    const localPdv = allPdvs.find((p) => p.local.id === r.local_id)?.local;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900/60"
                      >
                        <span className="font-semibold text-text/80">
                          {localPdv?.nome || 'PDV'} — {formatTurno(r.turno)}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          R$ {Number(r.valor_dinheiro_gaveta || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inputs Digitais Consolidados (Extrato Geral) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-cyan-900 dark:text-cyan-200 uppercase tracking-wide block">
                Recebimentos Digitais Consolidados (Extrato Bancário / Maquininhas):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-background p-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800 shadow-2xs">
                  <label className="text-[10px] font-extrabold uppercase text-cyan-800 dark:text-cyan-300 flex items-center gap-1 mb-1">
                    <Smartphone className="h-3.5 w-3.5 text-cyan-600" /> Pix Consolidado
                  </label>
                  <BRLCurrencyInput
                    value={globalPix}
                    onChange={(val) => setGlobalPix(val)}
                    className="w-full text-xs font-mono font-bold"
                  />
                </div>

                <div className="bg-background p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                  <label className="text-[10px] font-extrabold uppercase text-indigo-800 dark:text-indigo-300 flex items-center gap-1 mb-1">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Cartão Débito
                  </label>
                  <BRLCurrencyInput
                    value={globalDebito}
                    onChange={(val) => setGlobalDebito(val)}
                    className="w-full text-xs font-mono font-bold"
                  />
                </div>

                <div className="bg-background p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 shadow-2xs">
                  <label className="text-[10px] font-extrabold uppercase text-purple-800 dark:text-purple-300 flex items-center gap-1 mb-1">
                    <CreditCard className="h-3.5 w-3.5 text-purple-600" /> Cartão Crédito
                  </label>
                  <BRLCurrencyInput
                    value={globalCredito}
                    onChange={(val) => setGlobalCredito(val)}
                    className="w-full text-xs font-mono font-bold"
                  />
                </div>

                <div className="bg-background p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <label className="text-[10px] font-extrabold uppercase text-text/70 flex items-center gap-1 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-text/60" /> Outros Recebimentos
                  </label>
                  <BRLCurrencyInput
                    value={globalOutros}
                    onChange={(val) => setGlobalOutros(val)}
                    className="w-full text-xs font-mono font-bold"
                  />
                </div>

                {/* Taxa Financeira Única em Reais (R$) */}
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 shadow-2xs sm:col-span-2 md:col-span-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-amber-600" /> Taxas das Operações /
                        Maquininha (R$)
                      </label>
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        Equivalente: {apuracao.taxa_percentual_formatada} sobre R${' '}
                        {(globalPix + globalDebito + globalCredito).toFixed(2)} digitais
                      </span>
                    </div>
                    <p className="text-[10px] text-text/60 mt-0.5">
                      Valor total único em Reais descontado pelas operadoras no dia (Pix + Cartões).
                      O percentual ao lado é apenas indicador visual somente leitura.
                    </p>
                  </div>
                  <div className="w-full sm:w-48">
                    <BRLCurrencyInput
                      value={globalTaxas}
                      onChange={(val) => setGlobalTaxas(Math.max(0, val))}
                      className="w-full text-xs font-mono font-black text-right border-amber-300 dark:border-amber-700 bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Área C: Balanço e Auditoria de Caixa */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-background shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text/80 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-cyan-600" /> Área C: Balanço do Caixa &
                Divergência
              </h4>
              <span className="text-[11px] font-mono font-semibold text-text/60">
                Total Bruto:{' '}
                <strong className="text-text/90">
                  R$ {apuracao.total_bruto_recebido.toFixed(2)}
                </strong>{' '}
                | Líquido:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  R$ {apuracao.total_liquido_apos_taxas.toFixed(2)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-text/50 font-bold block uppercase">
                  Vendas Líquidas
                </span>
                <span className="font-mono font-black text-sm text-text/90">
                  R$ {apuracao.faturamento_liquido_esperado.toFixed(2)}
                </span>
              </div>
              <div className="bg-cyan-50/50 dark:bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <span className="text-[10px] text-cyan-800 dark:text-cyan-300 font-bold block uppercase">
                  Total Bruto Recebido
                </span>
                <span className="font-mono font-black text-sm text-cyan-700 dark:text-cyan-300">
                  R$ {apuracao.total_bruto_recebido.toFixed(2)}
                </span>
              </div>
              <div className="bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block uppercase">
                  Taxas Financeiras
                </span>
                <span className="font-mono font-black text-sm text-amber-700 dark:text-amber-300">
                  -R$ {apuracao.total_taxas_operacionais.toFixed(2)}
                </span>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block uppercase">
                  Líquido após Taxas
                </span>
                <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                  R$ {apuracao.total_liquido_apos_taxas.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Status da Divergência */}
            {temDiferenca ? (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium animate-fade-in ${apuracao.diferenca_caixa < 0
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 shrink-0 mt-0.5 ${apuracao.diferenca_caixa < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>
                      {apuracao.diferenca_caixa < 0
                        ? '⚠️ Furo / Falta de Caixa Observada:'
                        : 'ℹ️ Sobra de Caixa Observada:'}
                    </span>
                    <span className="font-mono font-black text-sm">
                      {apuracao.diferenca_caixa < 0
                        ? `-R$ ${Math.abs(apuracao.diferenca_caixa).toFixed(2)}`
                        : `+R$ ${apuracao.diferenca_caixa.toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    O total recebido difere do faturamento das vendas. O sistema registrará este
                    valor para auditoria. A justificativa abaixo é obrigatória.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Caixas 100% Batidos! Vendas conferem exatamente com os valores declarados.
                  </span>
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300">
                  Diferença: R$ 0,00
                </span>
              </div>
            )}

            {/* Justificativa da Divergência */}
            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-text/80 uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-cyan-600" /> Justificativa / Motivo da
                  Divergência
                  {temDiferenca && <span className="text-rose-500 font-extrabold">*</span>}
                </span>
                <span className="text-[10px] font-normal text-text/50">
                  {temDiferenca ? '(Obrigatório para registrar)' : '(Opcional)'}
                </span>
              </label>

              {/* Botões de Atalho */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) =>
                      prev ? `${prev}, Perda/Quebra de Produto` : 'Perda/Quebra de Produto'
                    )
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text/80 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  🍌 Perda/Quebra
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) =>
                      prev ? `${prev}, Doação/Degustação` : 'Doação/Degustação'
                    )
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text/80 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  🎁 Doação/Degustação
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) =>
                      prev ? `${prev}, Consumo Interno` : 'Consumo Interno'
                    )
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text/80 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  ☕ Consumo Interno
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) => (prev ? `${prev}, Erro de Troco` : 'Erro de Troco'))
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text/80 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  💵 Erro de Troco
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJustificativa((prev) =>
                      prev ? `${prev}, Diferença de Taxa POS` : 'Diferença de Taxa POS'
                    )
                  }
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text/80 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  💳 Diferença Taxa POS
                </button>
              </div>

              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder={
                  temDiferenca
                    ? 'Descreva o motivo da diferença (ex: 2 bolos avariados na vitrine, erro de troco em dinheiro, taxas bancárias...)'
                    : 'Observações adicionais sobre este fechamento (opcional)...'
                }
                rows={2}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-background p-2.5 text-xs text-text focus:border-cyan-500 focus:outline-hidden transition-all placeholder:text-text/40"
              />
            </div>
          </div>

          {/* Botões Finais */}
          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarUnificacao}
              disabled={
                salvando ||
                selectedPdvs.length === 0 ||
                apuracao.tem_pendencias ||
                (temDiferenca && !justificativa.trim())
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.97] cursor-pointer"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Concluindo Fechamento...
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5" /> Concluir Fechamento Unificado (
                  {selectedPdvs.length} PDVs)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

// ─── Modal Fechamento Unificado PDV (Múltiplos Turnos do Mesmo PDV) ───────────

function FechamentoUnificadoPDVModal({
  local,
  records,
  produtosBase,
  onClose,
  onSave,
}: {
  local: LocalPDV;
  records: RemessaKanban[];
  produtosBase: ProdutoItem[];
  onClose: () => void;
  onSave: (updated: RemessaKanban[]) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const pdvNome = local.nome || 'PDV';
  const [salvando, setSalvando] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  // Soma automática do dinheiro físico dos turnos deste PDV
  const dinheiroTotalTurnos = useMemo(
    () => records.reduce((acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0), 0),
    [records]
  );

  const initialPixSum = records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
  const initialCartaoSum = records.reduce(
    (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
    0
  );

  const [valorPix, setValorPix] = useState<number>(initialPixSum);
  const [valorCartao, setValorCartao] = useState<number>(initialCartaoSum);
  const initialTaxaSum = records.reduce((acc, r) => acc + (Number(r.taxa_cartao_reais) || 0), 0);
  const [valorTaxas, setValorTaxas] = useState<number>(initialTaxaSum);
  const [mostrarDetalhesTurnos, setMostrarDetalhesTurnos] = useState(false);

  // Mapeamento de Sobras por Turno: Record<remessa_id, Record<produto_id, number | null>>
  // Regra Larissa Saba: a sobra NUNCA é distribuída. Cada turno retorna fisicamente à fábrica.
  const [sobrasPorTurno, setSobrasPorTurno] = useState<
    Record<string, Record<string, number | null>>
  >(() => {
    const map: Record<string, Record<string, number | null>> = {};
    records.forEach((r) => {
      map[r.id] = {};
      (r.itens_grade || []).forEach((it) => {
        const disp = (Number(it.qtd_enviada) || 0) + (Number(it.qtd_sobra_anterior) || 0);
        if (disp <= 0 && (!it.qtd_retorno || Number(it.qtd_retorno) <= 0)) {
          map[r.id][it.produto_id] = 0;
          return;
        }
        if (
          it.qtd_retorno !== null &&
          it.qtd_retorno !== undefined &&
          !isNaN(Number(it.qtd_retorno))
        ) {
          map[r.id][it.produto_id] = Number(it.qtd_retorno);
        } else {
          map[r.id][it.produto_id] = 0;
        }
      });
    });
    return map;
  });

  const handleZerarSobras = () => {
    setSobrasPorTurno((prev) => {
      const next: Record<string, Record<string, number | null>> = {};
      records.forEach((r) => {
        next[r.id] = { ...(prev[r.id] || {}) };
        (r.itens_grade || []).forEach((it) => {
          next[r.id][it.produto_id] = 0;
        });
      });
      return next;
    });
    toast({
      title: 'Vendeu tudo nos turnos!',
      description: 'Todas as sobras confirmadas como zero para este PDV.',
      variant: 'info',
    });
  };

  // Monta TurnoFechamentoInput[] para apuração oficial
  // Cada turno preserva seus itens e seu retorno físico autêntico à fábrica
  const turnosInput: TurnoFechamentoInput[] = useMemo(() => {
    return records.map((r) => {
      const itensInput: ItemMovimentacaoPDV[] = (r.itens_grade || []).map((it) => {
        const ret = sobrasPorTurno[r.id]?.[it.produto_id];
        return {
          produto_id: it.produto_id,
          nome: it.nome,
          preco_unitario: Number(it.preco_unitario || 0),
          qtd_estoque_inicial: Number(it.qtd_sobra_anterior || 0),
          qtd_enviada: Number(it.qtd_enviada || 0),
          qtd_retorno: ret !== undefined ? ret : null,
        };
      });

      return {
        id: r.id,
        local_id: local.id,
        pdv_nome: pdvNome,
        data: r.data,
        turno: r.turno,
        status: r.status,
        valor_dinheiro_gaveta: Number(r.valor_dinheiro_gaveta || 0),
        itens_grade: itensInput,
      };
    });
  }, [records, local.id, pdvNome, sobrasPorTurno]);

  const apuracao = useMemo(() => {
    return apurarFechamentoUnificado(turnosInput, {
      pix: valorPix,
      cartao_debito: 0,
      cartao_credito: valorCartao,
      taxas_operacionais: valorTaxas,
    });
  }, [turnosInput, valorPix, valorCartao, valorTaxas]);

  const temDiferenca = Math.abs(apuracao.diferenca_caixa) > 0.05;

  const handleSalvarFechamento = async () => {
    if (apuracao.tem_pendencias) {
      toast({
        title: 'Sobras Pendentes',
        description: 'Informe as sobras de todos os produtos ou confirme que vendeu tudo.',
        variant: 'warning',
      });
      return;
    }

    if (temDiferenca && !justificativa.trim()) {
      toast({
        title: 'Informe a Justificativa',
        description: `Existe uma diferença de R$ ${Math.abs(apuracao.diferenca_caixa).toFixed(2)}. Por favor informe a justificativa.`,
        variant: 'warning',
      });
      return;
    }

    const confirmou = await confirmDialog.confirm({
      title: `Fechamento Unificado — ${pdvNome}`,
      size: 'md',
      message: (
        <div className="space-y-3 text-left">
          {/* Header com badges */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PDV</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block">{pdvNome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Turnos Unificados</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {records.length} {records.length === 1 ? 'Turno' : 'Turnos'} ({records.map(r => formatTurno(r.turno)).join(', ')})
              </span>
            </div>
          </div>

          {/* Cards de Métricas de Vendas e Sobras */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Vendas Líquidas</span>
              <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                R$ {apuracao.faturamento_liquido_esperado.toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold block">Sobras Físicas</span>
              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400 text-xs">
                {apuracao.total_sobras_conferidas} un
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 uppercase font-bold block">Itens Vendidos</span>
              <span className="font-mono font-extrabold text-cyan-700 dark:text-cyan-400 text-xs">
                {apuracao.total_vendido} un
              </span>
            </div>
          </div>

          {/* Card Financeiro Escuro com Valores Lançados */}
          <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro Físico Turnos:</span>
              <span className="font-mono font-bold text-emerald-400">R$ {dinheiroTotalTurnos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-purple-400" /> Pix Declarado:</span>
              <span className="font-mono font-bold text-purple-300">R$ {valorPix.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> Cartão Declarado:</span>
              <span className="font-mono font-bold text-cyan-300">R$ {valorCartao.toFixed(2)}</span>
            </div>
            {apuracao.total_taxas_operacionais > 0 && (
              <div className="flex justify-between items-center text-amber-300 border-t border-slate-800 pt-1">
                <span>Taxas das Operações:</span>
                <span className="font-mono font-bold">-R$ {apuracao.total_taxas_operacionais.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 text-white font-extrabold">
              <span>Total Líquido após Taxas:</span>
              <span className="font-mono text-emerald-400 text-sm">R$ {apuracao.total_liquido_apos_taxas.toFixed(2)}</span>
            </div>
          </div>

          {/* Status de Caixa / Alerta de Diferença */}
          <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${!temDiferenca
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : apuracao.diferenca_caixa < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
            <span>{!temDiferenca ? '✓ Caixa Batido' : apuracao.diferenca_caixa < 0 ? '⚠ Sobra Negativa / Quebra de Caixa' : '⚠ Sobra Positiva no Caixa'}</span>
            <span className="font-mono font-bold">
              {apuracao.diferenca_caixa === 0 ? 'R$ 0,00' : `${apuracao.diferenca_caixa > 0 ? '+' : ''}R$ ${apuracao.diferenca_caixa.toFixed(2)}`}
            </span>
          </div>

          {justificativa.trim() && (
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">Justificativa:</span>
              "{justificativa.trim()}"
            </div>
          )}
        </div>
      ),
      confirmText: 'Confirmar Fechamento',
      cancelText: 'Revisar',
      variant: temDiferenca && apuracao.diferenca_caixa < 0 ? 'danger' : 'info',
    });

    if (!confirmou) return;

    setSalvando(true);

    try {
      const organizationId = records[0]?.organization_id;
      const dataFechamento = records[0]?.data;

      // Atualizações atômicas das remessas do PDV sem zerar registros
      const remessasUpdates = records.map((r) => {
        const turnoCalc = turnosInput.find((t) => t.id === r.id);
        const itensAtualizados = (r.itens_grade || []).map((it) => {
          const itemCalc = turnoCalc?.itens_grade.find((gi) => gi.produto_id === it.produto_id);
          const ret =
            itemCalc?.qtd_retorno !== null && itemCalc?.qtd_retorno !== undefined
              ? Math.max(0, Number(itemCalc.qtd_retorno))
              : 0;
          return {
            ...it,
            qtd_retorno: ret,
          };
        });

        const totalRetorno = itensAtualizados.reduce(
          (acc, it) => acc + Number(it.qtd_retorno || 0),
          0
        );
        const fatCalculado = itensAtualizados.reduce((acc, it) => {
          const env = Number(it.qtd_sobra_anterior || 0) + Number(it.qtd_enviada || 0);
          const ret = Number(it.qtd_retorno || 0);
          const vend = Math.max(0, env - ret);
          return acc + vend * (Number(it.preco_unitario) || 0);
        }, 0);

        return {
          id: r.id,
          itens_grade: itensAtualizados,
          qtd_total_retorno: totalRetorno,
          faturamento_bruto_teorico: fatCalculado,
          faturamento_liquido_esperado: fatCalculado,
        };
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('fechar_pdvs_unificado', {
        p_organization_id: organizationId,
        p_data: dataFechamento,
        p_remessa_ids: records.map((r) => r.id),
        p_pix_declarado: valorPix,
        p_cartao_debito_declarado: 0,
        p_cartao_credito_declarado: valorCartao,
        p_outros_declarado: 0,
        p_justificativa: justificativa.trim() || null,
        p_remessas_updates: remessasUpdates,
        p_taxas_operacionais: valorTaxas,
      });

      if (rpcError) throw rpcError;

      // Persistência das taxas operacionais no registro do fechamento geral
      if (rpcResult?.fechamento_id && valorTaxas > 0) {
        try {
          await supabase
            .from('fechamentos_unificados_pdv')
            .update({
              total_taxas_operacionais: valorTaxas,
              total_liquido_apos_taxas: apuracao.total_liquido_apos_taxas,
            })
            .eq('id', rpcResult.fechamento_id);
        } catch (e) {
          console.warn('Aguardando migração de total_taxas_operacionais:', e);
        }
      }

      toast({
        title: 'Fechamento Unificado Concluído! ⚡',
        description: `PDV ${pdvNome} encerrado com sucesso. Registros preservados.`,
        variant: 'success',
      });

      confetti({ particleCount: 60, spread: 50 });

      const updatedRecords: RemessaKanban[] = records.map((r) => ({
        ...r,
        fechamento_unificado_id: rpcResult?.fechamento_id,
        tipo_fechamento: 'unificado',
        status: 'encerrado',
      }));

      onSave(updatedRecords);
    } catch (err: any) {
      console.error('Erro ao fechar turnos unificados:', err);
      toast({ title: 'Erro ao Salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-300 dark:border-cyan-800 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-600" /> Fechamento Unificado — {pdvNome}
              </h3>
              <p className="text-[11px] font-medium text-text/50 mt-0.5">
                Agrupando {records.length} turno(s) do mesmo PDV com preservação dos registros
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Accordion de Turnos */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMostrarDetalhesTurnos(!mostrarDetalhesTurnos)}
              className="flex items-center justify-between w-full rounded-xl bg-cyan-100/70 dark:bg-cyan-950/60 p-2.5 text-xs font-bold text-cyan-900 dark:text-cyan-100 hover:bg-cyan-200/70 dark:hover:bg-cyan-900 transition-colors border border-cyan-200 dark:border-cyan-800"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>Ver Dinheiro de Cada Turno ({records.length})</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-extrabold text-cyan-700 dark:text-cyan-300">
                {mostrarDetalhesTurnos ? 'Ocultar' : 'Ver Detalhes'}
                {mostrarDetalhesTurnos ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>

            {mostrarDetalhesTurnos && (
              <div className="space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-primary/10"
                  >
                    <span className="font-semibold text-text/80">{formatTurno(r.turno)}</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      R$ {Number(r.valor_dinheiro_gaveta || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleZerarSobras}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" /> Vendeu Tudo nos Turnos (Sobra Zero)
          </button>

          {/* Lista de Sobras */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {apuracao.itens_consolidados.length === 0 ? (
              <div className="text-center py-4 text-xs text-text/40 font-medium">
                Nenhum produto com carga enviada para este PDV.
              </div>
            ) : (
              apuracao.itens_consolidados.map((item) => {
                const turnosDoItem = records.filter((r) => {
                  const it = (r.itens_grade || []).find((g) => g.produto_id === item.produto_id);
                  const disp =
                    (Number(it?.qtd_enviada) || 0) + (Number(it?.qtd_sobra_anterior) || 0);
                  const ret = sobrasPorTurno[r.id]?.[item.produto_id];
                  return disp > 0 || (ret !== null && ret !== undefined && ret > 0);
                });

                return (
                  <div
                    key={item.produto_id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text/80 truncate">{item.nome}</p>
                      <p className="text-[10px] text-text/40">
                        Total Disp.:{' '}
                        <span className="font-mono font-bold text-text/70">
                          {item.qtd_disponivel} un
                        </span>{' '}
                        | Vendido:{' '}
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.tem_pendencia_sobra ? '—' : `${item.qtd_vendida} un`}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {turnosDoItem.length <= 1 ? (
                        (() => {
                          const r = turnosDoItem[0] || records[0];
                          if (!r) return null;
                          const it = (r.itens_grade || []).find(
                            (g) => g.produto_id === item.produto_id
                          );
                          const disp =
                            (Number(it?.qtd_enviada) || 0) + (Number(it?.qtd_sobra_anterior) || 0);
                          const sobraVal = sobrasPorTurno[r.id]?.[item.produto_id];
                          const isPendente = sobraVal === null || sobraVal === undefined;

                          return (
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                                Sobra:
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={disp}
                                value={sobraVal ?? ''}
                                placeholder="Pend."
                                onChange={(e) => {
                                  const val =
                                    e.target.value === ''
                                      ? 0
                                      : Math.max(0, Math.min(disp, Number(e.target.value)));
                                  setSobrasPorTurno((prev) => ({
                                    ...prev,
                                    [r.id]: {
                                      ...(prev[r.id] || {}),
                                      [item.produto_id]: val,
                                    },
                                  }));
                                }}
                                className={`w-18 rounded-lg border px-2 py-1 text-center font-mono font-bold text-xs outline-none ${isPendente
                                    ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-700/60'
                                    : 'border-slate-300 dark:border-slate-700 bg-background text-text'
                                  }`}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col gap-1">
                          {turnosDoItem.map((r) => {
                            const turnoNome = formatTurno(r.turno);
                            const it = (r.itens_grade || []).find(
                              (g) => g.produto_id === item.produto_id
                            );
                            const disp =
                              (Number(it?.qtd_enviada) || 0) +
                              (Number(it?.qtd_sobra_anterior) || 0);
                            const sobraVal = sobrasPorTurno[r.id]?.[item.produto_id];
                            const isPendente = sobraVal === null || sobraVal === undefined;

                            return (
                              <div
                                key={r.id}
                                className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-900/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800"
                              >
                                <span className="text-[10px] text-text/70 font-semibold truncate max-w-[80px]">
                                  {turnoNome} ({disp}):
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={disp}
                                  value={sobraVal ?? ''}
                                  placeholder="Pend."
                                  onChange={(e) => {
                                    const val =
                                      e.target.value === ''
                                        ? 0
                                        : Math.max(0, Math.min(disp, Number(e.target.value)));
                                    setSobrasPorTurno((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        ...(prev[r.id] || {}),
                                        [item.produto_id]: val,
                                      },
                                    }));
                                  }}
                                  className={`w-14 rounded border px-1 py-0.5 text-center font-mono font-bold text-xs outline-none ${isPendente
                                      ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-700/60'
                                      : 'border-slate-300 dark:border-slate-700 bg-background text-text'
                                    }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Lançamento dos Valores */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text/70 flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-emerald-600" /> Valores do Fechamento
            </h4>

            {/* Dinheiro (Read Only) */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                  Dinheiro Somado dos Turnos
                </span>
                <span className="text-[10px] text-text/50">Recuperado automaticamente</span>
              </div>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                R$ {dinheiroTotalTurnos.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                  <Smartphone className="h-3.5 w-3.5" /> Pix (R$)
                </label>
                <BRLCurrencyInput
                  value={valorPix}
                  onChange={(val) => setValorPix(val)}
                  className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-background px-3 py-2 font-mono text-sm font-bold text-text outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 mb-1">
                  <CreditCard className="h-3.5 w-3.5" /> Cartão (R$)
                </label>
                <BRLCurrencyInput
                  value={valorCartao}
                  onChange={(val) => setValorCartao(val)}
                  className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-background px-3 py-2 font-mono text-sm font-bold text-text outline-none"
                />
              </div>
            </div>

            {/* Taxa Financeira Única em Reais (R$) */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-600" /> Taxas das Operações (R$)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    Equivalente: {apuracao.taxa_percentual_formatada} sobre R${' '}
                    {(valorPix + valorCartao).toFixed(2)} digitais
                  </span>
                </div>
                <p className="text-[10px] text-text/60 mt-0.5">
                  Total único em Reais descontado pelas operadoras no dia (indicador percentual somente leitura)
                </p>
              </div>
              <div className="w-36">
                <BRLCurrencyInput
                  value={valorTaxas}
                  onChange={(val) => setValorTaxas(Math.max(0, val))}
                  className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-background px-2.5 py-1.5 font-mono text-xs font-black text-right outline-none"
                />
              </div>
            </div>

            {/* Balanço */}
            <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Vendas Líquidas Apuradas:</span>
                <span className="font-mono font-bold text-white">
                  R$ {apuracao.faturamento_liquido_esperado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Total Bruto Recebido:</span>
                <span className="font-mono font-bold text-cyan-300">
                  R$ {apuracao.total_bruto_recebido.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Taxas Operacionais:</span>
                <span className="font-mono font-bold text-amber-400">
                  -R$ {apuracao.total_taxas_operacionais.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Líquido após Taxas:</span>
                <span className="font-mono font-bold text-emerald-400">
                  R$ {apuracao.total_liquido_apos_taxas.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-800 pt-1">
                <span
                  className={apuracao.diferenca_caixa < 0 ? 'text-rose-400' : 'text-emerald-400'}
                >
                  Diferença Comercial:
                </span>
                <span
                  className={`font-mono ${apuracao.diferenca_caixa < 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                >
                  {apuracao.diferenca_caixa < 0
                    ? `-R$ ${Math.abs(apuracao.diferenca_caixa).toFixed(2)}`
                    : `+R$ ${apuracao.diferenca_caixa.toFixed(2)}`}
                </span>
              </div>
            </div>

            {temDiferenca && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                  Justificativa da Divergência *
                </label>
                <input
                  type="text"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Motivo da diferença de caixa..."
                  className="w-full rounded-lg border border-rose-300 dark:border-rose-700 bg-background p-2 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-text/70 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarFechamento}
              disabled={
                salvando || apuracao.tem_pendencias || (temDiferenca && !justificativa.trim())
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.97] cursor-pointer"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Concluindo...
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5" /> Concluir Fechamento
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        size={confirmDialog.options.size}
      />
    </>
  );
}

// ─── Modal Confirmar Reabertura ou Visualizar Auditoria ─────────────────────

function ConfirmarReaberturaModal({
  target,
  fechamentoUnificado,
  onVisualizar,
  onConfirmarReabertura,
  onClose,
}: {
  target: {
    localNome: string;
    records: RemessaKanban[];
    isGeral: boolean;
  };
  fechamentoUnificado?: any;
  onVisualizar: () => void;
  onConfirmarReabertura: () => void;
  onClose: () => void;
}) {
  const totalTurnos = target.records.length;
  const isUnificado =
    target.records.some(
      (r) => r.tipo_fechamento === 'unificado' || Boolean(r.fechamento_unificado_id)
    ) || Boolean(fechamentoUnificado);

  const dinheiro = target.records.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );
  const pix =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_pix_declarado || 0)
      : target.records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
  const cartao =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_cartao_debito_declarado || 0) +
      Number(fechamentoUnificado.total_cartao_credito_declarado || 0) +
      Number(fechamentoUnificado.total_outros_declarado || 0)
      : target.records.reduce((acc, r) => acc + (Number(r.valor_cartao_declarado) || 0), 0);
  const taxaReais =
    isUnificado && fechamentoUnificado
      ? Number(fechamentoUnificado.total_taxas_operacionais || 0)
      : target.records.reduce((acc, r) => acc + (Number(r.taxa_cartao_reais) || 0), 0);
  const faturamento = target.records.reduce((acc, r) => {
    return (
      acc + (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0)
    );
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-amber-300 dark:border-amber-700 bg-background p-5 shadow-2xl space-y-4 animate-scale-up">
        {/* Header com Alerta */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-text">
              Fechamento Auditado
            </h3>
            <p className="text-xs text-text/60 mt-0.5">
              {target.isGeral
                ? 'Todos os PDVs deste dia já estão auditados e finalizados.'
                : `O fechamento de ${target.localNome} já está homologado.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text/40 hover:text-text p-1 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo da Situação Atual */}
        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-2 text-white">
          <div className="flex justify-between items-center text-slate-300 pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-200 truncate pr-2">
              {target.localNome} ({totalTurnos} turno{totalTurnos > 1 ? 's' : ''})
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Auditado
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div className="text-slate-300">
              <span className="block text-[10px] text-slate-400">Faturamento:</span>
              <span className="font-mono font-bold text-white">R$ {faturamento.toFixed(2)}</span>
            </div>
            <div className="text-slate-300">
              <span className="block text-[10px] text-slate-400">Dinheiro Gaveta:</span>
              <span className="font-mono font-bold text-emerald-400">R$ {dinheiro.toFixed(2)}</span>
            </div>
            <div className="text-slate-300">
              <span className="block text-[10px] text-slate-400">Pix Conferido:</span>
              <span className="font-mono font-bold text-purple-400">R$ {pix.toFixed(2)}</span>
            </div>
            <div className="text-slate-300">
              <span className="block text-[10px] text-slate-400">Cartão Conferido:</span>
              <span className="font-mono font-bold text-cyan-400">R$ {cartao.toFixed(2)}</span>
            </div>
          </div>
          {taxaReais > 0 && (
            <div className="flex justify-between text-[11px] text-amber-300 border-t border-slate-800 pt-1 font-semibold">
              <span>Taxas Operacionais:</span>
              <span className="font-mono">-R$ {taxaReais.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Pergunta de Decisão */}
        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
          <p className="font-bold">O que você deseja fazer?</p>
          <p className="text-[11px] text-text/70 mt-1">
            Você pode <strong>abrir para visualizar todos os detalhes</strong> do que foi auditado sem alterar nada, ou <strong>confirmar a reabertura</strong> para editar e retificar lançamentos.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2 pt-1">
          {/* Opção 1: Visualizar sem alterar */}
          <button
            type="button"
            onClick={onVisualizar}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            👁️ Apenas Visualizar Fechamento Auditado
          </button>

          {/* Opção 2: Confirmar reabertura */}
          <button
            type="button"
            onClick={onConfirmarReabertura}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Unlock className="h-4 w-4" />
            🔓 Confirmar Reabertura para Edição
          </button>

          {/* Cancelar */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-primary/20 bg-primary/5 py-2 text-xs font-semibold text-text/70 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PDVKanbanView({
  locais,
  produtosBase,
  profile,
  dataAcerto,
  onDataChange,
}: PDVKanbanViewProps) {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<RemessaKanban[]>([]);
  const [fechamentosUnificados, setFechamentosUnificados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sobrasAnteriores, setSobrasAnteriores] = useState<ItemGradeKanban[] | null>(null);
  const [viewMode, setViewMode] = useState<'scroll' | 'grid'>('scroll');
  const confirmDialog = useConfirm();

  // Modal states
  const [modalSobras, setModalSobras] = useState<RemessaKanban | null>(null);
  const [modalPixCartao, setModalPixCartao] = useState<RemessaKanban | null>(null);
  const [modalUnificarPDV, setModalUnificarPDV] = useState<{
    local: LocalPDV;
    records: RemessaKanban[];
  } | null>(null);
  const [modalUnificarTodos, setModalUnificarTodos] = useState(false);
  const [modalNovoEnvio, setModalNovoEnvio] = useState(false);
  const [selectedLocalEnvio, setSelectedLocalEnvio] = useState<string | null>(null);
  const [modalRomaneio, setModalRomaneio] = useState<RemessaKanban | null>(null);
  const [modalAuditoriaPDV, setModalAuditoriaPDV] = useState<{
    local: LocalPDV;
    records: RemessaKanban[];
  } | null>(null);
  const [modalAuditarTodos, setModalAuditarTodos] = useState(false);
  const [modalReabrirAuditoria, setModalReabrirAuditoria] = useState<{
    localNome: string;
    records: RemessaKanban[];
    isGeral: boolean;
  } | null>(null);
  const [confirmarReaberturaTarget, setConfirmarReaberturaTarget] = useState<{
    localNome: string;
    records: RemessaKanban[];
    isGeral: boolean;
  } | null>(null);
  const [modalReciboData, setModalReciboData] = useState<ReciboRegistroData | null>(null);

  // Fetch registros for the selected date
  const carregarRegistros = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('remessas_cargas_pdv')
        .select('*, locais:local_id(nome, logo_url)')
        .eq('organization_id', profile.organization_id)
        .eq('data', dataAcerto)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRegistros((data || []) as RemessaKanban[]);

      // Carrega fechamentos unificados do dia para obter dados financeiros consolidados (Pix, Cartão, Taxas)
      const { data: fechamentosData, error: fechError } = await supabase
        .from('fechamentos_unificados_pdv')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('data', dataAcerto)
        .order('created_at', { ascending: false });

      if (!fechError && fechamentosData) {
        setFechamentosUnificados(fechamentosData);
      } else {
        setFechamentosUnificados([]);
      }

      const { data: prevData } = await supabase
        .from('remessas_cargas_pdv')
        .select('itens_grade, turno, data')
        .eq('organization_id', profile.organization_id)
        .lte('data', dataAcerto)
        .in('status', [
          'encerrado',
          'auditado',
          'conferido',
          'dinheiro_informado',
          'sobras_informadas',
        ])
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (prevData && prevData.length > 0) {
        const latestWithSobras = prevData.find(
          (r) =>
            Array.isArray(r.itens_grade) &&
            r.itens_grade.some((it: any) => Number(it.qtd_retorno || 0) > 0)
        );
        if (latestWithSobras) {
          setSobrasAnteriores(latestWithSobras.itens_grade as ItemGradeKanban[]);
        } else {
          setSobrasAnteriores(null);
        }
      } else {
        setSobrasAnteriores(null);
      }
    } catch (err: any) {
      console.error('Erro ao carregar registros Kanban:', err);
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, dataAcerto]);

  const handleDeleteCarga = async (id: string, pdvNome: string) => {
    const isConfirmed = await confirmDialog.confirm({
      title: 'Excluir Envio',
      message: `Tem certeza que deseja excluir o envio para ${pdvNome}? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('remessas_cargas_pdv').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Carga Excluída', variant: 'success' });
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'error' });
    }
  };

  const handleRevertToEmVenda = async (id: string, pdvNome: string) => {
    const isConfirmed = await confirmDialog.confirm({
      title: 'Retornar Carga',
      message: `Tem certeza que deseja retornar a carga de ${pdvNome} para "Em Venda no PDV"? Todos os valores de sobras e dinheiro informados serão reiniciados.`,
      confirmText: 'Retornar',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      const registroAtual = registros.find((r) => r.id === id);
      const itensResetados = (registroAtual?.itens_grade || []).map((it) => ({
        ...it,
        qtd_retorno: null,
      }));

      const payloadReset = {
        status: 'aberto',
        valor_dinheiro_gaveta: 0,
        valor_pix_declarado: 0,
        valor_cartao_declarado: 0,
        fechamento_unificado_id: null,
        qtd_total_retorno: 0,
        faturamento_bruto_teorico: 0,
        faturamento_liquido_esperado: 0,
        pix_cartao_esperado: 0,
        diferenca_auditoria: 0,
        itens_grade: itensResetados,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update(payloadReset)
        .eq('id', id);
      if (error) throw error;
      toast({
        title: 'Retornado para Em Venda',
        description: `Carga de ${pdvNome} retornada. Sobras e valores em dinheiro foram zerados.`,
        variant: 'success',
      });
      setRegistros((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...payloadReset } : r))
      );
    } catch (e: any) {
      toast({ title: 'Erro ao retornar', description: e.message, variant: 'error' });
    }
  };

  const handleReverterAguardandoAuditoria = async (records: RemessaKanban[], pdvNome: string) => {
    const isConfirmed = await confirmDialog.confirm({
      title: 'Retornar Fechamento',
      message: `Tem certeza que deseja retornar o fechamento de ${pdvNome} para "Sobras & Caixa"? O status voltará para a etapa de lançamentos (Coluna 3) para permitir correções de dinheiro, Pix e Cartão.`,
      confirmText: 'Retornar para Sobras & Caixa',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      const payloadRevert = {
        status: 'sobras_informadas',
        updated_at: new Date().toISOString(),
      };

      for (const r of records) {
        const { error } = await supabase
          .from('remessas_cargas_pdv')
          .update(payloadRevert)
          .eq('id', r.id);
        if (error) throw error;
      }

      toast({
        title: 'Retornado para Sobras & Caixa',
        description: `O fechamento de ${pdvNome} retornou para a etapa de lançamentos.`,
        variant: 'success',
      });

      handleRegistroUpdated(records.map((r) => ({ ...r, ...payloadRevert })));
    } catch (e: any) {
      toast({ title: 'Erro ao retornar', description: e.message, variant: 'error' });
    }
  };

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  // Garante que qualquer local que possua remessa hoje seja considerado no Kanban
  const locaisCompletos = useMemo(() => {
    const mapa = new Map<string, LocalPDV>(locais.map((loc) => [loc.id, loc]));
    registros.forEach((r) => {
      if (r.local_id && !mapa.has(r.local_id)) {
        mapa.set(r.local_id, {
          id: r.local_id,
          nome: r.locais?.nome || 'PDV / Fábrica',
          logo_url: r.locais?.logo_url,
        });
      }
    });
    return Array.from(mapa.values());
  }, [locais, registros]);

  // PDVs que ainda não tiveram carga enviada para a data selecionada (exclui locais administrativos de produção sem carga pendente)
  const pdvsAguardandoCarga = useMemo(() => {
    return locais.filter(
      (loc) =>
        !registros.some((r) => r.local_id === loc.id) &&
        !String(loc.nome || '').toLowerCase().includes('fábrica') &&
        !String(loc.nome || '').toLowerCase().includes('fabrica')
    );
  }, [locais, registros]);

  // Distribute registros into columns
  const colAberto = registros.filter((r) => r.status === 'aberto');
  const colParcial = registros.filter(
    (r) => r.status === 'dinheiro_informado' || r.status === 'sobras_informadas'
  );

  // Apenas registros com status 'auditado', 'conferido' ou 'concluido' representam dados reais consolidados do dia
  const registrosAuditados = useMemo(
    () =>
      registros.filter(
        (r) => r.status === 'auditado' || r.status === 'conferido' || r.status === 'concluido'
      ),
    [registros]
  );

  // KPIs
  const totalEnviadoKanban = registros.reduce(
    (acc, r) => acc + (Number(r.qtd_total_enviada) || 0),
    0
  );
  const totalSobrasAuditadasKanban = registrosAuditados.reduce((acc, r) => {
    return acc + (Number(r.qtd_total_retorno) || 0);
  }, 0);
  const totalVendidoKanban = registrosAuditados.reduce((acc, r) => {
    const env = Number(r.qtd_total_enviada) || 0;
    const ret = Number(r.qtd_total_retorno) || 0;
    return acc + Math.max(0, env - ret);
  }, 0);
  const totalDinheiroKanban = registrosAuditados.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );
  const totalFaturamentoKanban = registrosAuditados.reduce((acc, r) => {
    const fat =
      Number(r.faturamento_liquido_esperado) ||
      (Number(r.valor_dinheiro_gaveta) || 0) +
      (Number(r.valor_pix_declarado) || 0) +
      (Number(r.valor_cartao_declarado) || 0) ||
      Number(r.faturamento_bruto_teorico) ||
      0;
    return acc + fat;
  }, 0);

  // Handle updates from modals
  const handleRegistroUpdated = (updated: RemessaKanban | RemessaKanban[]) => {
    setRegistros((prev) => {
      const isArray = Array.isArray(updated);
      const updates = isArray ? updated : [updated];
      const updateIds = new Set(updates.map((u) => u.id));

      const newPrev = prev.filter((r) => !updateIds.has(r.id));
      return [...newPrev, ...updates];
    });
    setModalSobras(null);
    setModalPixCartao(null);
    setModalUnificarPDV(null);
    setModalUnificarTodos(false);
    setModalAuditoriaPDV(null);
    setModalAuditarTodos(false);
    setModalNovoEnvio(false);
    setModalReabrirAuditoria(null);
    setConfirmarReaberturaTarget(null);
    carregarRegistros();
  };

  // Grupos por PDV
  const agrupadosAguardandoAuditoria = locaisCompletos
    .map((local) => {
      const records = registros.filter(
        (r) =>
          r.local_id === local.id &&
          (r.status === 'encerrado' ||
            r.status === 'fechado' ||
            r.status === 'pendente_auditoria' ||
            r.status === 'pendente')
      );
      if (records.length === 0) return null;
      return { local, records };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  const agrupadosAuditados = locaisCompletos
    .map((local) => {
      const records = registros.filter(
        (r) =>
          r.local_id === local.id &&
          (r.status === 'auditado' || r.status === 'conferido' || r.status === 'concluido')
      );
      if (records.length === 0) return null;
      return { local, records };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  // Helper para vincular um fechamento unificado às remessas do PDV
  const getFechamentoUnificadoParaRecords = useCallback(
    (records: RemessaKanban[]) => {
      const unificadoId = records.find((r) => r.fechamento_unificado_id)?.fechamento_unificado_id;
      if (unificadoId) {
        const found = fechamentosUnificados.find((f) => f.id === unificadoId);
        if (found) return found;
      }
      const localId = records[0]?.local_id;
      if (localId) {
        const foundByLocal = fechamentosUnificados.find((f) => f.local_id === localId);
        if (foundByLocal) return foundByLocal;
      }
      if (fechamentosUnificados.length === 1) {
        return fechamentosUnificados[0];
      }
      return null;
    },
    [fechamentosUnificados]
  );

  // Resumo financeiro consolidado de todos os PDVs e turnos auditados
  const resumoFinanceiroAuditados = useMemo(() => {
    if (agrupadosAuditados.length === 0) return null;

    let faturamentoTotal = 0;
    let dinheiroTotal = 0;
    let pixTotal = 0;
    let cartaoTotal = 0;
    let taxasTotal = 0;
    let diferencaTotal = 0;
    let totalPecasVendidas = 0;

    const fechamentosProcessados = new Set<string>();

    for (const { records } of agrupadosAuditados) {
      records.forEach((r) => {
        dinheiroTotal += Number(r.valor_dinheiro_gaveta) || 0;
        const env = Number(r.qtd_total_enviada) || 0;
        const ret = Number(r.qtd_total_retorno) || 0;
        totalPecasVendidas += Math.max(0, env - ret);

        if (r.itens_grade && Array.isArray(r.itens_grade) && r.itens_grade.length > 0) {
          const somaItens = r.itens_grade.reduce((s, it) => {
            const itemEnv = (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
            const itemRet = Number(it.qtd_retorno) || 0;
            const vend = Math.max(0, itemEnv - itemRet);
            return s + vend * (Number(it.preco_unitario) || 0);
          }, 0);
          if (somaItens > 0) {
            faturamentoTotal += somaItens;
            return;
          }
        }
        faturamentoTotal +=
          Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0;
      });

      const unificado = getFechamentoUnificadoParaRecords(records);
      if (unificado && unificado.id) {
        if (!fechamentosProcessados.has(unificado.id)) {
          fechamentosProcessados.add(unificado.id);
          pixTotal += Number(unificado.total_pix_declarado || 0);
          cartaoTotal +=
            Number(unificado.total_cartao_debito_declarado || 0) +
            Number(unificado.total_cartao_credito_declarado || 0) +
            Number(unificado.total_outros_declarado || 0);
          taxasTotal += Number(unificado.total_taxas_operacionais || 0);
          diferencaTotal += Number(unificado.diferenca_caixa || 0);
        }
      } else {
        records.forEach((r) => {
          pixTotal += Number(r.valor_pix_declarado) || 0;
          cartaoTotal += Number(r.valor_cartao_declarado) || 0;
          taxasTotal += Number(r.taxa_cartao_reais) || 0;
          diferencaTotal += Number(r.diferenca_auditoria) || 0;
        });
      }
    }

    if (fechamentosProcessados.size === 0 && fechamentosUnificados.length > 0) {
      const f0 = fechamentosUnificados[0];
      pixTotal = Number(f0.total_pix_declarado || 0);
      cartaoTotal =
        Number(f0.total_cartao_debito_declarado || 0) +
        Number(f0.total_cartao_credito_declarado || 0) +
        Number(f0.total_outros_declarado || 0);
      taxasTotal = Number(f0.total_taxas_operacionais || 0);
      diferencaTotal = Number(f0.diferenca_caixa || 0);
    }

    const totalBrutoRecebido = dinheiroTotal + pixTotal + cartaoTotal;
    const totalLiquidoEmConta = totalBrutoRecebido - taxasTotal;

    return {
      faturamentoTotal,
      dinheiroTotal,
      pixTotal,
      cartaoTotal,
      taxasTotal,
      totalBrutoRecebido,
      totalLiquidoEmConta,
      diferencaTotal,
      totalPecasVendidas,
      totalPdvs: agrupadosAuditados.length,
      totalTurnos: registrosAuditados.length,
    };
  }, [agrupadosAuditados, registrosAuditados, fechamentosUnificados, getFechamentoUnificadoParaRecords]);

  const handleSolicitarReabertura = (target: {
    localNome: string;
    records: RemessaKanban[];
    isGeral: boolean;
  }) => {
    setConfirmarReaberturaTarget(target);
  };

  // Apenas PDVs com fechamento em andamento na etapa de Sobras & Caixa (colParcial)
  const pdvsPendentesAgrupados = locaisCompletos
    .map((local) => {
      const localRecords = registros.filter(
        (r) =>
          r.local_id === local.id &&
          (r.status === 'aberto' ||
            r.status === 'dinheiro_informado' ||
            r.status === 'sobras_informadas')
      );
      const temTurnoEmSobrasCaixa = localRecords.some(
        (r) => r.status === 'dinheiro_informado' || r.status === 'sobras_informadas'
      );
      if (!temTurnoEmSobrasCaixa) return null;
      return { local, records: localRecords };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Date selector + KPIs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
            <input
              type="date"
              value={dataAcerto}
              onChange={(e) => onDataChange(e.target.value)}
              className="rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={carregarRegistros}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Mini KPIs & Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Unificar Todos os PDVs (Sobras e Caixa) no Topo */}
          {pdvsPendentesAgrupados.length >= 1 && (
            <button
              type="button"
              onClick={() => setModalUnificarTodos(true)}
              className="flex items-center gap-1.5 rounded-xl border-2 border-cyan-400 bg-cyan-600 px-3.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-cyan-700 shadow-sm transition-all active:scale-[0.97]"
              title="Unificar turnos e fechar todos os PDVs em Sobras e Caixa"
            >
              <Layers className="h-4 w-4" /> ⚡ Unificar Todos ({pdvsPendentesAgrupados.length}{' '}
              PDVs)
            </button>
          )}

          {/* Botão Auditar Todos os PDVs no Topo */}
          {agrupadosAguardandoAuditoria.length >= 1 && (
            <button
              type="button"
              onClick={() => setModalAuditarTodos(true)}
              className="flex items-center gap-1.5 rounded-xl border-2 border-purple-400 bg-purple-600 px-3.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-purple-700 shadow-sm transition-all active:scale-[0.97]"
              title="Auditar todos os PDVs e conferir o extrato bancário"
            >
              <ShieldCheck className="h-4 w-4" /> ⚡ Auditar Todos (
              {agrupadosAguardandoAuditoria.length} PDVs)
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-primary/10 rounded-xl p-1 mr-1">
            <button
              type="button"
              onClick={() => setViewMode('scroll')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'scroll' ? 'bg-background shadow-sm text-primary' : 'text-text/40 hover:text-text'}`}
              title="Visualização em Scroll (Horizontal)"
            >
              <AlignJustify className="h-4 w-4 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-text/40 hover:text-text'}`}
              title="Visualização em Grade (Lado a Lado)"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold"
            title="Total de mercadorias enviadas aos PDVs na data selecionada"
          >
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="text-text/50">Enviado:</span>
            <span className="font-mono text-text/80">{totalEnviadoKanban} un</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-bold"
            title="Sobras apuradas em auditoria"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-400">Sobras:</span>
            <span className="font-mono text-amber-800 dark:text-amber-300">
              {totalSobrasAuditadasKanban} un
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[11px] font-bold"
            title="Vendas reais consolidadas de PDVs auditados"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400">Vendido:</span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300">
              {totalVendidoKanban} un
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[11px] font-bold"
            title="Dinheiro recolhido apurado na auditoria"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400">R$:</span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300">
              {totalDinheiroKanban.toFixed(2)}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold"
            title="Faturamento real apurado pós-auditoria"
          >
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary font-black">R$ {totalFaturamentoKanban.toFixed(2)}</span>
          </div>
          {registros.length > 0 && registrosAuditados.length === 0 && (
            <span className="flex items-center gap-1 rounded-lg border border-amber-300/60 bg-amber-100/60 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              <Clock className="h-3 w-3" /> Aguardando auditoria do dia
            </span>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div
        className={
          viewMode === 'scroll'
            ? 'flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 min-h-[70vh]'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4 px-1 min-h-[70vh]'
        }
      >
        {/* Column 1: Preparar Carga */}
        <div
          className={`${viewMode === 'scroll' ? 'w-[85vw] sm:w-[340px] shrink-0 snap-start' : 'w-full'} flex flex-col rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/20 overflow-hidden`}
        >
          <KanbanColumnHeader
            title="Preparar Carga"
            subtitle="A Enviar"
            icon={Truck}
            count={pdvsAguardandoCarga.length}
            colorClass="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
            bgClass="bg-indigo-100/50 dark:bg-indigo-900/30"
            borderClass="border-indigo-300 dark:border-indigo-700"
          />
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedLocalEnvio(pdvsAguardandoCarga[0]?.id || null);
                setModalNovoEnvio(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.97] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Novo Envio de Carga
            </button>

            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-medium">Carregando...</span>
              </div>
            ) : pdvsAguardandoCarga.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Todos os PDVs com carga enviada!
                </p>
                <p className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 leading-relaxed">
                  Use o botão acima para enviar nova carga ou turno adicional.
                </p>
              </div>
            ) : (
              pdvsAguardandoCarga.map((local) => (
                <div
                  key={`aguardando-${local.id}`}
                  className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-background p-3 shadow-2xs space-y-2.5 transition-all hover:border-indigo-400"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {local.logo_url ? (
                        <img
                          src={local.logo_url}
                          alt={local.nome}
                          className="h-7 w-7 rounded-lg object-contain bg-slate-100 p-0.5"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          <Store className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase text-text/90 block truncate">
                          {local.nome}
                        </span>
                        <span className="text-[10px] text-text/40 font-medium">Sem carga hoje</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                      Aguardando
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocalEnvio(local.id);
                      setModalNovoEnvio(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5" /> Enviar Carga
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Em Venda (Aberto) */}
        <div
          className={`${viewMode === 'scroll' ? 'w-[85vw] sm:w-[340px] shrink-0 snap-start' : 'w-full'} flex flex-col rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 overflow-hidden`}
        >
          <KanbanColumnHeader
            title="Em Venda no PDV"
            subtitle="Aberto"
            icon={Store}
            count={colAberto.length}
            colorClass="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
            bgClass="bg-amber-100/50 dark:bg-amber-900/30"
            borderClass="border-amber-300 dark:border-amber-700"
          />
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-medium">Carregando...</span>
              </div>
            ) : colAberto.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text/40 font-medium">
                Nenhuma carga em aberto
              </div>
            ) : (
              colAberto.map((reg) => (
                <KanbanCard
                  key={reg.id}
                  registro={reg}
                  locais={locais}
                  actionLabel="📦 Registrar Sobras"
                  actionIcon={Package}
                  actionColor="bg-amber-600 text-white hover:bg-amber-700"
                  onAction={() => setModalSobras(reg)}
                  onViewRomaneio={() => setModalRomaneio(reg)}
                  onDelete={() => handleDeleteCarga(reg.id, reg.locais?.nome || 'PDV')}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Sobras & Caixa Parcial */}
        <div
          className={`${viewMode === 'scroll' ? 'w-[85vw] sm:w-[340px] shrink-0 snap-start' : 'w-full'} flex flex-col rounded-2xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/30 dark:bg-cyan-950/20 overflow-hidden`}
        >
          <KanbanColumnHeader
            title="Sobras & Caixa"
            subtitle="Gaveta Recolhida"
            icon={Banknote}
            count={colParcial.length}
            colorClass="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300"
            bgClass="bg-cyan-100/50 dark:bg-cyan-900/30"
            borderClass="border-cyan-300 dark:border-cyan-700"
          />

          {/* BOTÃO FIXO NO TOPO DA COLUNA 3 */}
          {pdvsPendentesAgrupados.length >= 1 && (
            <div className="p-3 pb-0">
              <button
                type="button"
                onClick={() => setModalUnificarTodos(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs py-2.5 shadow-sm transition-all active:scale-[0.97]"
              >
                <Layers className="h-4 w-4" /> ⚡ Unificar Todos os PDVs (
                {pdvsPendentesAgrupados.length} PDVs)
              </button>
            </div>
          )}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {/* Banner Unificar Turnos por PDV */}
            {pdvsPendentesAgrupados.map(({ local, records }) => {
              const dinTotal = records.reduce(
                (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
                0
              );
              const pixTotal = records.reduce(
                (acc, r) => acc + (Number(r.valor_pix_declarado) || 0),
                0
              );
              const cartaoTotal = records.reduce(
                (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
                0
              );

              return (
                <div
                  key={`unificar-${local.id}`}
                  className="rounded-xl border-2 border-cyan-400 bg-cyan-100/50 dark:bg-cyan-950/60 p-3 shadow-xs space-y-2 mb-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers className="h-4 w-4 text-cyan-700 dark:text-cyan-300 shrink-0" />
                      <span className="text-xs font-black uppercase text-cyan-950 dark:text-cyan-100 truncate">
                        {local.nome}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-200 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-100 shrink-0 font-mono">
                      {records.length} {records.length === 1 ? 'turno' : 'turnos'}
                    </span>
                  </div>

                  {(dinTotal > 0 || pixTotal > 0 || cartaoTotal > 0) && (
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-cyan-900 dark:text-cyan-200 font-mono bg-cyan-200/60 dark:bg-cyan-900/50 px-2 py-1 rounded-md font-semibold">
                      {dinTotal > 0 && <span>Din: R$ {dinTotal.toFixed(2)}</span>}
                      {pixTotal > 0 && <span>Pix: R$ {pixTotal.toFixed(2)}</span>}
                      {cartaoTotal > 0 && <span>Cart: R$ {cartaoTotal.toFixed(2)}</span>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setModalUnificarPDV({ local, records })}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs py-2 shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Layers className="h-3.5 w-3.5" /> ⚡ Unificar Turnos e Fechar PDV
                  </button>
                </div>
              );
            })}

            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-medium">Carregando...</span>
              </div>
            ) : colParcial.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text/40 font-medium">
                Nenhum turno aguardando Pix/Cartão
              </div>
            ) : (
              colParcial.map((reg) => (
                <KanbanCard
                  key={reg.id}
                  registro={reg}
                  locais={locais}
                  showFinancials
                  actionLabel={
                    !reg.valor_dinheiro_gaveta
                      ? '💰 Lançar Dinheiro / Pix / Cartão'
                      : '💳 Lançar Pix / Cartão'
                  }
                  actionIcon={!reg.valor_dinheiro_gaveta ? Banknote : CreditCard}
                  actionColor="bg-cyan-600 text-white hover:bg-cyan-700"
                  onAction={() => setModalPixCartao(reg)}
                  onRevert={() => handleRevertToEmVenda(reg.id, reg.locais?.nome || 'PDV')}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 4: Turnos Concluídos (Aguardando Auditoria) */}
        <div
          className={`${viewMode === 'scroll' ? 'w-[85vw] sm:w-[340px] shrink-0 snap-start' : 'w-full'} flex flex-col rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/20 overflow-hidden`}
        >
          <KanbanColumnHeader
            title="Aguardando Auditoria"
            subtitle="Agrupado por PDV"
            icon={ShieldCheck}
            count={agrupadosAguardandoAuditoria.length}
            colorClass="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
            bgClass="bg-purple-100/50 dark:bg-purple-900/30"
            borderClass="border-purple-300 dark:border-purple-700"
          />

          {/* BOTÃO FIXO NO TOPO DA COLUNA 4 */}
          {agrupadosAguardandoAuditoria.length >= 1 && (
            <div className="p-3 pb-0">
              <button
                type="button"
                onClick={() => setModalAuditarTodos(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-2.5 shadow-sm transition-all active:scale-[0.97]"
              >
                <ShieldCheck className="h-4 w-4" /> ⚡ Auditar Todos (
                {agrupadosAguardandoAuditoria.length} PDVs)
              </button>
            </div>
          )}

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-medium">Carregando...</span>
              </div>
            ) : agrupadosAguardandoAuditoria.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text/40 font-medium">
                Nenhum PDV aguardando auditoria
              </div>
            ) : (
              agrupadosAguardandoAuditoria.map(({ local, records }) => (
                <PDVGroupCard
                  key={local.id}
                  local={local}
                  records={records}
                  fechamentoUnificado={getFechamentoUnificadoParaRecords(records)}
                  onAction={() => setModalAuditoriaPDV({ local, records })}
                  onOpenRecibo={(reciboData) => setModalReciboData(reciboData)}
                  onRevert={() => handleReverterAguardandoAuditoria(records, local.nome)}
                  actionLabel="Auditar PDV"
                  actionColor="bg-purple-600 text-white hover:bg-purple-700"
                  actionIcon={ShieldCheck}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 5: Auditados (Finalizados) */}
        <div
          className={`${viewMode === 'scroll' ? 'w-[85vw] sm:w-[340px] shrink-0 snap-start' : 'w-full'} flex flex-col rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 overflow-hidden`}
        >
          <KanbanColumnHeader
            title="Auditados"
            subtitle="Finalizado"
            icon={CheckCircle2}
            count={agrupadosAuditados.length}
            colorClass="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
            bgClass="bg-emerald-100/50 dark:bg-emerald-900/30"
            borderClass="border-emerald-300 dark:border-emerald-700"
          />

          {/* RESUMO FINANCEIRO AUDITADO NO TOPO DA COLUNA 5 */}
          {resumoFinanceiroAuditados && (
            <div className="p-3 pb-0">
              <div className="rounded-2xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-2 text-white border border-emerald-500/30 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Resumo Financeiro Auditado
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {resumoFinanceiroAuditados.totalPdvs} PDV(s) • {resumoFinanceiroAuditados.totalPecasVendidas} peças
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <Banknote className="h-3 w-3 text-emerald-400" /> Dinheiro Gaveta:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      R$ {resumoFinanceiroAuditados.dinheiroTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-purple-400" /> Pix Conferido:
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                      R$ {resumoFinanceiroAuditados.pixTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-cyan-400" /> Cartões (Déb/Créd):
                    </span>
                    <span className="font-mono font-bold text-cyan-400">
                      R$ {resumoFinanceiroAuditados.cartaoTotal.toFixed(2)}
                    </span>
                  </div>
                  {resumoFinanceiroAuditados.taxasTotal > 0 && (
                    <div className="flex justify-between text-amber-300 font-semibold border-t border-slate-800/80 pt-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-amber-400" /> Taxas Operacionais:
                      </span>
                      <span className="font-mono">-R$ {resumoFinanceiroAuditados.taxasTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-300 font-bold border-t border-slate-800/80 pt-1">
                    <span>Total Líquido em Conta:</span>
                    <span className="font-mono text-sm">
                      R$ {resumoFinanceiroAuditados.totalLiquidoEmConta.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold border-t border-slate-800 pt-1">
                    <span>Faturamento Bruto:</span>
                    <span className="font-mono text-primary">
                      R$ {resumoFinanceiroAuditados.faturamentoTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status do Caixa Auditado */}
                <div className="pt-1">
                  {resumoFinanceiroAuditados.diferencaTotal === 0 ? (
                    <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Caixa 100% Conferido
                      </span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                  ) : resumoFinanceiroAuditados.diferencaTotal < 0 ? (
                    <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-300 font-bold">
                      <span>⚠ Furo de Caixa Geral:</span>
                      <span className="font-mono">-R$ {Math.abs(resumoFinanceiroAuditados.diferencaTotal).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border border-blue-500/40 bg-blue-950/60 text-blue-300 font-bold">
                      <span>⚠ Sobra de Caixa Geral:</span>
                      <span className="font-mono">+R$ {resumoFinanceiroAuditados.diferencaTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BOTÃO FIXO NO TOPO DA COLUNA 5 */}
          {agrupadosAuditados.length >= 1 && (
            <div className="p-3 pb-0">
              <button
                type="button"
                onClick={() => {
                  const allAuditados = agrupadosAuditados.flatMap((p) => p.records);
                  handleSolicitarReabertura({
                    localNome: 'Geral (Todos os PDVs)',
                    records: allAuditados,
                    isGeral: true,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-extrabold text-xs py-2 shadow-xs transition-all active:scale-[0.97]"
              >
                <Unlock className="h-4 w-4 text-amber-600" /> Reabrir Auditoria Geral (
                {agrupadosAuditados.length} PDVs)
              </button>
            </div>
          )}

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6 text-text/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-medium">Carregando...</span>
              </div>
            ) : agrupadosAuditados.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text/40 font-medium">
                Nenhum PDV auditado hoje
              </div>
            ) : (
              agrupadosAuditados.map(({ local, records }) => (
                <PDVGroupCard
                  key={local.id}
                  local={local}
                  records={records}
                  fechamentoUnificado={getFechamentoUnificadoParaRecords(records)}
                  onReabrirAuditoria={() =>
                    handleSolicitarReabertura({
                      localNome: local.nome,
                      records: records,
                      isGeral: false,
                    })
                  }
                  onOpenRecibo={(reciboData) => setModalReciboData(reciboData)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {confirmarReaberturaTarget && (
        <ConfirmarReaberturaModal
          target={confirmarReaberturaTarget}
          fechamentoUnificado={getFechamentoUnificadoParaRecords(confirmarReaberturaTarget.records)}
          onClose={() => setConfirmarReaberturaTarget(null)}
          onVisualizar={() => {
            const target = confirmarReaberturaTarget;
            setConfirmarReaberturaTarget(null);
            const fech = getFechamentoUnificadoParaRecords(target.records);
            const isUnif =
              target.records.some(
                (r) => r.tipo_fechamento === 'unificado' || Boolean(r.fechamento_unificado_id)
              ) || Boolean(fech);

            const din = target.records.reduce(
              (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
              0
            );
            const px =
              isUnif && fech
                ? Number(fech.total_pix_declarado || 0)
                : target.records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
            const cart =
              isUnif && fech
                ? Number(fech.total_cartao_debito_declarado || 0) +
                Number(fech.total_cartao_credito_declarado || 0) +
                Number(fech.total_outros_declarado || 0)
                : target.records.reduce(
                  (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
                  0
                );
            const tx =
              isUnif && fech
                ? Number(fech.total_taxas_operacionais || 0)
                : target.records.reduce((acc, r) => acc + (Number(r.taxa_cartao_reais) || 0), 0);
            const difCaixa =
              isUnif && fech
                ? Number(fech.diferenca_caixa || 0)
                : target.records.reduce(
                  (acc, r) => acc + (Number(r.diferenca_auditoria) || 0),
                  0
                );

            const fatur = target.records.reduce((acc, r) => {
              if (r.itens_grade && Array.isArray(r.itens_grade) && r.itens_grade.length > 0) {
                const soma = r.itens_grade.reduce((s, it) => {
                  const env =
                    (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
                  const ret = Number(it.qtd_retorno) || 0;
                  return s + Math.max(0, env - ret) * (Number(it.preco_unitario) || 0);
                }, 0);
                if (soma > 0) return acc + soma;
              }
              return (
                acc +
                (Number(r.faturamento_liquido_esperado) ||
                  Number(r.faturamento_bruto_teorico) ||
                  0)
              );
            }, 0);

            const itensConsolidadosMap = new Map<string, any>();
            target.records.forEach((r) => {
              (r.itens_grade || []).forEach((it) => {
                if (!itensConsolidadosMap.has(it.produto_id)) {
                  itensConsolidadosMap.set(it.produto_id, { ...it });
                } else {
                  const cur = itensConsolidadosMap.get(it.produto_id)!;
                  cur.qtd_enviada = (Number(cur.qtd_enviada) || 0) + (Number(it.qtd_enviada) || 0);
                  cur.qtd_sobra_anterior =
                    (Number(cur.qtd_sobra_anterior) || 0) + (Number(it.qtd_sobra_anterior) || 0);
                  cur.qtd_retorno =
                    (Number(cur.qtd_retorno) || 0) + (Number(it.qtd_retorno) || 0);
                }
              });
            });

            const primaryRecord = target.records[target.records.length - 1] || target.records[0];
            setModalReciboData({
              id: primaryRecord?.id || 'auditoria-visualizar',
              data: primaryRecord?.data || dataAcerto,
              turno: target.isGeral
                ? 'Todos os Turnos'
                : target.records.map((r) => formatTurno(r.turno)).join(' + '),
              vendedor_nome: target.isGeral
                ? 'Consolidado Geral'
                : primaryRecord?.vendedor_nome || undefined,
              pdvNome: target.localNome,
              status: 'auditado',
              tipo_fechamento: isUnif ? 'unificado' : primaryRecord?.tipo_fechamento,
              valor_dinheiro_gaveta: din,
              valor_pix_declarado: px,
              valor_cartao_declarado: cart,
              taxa_cartao_reais: tx,
              faturamento_bruto_teorico: fatur,
              faturamento_liquido_esperado: fatur,
              diferenca_auditoria: difCaixa,
              observacoes: primaryRecord?.observacoes || fech?.justificativa || undefined,
              itens_grade: Array.from(itensConsolidadosMap.values()),
            });
          }}
          onConfirmarReabertura={() => {
            const target = confirmarReaberturaTarget;
            setConfirmarReaberturaTarget(null);
            setModalReabrirAuditoria(target);
          }}
        />
      )}
      {modalSobras && (
        <RegistrarSobrasModal
          registro={modalSobras}
          locais={locais}
          produtosBase={produtosBase}
          onClose={() => setModalSobras(null)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalPixCartao && (
        <LancarPixCartaoModal
          registro={modalPixCartao}
          locais={locais}
          onClose={() => setModalPixCartao(null)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalUnificarPDV && (
        <FechamentoUnificadoPDVModal
          local={modalUnificarPDV.local}
          records={modalUnificarPDV.records}
          produtosBase={produtosBase}
          onClose={() => setModalUnificarPDV(null)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalUnificarTodos && pdvsPendentesAgrupados.length > 0 && (
        <UnificarTodosPDVsModal
          allPdvs={pdvsPendentesAgrupados}
          produtosBase={produtosBase}
          onClose={() => setModalUnificarTodos(false)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalAuditoriaPDV && (
        <AuditarPDVModal
          local={modalAuditoriaPDV.local}
          records={modalAuditoriaPDV.records}
          onClose={() => setModalAuditoriaPDV(null)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalAuditarTodos && agrupadosAguardandoAuditoria.length > 0 && (
        <AuditarTodosPDVsModal
          allPdvs={agrupadosAguardandoAuditoria}
          dataAcerto={dataAcerto}
          profile={profile}
          onClose={() => setModalAuditarTodos(false)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalReabrirAuditoria && (
        <ReabrirAuditoriaModal
          target={modalReabrirAuditoria}
          profile={profile}
          onClose={() => setModalReabrirAuditoria(null)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalNovoEnvio && (
        <NovoEnvioModal
          locais={locais}
          produtosBase={produtosBase}
          profile={profile}
          dataAcerto={dataAcerto}
          turnoInicial="manha"
          localInicialId={selectedLocalEnvio || undefined}
          sobrasAnteriores={sobrasAnteriores}
          onClose={() => {
            setModalNovoEnvio(false);
            setSelectedLocalEnvio(null);
          }}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalRomaneio && (
        <VerRomaneioModal registro={modalRomaneio} onClose={() => setModalRomaneio(null)} />
      )}
      {modalReciboData && (
        <ReciboEModaDetalhamentoModal
          data={modalReciboData}
          onClose={() => setModalReciboData(null)}
        />
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
        size={confirmDialog.options.size}
      />
    </div>
  );
}