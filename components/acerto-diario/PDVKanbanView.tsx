'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
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
  X,
  LayoutGrid,
  AlignJustify,
  Download,
  FileText,
  Printer,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { supabase } from '@/lib/supabase-client';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  qtd_sobra_anterior: number;
  qtd_enviada: number;
  qtd_retorno: number;
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
  const retorno = Number(registro.qtd_total_retorno) || 0;
  const vendido = Math.max(0, enviado - retorno);
  const dinheiro = Number(registro.valor_dinheiro_gaveta) || 0;
  const pix = Number(registro.valor_pix_declarado) || 0;
  const cartao = Number(registro.valor_cartao_declarado) || 0;
  const faturamento =
    Number(registro.faturamento_liquido_esperado) ||
    Number(registro.faturamento_bruto_teorico) ||
    dinheiro + pix + cartao;
  const taxaSobra = calcTaxaSobra(enviado, retorno);
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
              {retorno}
            </span>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Vendido
            </span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {vendido}
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
              className={`font-mono font-bold ${
                taxaSobra > 30
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all active:scale-[0.97] ${
                actionColor || 'bg-primary text-white hover:opacity-90'
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

// ─── Modais ──────────────────────────────────────────────────────────────────

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

  // Build grade from registro's itens_grade or from produtosBase
  const [gradeItens, setGradeItens] = useState<ItemGradeKanban[]>(() => {
    if (Array.isArray(registro.itens_grade) && registro.itens_grade.length > 0) {
      return registro.itens_grade.map((it) => ({
        ...it,
        qtd_retorno: Number(it.qtd_retorno) || 0,
      }));
    }
    return produtosBase.map((p) => ({
      produto_id: p.id,
      nome: p.nome,
      preco_unitario: p.preco,
      qtd_sobra_anterior: 0,
      qtd_enviada: 0,
      qtd_retorno: 0,
    }));
  });

  const totalRetorno = gradeItens.reduce((acc, it) => acc + (Number(it.qtd_retorno) || 0), 0);
  const totalEnviado = gradeItens.reduce(
    (acc, it) => acc + (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0),
    0
  );
  const totalVendido = Math.max(0, totalEnviado - totalRetorno);
  const faturamentoBruto = gradeItens.reduce((acc, it) => {
    const disp = (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
    const vend = Math.max(0, disp - (Number(it.qtd_retorno) || 0));
    return acc + vend * (Number(it.preco_unitario) || 0);
  }, 0);
  const pixCartaoEsperado = Math.max(0, faturamentoBruto - valorDinheiro);

  const handleSalvar = async () => {
    const confirmou = await confirmDialog.confirm({
      title: `Registrar Sobras — ${pdvNome}`,
      message: `Confirma o registro de ${totalRetorno} itens de sobra e R$ ${valorDinheiro.toFixed(2)} em dinheiro para o PDV "${pdvNome}" (${formatTurno(registro.turno)})?`,
      confirmText: 'Confirmar Sobras + Dinheiro',
      cancelText: 'Revisar',
      variant: 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      const totalEnviadoNum = gradeItens.reduce(
        (acc, it) => acc + (Number(it.qtd_enviada) || 0),
        0
      );

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
          {/* Header */}
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

          {/* Info */}
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

          {/* Atalho vendeu tudo */}
          <button
            type="button"
            onClick={handleZerarSobras}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" /> Vendeu Tudo (Sobra Zero)
          </button>

          {/* Grade de itens */}
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
                        value={item.qtd_retorno}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            Math.min(disponivel, Number(e.target.value) || 0)
                          );
                          setGradeItens((prev) =>
                            prev.map((it) =>
                              it.produto_id === item.produto_id ? { ...it, qtd_retorno: val } : it
                            )
                          );
                        }}
                        className="w-16 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-center text-sm font-mono font-bold text-amber-800 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Resumo */}
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

          {/* Dinheiro, Pix e Cartão */}
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

          {/* Pix/Cartão esperado */}
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
            {(valorPix > 0 || valorCartao > 0) && (
              <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1">
                <span>Total Digital Informado:</span>
                <span className="font-mono font-bold text-purple-300">
                  R$ {(valorPix + valorCartao).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
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
  const dinheiroInicial = Number(registro.valor_dinheiro_gaveta) || 0;
  const [valorDinheiro, setValorDinheiro] = useState(dinheiroInicial);
  const precisaInformarDinheiro = dinheiroInicial === 0;
  const [justificativa, setJustificativa] = useState('');

  const faturamento =
    Number(registro.faturamento_liquido_esperado) ||
    Number(registro.faturamento_bruto_teorico) ||
    0;
  const pixCartaoEsperado = Math.max(0, faturamento - valorDinheiro);
  const totalDigital = valorPix + valorCartao;
  const diferencaDigital = totalDigital - pixCartaoEsperado;
  const totalRecebido = valorDinheiro + totalDigital;
  const diferencaCaixa = totalRecebido - faturamento;

  const handleSalvar = async () => {
    const partes = [];
    if (precisaInformarDinheiro) partes.push(`Dinheiro R$ ${valorDinheiro.toFixed(2)}`);
    partes.push(`Pix R$ ${valorPix.toFixed(2)}`);
    partes.push(`Cartão R$ ${valorCartao.toFixed(2)}`);
    const confirmou = await confirmDialog.confirm({
      title: `Encerrar Turno — ${pdvNome}`,
      message: `Confirma o lançamento de ${partes.join(' + ')} e o encerramento do turno para "${pdvNome}" (${formatTurno(registro.turno)})?`,
      confirmText: 'Confirmar e Encerrar',
      cancelText: 'Revisar',
      variant: 'info',
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
          {/* Header */}
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

          {/* Info do registro */}
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

          {/* Inputs */}
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
                <CreditCard className="h-4 w-4" /> Cartão Declarado (R$)
              </label>
              <BRLCurrencyInput
                value={valorCartao}
                onChange={(val) => setValorCartao(val)}
                className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-4 py-2.5 font-mono text-lg font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Diferença */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Digital Declarado (Pix + Cartão):</span>
              <span className="font-mono font-bold text-cyan-200">
                R$ {totalDigital.toFixed(2)}
              </span>
            </div>
            <div
              className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${
                diferencaDigital < -0.05
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
                className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${
                  diferencaCaixa < 0 ? 'text-rose-400' : 'text-emerald-400'
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

          {/* Actions */}
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
  sobrasAnteriores,
  onClose,
  onSave,
}: {
  locais: LocalPDV[];
  produtosBase: ProdutoItem[];
  profile: any;
  dataAcerto: string;
  turnoInicial: 'manha' | 'tarde' | 'noite' | 'integral';
  sobrasAnteriores: ItemGradeKanban[] | null;
  onClose: () => void;
  onSave: (created: RemessaKanban) => void;
}) {
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const [salvando, setSalvando] = useState(false);
  const [localId, setLocalId] = useState(locais[0]?.id || '');
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
    const confirmou = await confirmDialog.confirm({
      title: `Confirmar Envio — ${pdvNome}`,
      message: `Enviar ${totalEnviado} unidades para "${pdvNome}" (${formatTurno(turno)})?`,
      confirmText: 'Confirmar Envio',
      cancelText: 'Revisar',
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

      // Check if there's already a registro for this PDV/data/turno
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
          {/* Header */}
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

          {/* PDV Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text/70">Ponto de Venda</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {locais.map((pdv) => (
                <button
                  key={pdv.id}
                  type="button"
                  onClick={() => setLocalId(pdv.id)}
                  className={`flex flex-col items-center justify-center rounded-xl border overflow-hidden transition-all ${
                    pdv.logo_url ? 'p-0' : 'p-2 gap-1.5'
                  } ${
                    localId === pdv.id
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

          {/* Turno + Vendedor */}
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

          {/* Grade */}
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

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3 text-xs font-bold">
            <span className="text-text/70 uppercase tracking-wider">Total a Enviar:</span>
            <span className="font-mono text-lg font-black text-primary">{totalEnviado} un</span>
          </div>

          {/* Actions */}
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
      />
    </>
  );
}

// ─── Modais ──────────────────────────────────────────────────────────────────

function VerRomaneioModal({ registro, onClose }: { registro: RemessaKanban; onClose: () => void }) {
  const pdvNome = registro.locais?.nome || 'PDV';
  const itens = Array.isArray(registro.itens_grade) ? registro.itens_grade : [];

  const totalDisponivel = itens.reduce((acc: number, item: any) => {
    return acc + (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-background shadow-xl animate-scale-up overflow-hidden">
        {/* Header */}
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

          {/* Lista */}
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

        {/* Footer */}
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
}: {
  local: LocalPDV;
  records: RemessaKanban[];
  actionLabel?: string;
  actionIcon?: any;
  actionColor?: string;
  onAction?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pdvNome = local.nome || 'PDV';
  const logoUrl = local.logo_url;
  const hasLogo = Boolean(logoUrl);

  const dinheiro = records.reduce((acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0), 0);
  const pix = records.reduce((acc, r) => acc + (Number(r.valor_pix_declarado) || 0), 0);
  const cartao = records.reduce((acc, r) => acc + (Number(r.valor_cartao_declarado) || 0), 0);
  const faturamento = records.reduce(
    (acc, r) =>
      acc + (Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0),
    0
  );

  // Calculate difference if they are already audited
  const dif = records.reduce((acc, r) => acc + (Number(r.diferenca_auditoria) || 0), 0);
  const isAuditado = records.some((r) => r.status === 'auditado' || r.status === 'conferido');

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
          <p className="text-xs font-bold text-text/90 truncate">{pdvNome}</p>
          <div className="flex items-center gap-2 text-[10px] text-text/50 font-medium">
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
              <Banknote className="h-3 w-3 text-emerald-400" /> Dinheiro Decl.
            </span>
            <span className="font-mono font-bold text-emerald-400">R$ {dinheiro.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3 text-purple-400" /> Pix Decl.
            </span>
            <span className="font-mono font-bold text-purple-400">R$ {pix.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-cyan-400" /> Cartão Decl.
            </span>
            <span className="font-mono font-bold text-cyan-400">R$ {cartao.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-1.5 text-white">
            <span className="font-bold">Faturamento Total</span>
            <span className="font-mono font-black text-primary">R$ {faturamento.toFixed(2)}</span>
          </div>
        </div>
        {isAuditado && dif !== 0 && (
          <div
            className={`flex items-center justify-between gap-2 text-[10px] px-2 py-1.5 rounded-lg border ${dif < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
          >
            <span className="font-bold">Diferença de Caixa:</span>
            <span className="font-mono font-black">R$ {dif.toFixed(2)}</span>
          </div>
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

      {actionLabel && onAction && !isAuditado && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onAction}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              actionColor || 'bg-primary text-white hover:opacity-90'
            }`}
          >
            {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
            {actionLabel}
          </button>
        </div>
      )}

      {isAuditado && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              // Simulated print
              alert(`Gerando recibo para ${pdvNome}...`);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-[0.97]"
          >
            <Printer className="h-4 w-4 shrink-0" />
            Imprimir Recibo
          </button>
        </div>
      )}
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

  const totalRecebidoReal = dinheiro + pixReal + cartaoReal;
  const diferenca = totalRecebidoReal - faturamento;

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
      // Revert records back to sobras_informadas
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
      message: `Confirmar auditoria com Pix real de R$ ${pixReal.toFixed(2)} e Cartão real de R$ ${cartaoReal.toFixed(2)}? ${diferenca !== 0 ? `Isso irá registrar uma diferença de R$ ${diferenca.toFixed(2)}.` : ''}`,
      confirmText: 'Auditar e Finalizar',
      cancelText: 'Revisar',
      variant: diferenca < 0 ? 'danger' : 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      // Split the difference and updated values arbitrarily, or we can just update the first record with the total difference.
      // Easiest is to distribute the difference and real pix/cartão values across records, or just put all real pix/cartão on the LAST record and 0 on the others,
      // but since they already declared pix/cartão per shift, let's just add the difference to the last record.
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

      // update last record
      const { error: errLast } = await supabase
        .from('remessas_cargas_pdv')
        .update(payloadLast)
        .eq('id', lastRecord.id);
      if (errLast) throw errLast;

      // update others
      for (const r of records) {
        if (r.id !== lastRecord.id) {
          await supabase.from('remessas_cargas_pdv').update(payloadOthers).eq('id', r.id);
        }
      }

      toast({
        title: 'PDV Auditado!',
        description: `O PDV ${pdvNome} foi auditado com sucesso.`,
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

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Total Recebido:</span>
              <span className="font-mono font-bold text-white">
                R$ {totalRecebidoReal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
              <span className="font-bold text-white">Diferença de Caixa:</span>
              <span
                className={`font-mono font-black ${diferenca < 0 ? 'text-rose-500 bg-rose-500/20 px-2 py-0.5 rounded' : diferenca > 0 ? 'text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded' : 'text-emerald-400'}`}
              >
                R$ {diferenca.toFixed(2)} {diferenca === 0 && '✅'}
              </span>
            </div>
          </div>

          {diferenca !== 0 && (
            <div className="space-y-1 mt-2">
              <label className="text-xs font-bold text-rose-500 mb-1 block">
                Justificativa da Diferença *
              </label>
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
      />
    </>
  );
}

// ─── Modal Fechamento Unificado PDV ─────────────────────────────────────────

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

  // Somar automaticamente os valores financeiros já lançados nos turnos individuais
  const initialDinheiro = records.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );
  const initialPix = records.reduce(
    (acc, r) => acc + (Number(r.valor_pix_declarado) || 0),
    0
  );
  const initialCartao = records.reduce(
    (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
    0
  );

  // Lançamentos Financeiros (pré-preenchidos com a soma dos turnos)
  const [valorDinheiro, setValorDinheiro] = useState<number>(initialDinheiro);
  const [valorPix, setValorPix] = useState<number>(initialPix);
  const [valorCartao, setValorCartao] = useState<number>(initialCartao);
  const [mostrarDetalhesTurnos, setMostrarDetalhesTurnos] = useState(false);

  // Turnos sendo unificados (ex: Manhã + Tarde + Noite)
  const turnosLabel = records.map((r) => formatTurno(r.turno)).join(' + ');

  // Consolidar grade de produtos de todos os turnos do PDV
  const [gradeConsolidada, setGradeConsolidada] = useState<ItemGradeKanban[]>(() => {
    const map = new Map<string, ItemGradeKanban>();

    produtosBase.forEach((p) => {
      map.set(p.id, {
        produto_id: p.id,
        nome: p.nome,
        preco_unitario: p.preco,
        qtd_sobra_anterior: 0,
        qtd_enviada: 0,
        qtd_retorno: 0,
      });
    });

    records.forEach((rec) => {
      if (Array.isArray(rec.itens_grade) && rec.itens_grade.length > 0) {
        rec.itens_grade.forEach((it) => {
          const existing = map.get(it.produto_id) || {
            produto_id: it.produto_id,
            nome: it.nome,
            preco_unitario: Number(it.preco_unitario) || 0,
            qtd_sobra_anterior: 0,
            qtd_enviada: 0,
            qtd_retorno: 0,
          };
          map.set(it.produto_id, {
            ...existing,
            nome: it.nome || existing.nome,
            preco_unitario: Number(it.preco_unitario) || existing.preco_unitario,
            qtd_sobra_anterior:
              (Number(existing.qtd_sobra_anterior) || 0) + (Number(it.qtd_sobra_anterior) || 0),
            qtd_enviada: (Number(existing.qtd_enviada) || 0) + (Number(it.qtd_enviada) || 0),
            qtd_retorno: (Number(existing.qtd_retorno) || 0) + (Number(it.qtd_retorno) || 0),
          });
        });
      }
    });

    return Array.from(map.values());
  });

  const totalEnviado = gradeConsolidada.reduce(
    (acc, it) => acc + (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0),
    0
  );
  const totalRetorno = gradeConsolidada.reduce(
    (acc, it) => acc + (Number(it.qtd_retorno) || 0),
    0
  );
  const totalVendido = Math.max(0, totalEnviado - totalRetorno);

  const faturamentoBrutoTeorico = gradeConsolidada.reduce((acc, it) => {
    const disp = (Number(it.qtd_sobra_anterior) || 0) + (Number(it.qtd_enviada) || 0);
    const vend = Math.max(0, disp - (Number(it.qtd_retorno) || 0));
    return acc + vend * (Number(it.preco_unitario) || 0);
  }, 0);

  const pixCartaoEsperado = Math.max(0, faturamentoBrutoTeorico - valorDinheiro);
  const totalDeclarado = valorDinheiro + valorPix + valorCartao;

  const handleZerarSobras = () => {
    setGradeConsolidada((prev) => prev.map((it) => ({ ...it, qtd_retorno: 0 })));
    toast({
      title: 'Vendeu tudo nos turnos!',
      description: 'Todas as sobras zeradas para o fechamento unificado.',
      variant: 'info',
    });
  };

  const handleSalvarFechamentoUnificado = async () => {
    const confirmou = await confirmDialog.confirm({
      title: `Fechamento Unificado — ${pdvNome}`,
      message: `Confirma a unificação de ${records.length} turno(s) (${turnosLabel}) do PDV "${pdvNome}"?\n\n- Sobras Totais: ${totalRetorno} un\n- Dinheiro: R$ ${valorDinheiro.toFixed(2)}\n- Pix: R$ ${valorPix.toFixed(2)}\n- Cartão: R$ ${valorCartao.toFixed(2)}\n- Total Declarado: R$ ${totalDeclarado.toFixed(2)}`,
      confirmText: 'Confirmar e Encerrar Turnos Unificados',
      cancelText: 'Revisar',
      variant: 'info',
    });
    if (!confirmou) return;

    setSalvando(true);
    try {
      const primaryRecord = records[records.length - 1]; // Registro principal para armazenar totais

      const totalEnviadaNum = gradeConsolidada.reduce(
        (acc, it) => acc + (Number(it.qtd_enviada) || 0),
        0
      );

      const payloadPrimary = {
        qtd_total_retorno: totalRetorno,
        qtd_total_enviada: totalEnviadaNum,
        itens_grade: gradeConsolidada,
        valor_dinheiro_gaveta: valorDinheiro,
        valor_pix_declarado: valorPix,
        valor_cartao_declarado: valorCartao,
        faturamento_bruto_teorico: faturamentoBrutoTeorico,
        faturamento_liquido_esperado: faturamentoBrutoTeorico,
        pix_cartao_esperado: pixCartaoEsperado,
        tipo_fechamento: 'unificado',
        observacoes: `Fechamento Unificado (${records.length} turnos: ${turnosLabel})`,
        status: 'encerrado',
        updated_at: new Date().toISOString(),
      };

      const payloadSecondary = {
        qtd_total_retorno: 0,
        valor_dinheiro_gaveta: 0,
        valor_pix_declarado: 0,
        valor_cartao_declarado: 0,
        faturamento_bruto_teorico: 0,
        faturamento_liquido_esperado: 0,
        pix_cartao_esperado: 0,
        tipo_fechamento: 'unificado',
        observacoes: `Unificado no registro principal (${primaryRecord.id})`,
        status: 'encerrado',
        updated_at: new Date().toISOString(),
      };

      // 1. Atualizar registro principal com totais
      const { error: errPrimary } = await supabase
        .from('remessas_cargas_pdv')
        .update(payloadPrimary)
        .eq('id', primaryRecord.id);

      if (errPrimary) throw errPrimary;

      // 2. Atualizar registros secundários
      for (const rec of records) {
        if (rec.id !== primaryRecord.id) {
          const { error: errSec } = await supabase
            .from('remessas_cargas_pdv')
            .update(payloadSecondary)
            .eq('id', rec.id);
          if (errSec) console.warn('Erro ao atualizar turno secundário:', errSec);
        }
      }

      toast({
        title: 'Turnos Unificados com Sucesso! ⚡',
        description: `Fechamento do PDV ${pdvNome} realizado (${records.length} turnos). Total: R$ ${totalDeclarado.toFixed(2)}.`,
        variant: 'success',
      });

      const updatedRecords = records.map((rec) =>
        rec.id === primaryRecord.id
          ? { ...rec, ...payloadPrimary }
          : { ...rec, ...payloadSecondary }
      );

      onSave(updatedRecords);
    } catch (err: any) {
      toast({ title: 'Erro no Fechamento Unificado', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-300 dark:border-cyan-800 bg-background p-5 shadow-xl space-y-4 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-600" /> Fechamento Unificado — {pdvNome}
              </h3>
              <p className="text-[11px] font-medium text-text/50 mt-0.5">
                Agrupando {records.length} turno(s): <span className="font-bold text-cyan-800 dark:text-cyan-200">{turnosLabel}</span>
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

          {/* Info Banner */}
          <div className="flex items-center gap-3 text-xs text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl p-3 border border-cyan-200 dark:border-cyan-800">
            <Calendar className="h-4 w-4 text-cyan-600 shrink-0" />
            <span>
              Este procedimento somará o estoque e consolidará os valores em <strong>Dinheiro, Pix e Cartão</strong> de todos os turnos juntos.
            </span>
          </div>

          {/* Expansão para Ver Valor e Detalhe de Cada Turno do PDV */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMostrarDetalhesTurnos(!mostrarDetalhesTurnos)}
              className="flex items-center justify-between w-full rounded-xl bg-cyan-100/70 dark:bg-cyan-950/60 p-2.5 text-xs font-bold text-cyan-900 dark:text-cyan-100 hover:bg-cyan-200/70 dark:hover:bg-cyan-900 transition-colors border border-cyan-200 dark:border-cyan-800"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>Ver Valores e Detalhes de Cada Turno ({records.length})</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-extrabold text-cyan-700 dark:text-cyan-300">
                {mostrarDetalhesTurnos ? 'Ocultar' : 'Ver Detalhes'}
                {mostrarDetalhesTurnos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {mostrarDetalhesTurnos && (
              <div className="space-y-2 max-h-52 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
                {records.map((r, idx) => {
                  const env = Number(r.qtd_total_enviada) || 0;
                  const ret = Number(r.qtd_total_retorno) || 0;
                  const vend = Math.max(0, env - ret);
                  const din = Number(r.valor_dinheiro_gaveta) || 0;
                  const px = Number(r.valor_pix_declarado) || 0;
                  const car = Number(r.valor_cartao_declarado) || 0;
                  const fat =
                    Number(r.faturamento_liquido_esperado) ||
                    Number(r.faturamento_bruto_teorico) ||
                    din + px + car;

                  return (
                    <div
                      key={r.id || idx}
                      className="rounded-lg bg-background p-2.5 border border-primary/10 space-y-1.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 capitalize">
                          <Clock className="h-3.5 w-3.5 text-cyan-600" />
                          {formatTurno(r.turno)}
                          {r.vendedor_nome && (
                            <span className="text-[10px] font-medium text-text/50">
                              ({r.vendedor_nome})
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                          Fat: R$ {fat.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-text/60 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-md text-center">
                        <div>
                          Enviado: <strong className="text-text/80">{env}</strong>
                        </div>
                        <div>
                          Sobra: <strong className="text-amber-700 dark:text-amber-400">{ret}</strong>
                        </div>
                        <div>
                          Vendido: <strong className="text-emerald-700 dark:text-emerald-400">{vend}</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-text/70 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 font-mono">
                          <Banknote className="h-3 w-3 text-emerald-500" /> Din: R$ {din.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Smartphone className="h-3 w-3 text-purple-500" /> Pix: R$ {px.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <CreditCard className="h-3 w-3 text-cyan-500" /> Cartão: R$ {car.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Atalho Vendeu Tudo */}
          <button
            type="button"
            onClick={handleZerarSobras}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" /> Vendeu Tudo nos Turnos (Sobra Zero)
          </button>

          {/* Grade Consolidada de Produtos */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {gradeConsolidada
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
                        Disponível Total: <span className="font-mono font-bold text-text/70">{disponivel} un</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                        Sobra Unificada:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={disponivel}
                        value={item.qtd_retorno}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            Math.min(disponivel, Number(e.target.value) || 0)
                          );
                          setGradeConsolidada((prev) =>
                            prev.map((it) =>
                              it.produto_id === item.produto_id ? { ...it, qtd_retorno: val } : it
                            )
                          );
                        }}
                        className="w-16 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-center text-sm font-mono font-bold text-amber-800 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Resumo da Contagem */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2">
              <span className="text-[9px] font-bold uppercase text-text/40 block">Total Disponível</span>
              <span className="font-mono font-black text-text/80 text-sm">{totalEnviado}</span>
            </div>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2">
              <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                Total Sobras
              </span>
              <span className="font-mono font-black text-amber-700 dark:text-amber-300 text-sm">
                {totalRetorno}
              </span>
            </div>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2">
              <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                Total Vendido
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                {totalVendido}
              </span>
            </div>
          </div>

          {/* Lançamento dos Valores Financeiros (Dinheiro, Pix, Cartão) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text/70 flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-emerald-600" /> Lançamento dos Valores do Fechamento
            </h4>

            {/* Dinheiro */}
            <div>
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                <Banknote className="h-3.5 w-3.5" /> Valor em Dinheiro (R$)
              </label>
              <BRLCurrencyInput
                value={valorDinheiro}
                onChange={(val) => setValorDinheiro(val)}
                className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 font-mono text-base font-bold text-emerald-800 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Pix e Cartão */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                  <Smartphone className="h-3.5 w-3.5" /> Pix (R$)
                </label>
                <BRLCurrencyInput
                  value={valorPix}
                  onChange={(val) => setValorPix(val)}
                  className="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 font-mono text-sm font-bold text-purple-800 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 mb-1">
                  <CreditCard className="h-3.5 w-3.5" /> Cartão (R$)
                </label>
                <BRLCurrencyInput
                  value={valorCartao}
                  onChange={(val) => setValorCartao(val)}
                  className="w-full rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Painel com Faturamento Teórico vs Declarado */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Faturamento Bruto Teórico ({records.length} Turnos):</span>
              <span className="font-mono font-bold text-white">
                R$ {faturamentoBrutoTeorico.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
              <span>Pix/Cartão Esperado:</span>
              <span className="font-mono font-bold text-cyan-300">
                R$ {pixCartaoEsperado.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
              <span className="font-bold text-white">Total Declarado (Dinheiro + Pix + Cartão):</span>
              <span
                className={`font-mono font-extrabold ${
                  Math.abs(totalDeclarado - faturamentoBrutoTeorico) < 1
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                R$ {totalDeclarado.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
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
              onClick={handleSalvarFechamentoUnificado}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.97]"
            >
              {salvando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5" /> Concluir Fechamento Unificado
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
      />
    </>
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
  const [modalNovoEnvio, setModalNovoEnvio] = useState(false);
  const [modalRomaneio, setModalRomaneio] = useState<RemessaKanban | null>(null);

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

      // Load previous day sobras for shortcut
      const yesterday = new Date(dataAcerto + 'T12:00:00');
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

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
      message: `Tem certeza que deseja retornar a carga de ${pdvNome} para "Em Venda no PDV"?`,
      confirmText: 'Retornar',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update({ status: 'aberto' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Retornado para Em Venda', variant: 'success' });
      setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'aberto' } : r)));
    } catch (e: any) {
      toast({ title: 'Erro ao retornar', description: e.message, variant: 'error' });
    }
  };

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  // Distribute registros into columns
  const colAberto = registros.filter((r) => r.status === 'aberto');
  const colParcial = registros.filter(
    (r) => r.status === 'dinheiro_informado' || r.status === 'sobras_informadas'
  );
  const colConcluido = registros.filter(
    (r) => r.status === 'encerrado' || r.status === 'auditado' || r.status === 'conferido'
  );

  // KPIs
  const totalEnviadoKanban = registros.reduce(
    (acc, r) => acc + (Number(r.qtd_total_enviada) || 0),
    0
  );
  const totalVendidoKanban = registros.reduce((acc, r) => {
    const env = Number(r.qtd_total_enviada) || 0;
    const ret = Number(r.qtd_total_retorno) || 0;
    return acc + Math.max(0, env - ret);
  }, 0);
  const totalDinheiroKanban = registros.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );
  const totalFaturamentoKanban = registros.reduce((acc, r) => {
    const fat =
      Number(r.faturamento_liquido_esperado) ||
      Number(r.faturamento_bruto_teorico) ||
      (Number(r.valor_dinheiro_gaveta) || 0) +
        (Number(r.valor_pix_declarado) || 0) +
        (Number(r.valor_cartao_declarado) || 0);
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
    setModalNovoEnvio(false);
  };

  // Distribute records into grouped columns
  const agrupadosAguardandoAuditoria = locais
    .map((local) => {
      const records = registros.filter((r) => r.local_id === local.id && r.status === 'encerrado');
      if (records.length === 0) return null;
      return { local, records };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  const agrupadosAuditados = locais
    .map((local) => {
      const records = registros.filter(
        (r) => r.local_id === local.id && (r.status === 'auditado' || r.status === 'conferido')
      );
      if (records.length === 0) return null;
      return { local, records };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  const pdvsPendentesAgrupados = locais
    .map((local) => {
      const records = registros.filter(
        (r) =>
          r.local_id === local.id &&
          (r.status === 'aberto' ||
            r.status === 'dinheiro_informado' ||
            r.status === 'sobras_informadas')
      );
      if (records.length === 0) return null;
      return { local, records };
    })
    .filter(Boolean) as { local: LocalPDV; records: RemessaKanban[] }[];

  const [modalAuditoriaPDV, setModalAuditoriaPDV] = useState<{
    local: LocalPDV;
    records: RemessaKanban[];
  } | null>(null);

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

        {/* Mini KPIs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Buttons */}
          <div className="flex gap-2 mr-2 border-r border-primary/10 pr-4">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: 'Exportação Iniciada',
                  description: 'O download do Excel começará em breve.',
                  variant: 'success',
                })
              }
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: 'Gerando PDF',
                  description: 'O relatório executivo está sendo gerado.',
                  variant: 'success',
                })
              }
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>

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

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="text-text/50">Enviado:</span>
            <span className="font-mono text-text/80">{totalEnviadoKanban} un</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[11px] font-bold">
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400">Vendido:</span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300">
              {totalVendidoKanban} un
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[11px] font-bold">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400">R$:</span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300">
              {totalDinheiroKanban.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">Fat:</span>
            <span className="font-mono text-primary font-black">
              R$ {totalFaturamentoKanban.toFixed(2)}
            </span>
          </div>
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
            count={0}
            colorClass="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
            bgClass="bg-indigo-100/50 dark:bg-indigo-900/30"
            borderClass="border-indigo-300 dark:border-indigo-700"
          />
          <div className="p-3 space-y-3">
            {/* Botão novo envio */}
            <button
              type="button"
              onClick={() => setModalNovoEnvio(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Novo Envio de Carga
            </button>

            {/* Dica */}
            <p className="text-[10px] text-text/40 text-center font-medium leading-relaxed">
              Monte a carga para um PDV e turno.
            </p>
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
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {/* Banner de Ação em Bloco: Unificar Turnos e Fechar PDV */}
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
                  onAction={() => setModalAuditoriaPDV({ local, records })}
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
                <PDVGroupCard key={local.id} local={local} records={records} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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
      {modalAuditoriaPDV && (
        <AuditarPDVModal
          local={modalAuditoriaPDV.local}
          records={modalAuditoriaPDV.records}
          onClose={() => setModalAuditoriaPDV(null)}
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
          sobrasAnteriores={sobrasAnteriores}
          onClose={() => setModalNovoEnvio(false)}
          onSave={handleRegistroUpdated}
        />
      )}
      {modalRomaneio && (
        <VerRomaneioModal registro={modalRomaneio} onClose={() => setModalRomaneio(null)} />
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
