/** Pedidos de Natal registrados no sistema (admin). */

export const STATUS_PEDIDO = [
  { id: 'aberto', label: 'Aberto' },
  { id: 'pendente_pagamento', label: 'Pendente de pagamento' },
  { id: 'confirmado', label: 'Confirmado / pago' },
  { id: 'em_producao', label: 'Em produção' },
  { id: 'pronto', label: 'Pronto' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'finalizado', label: 'Finalizado' },
  { id: 'cancelado', label: 'Cancelado' },
] as const;

export type StatusPedidoId = (typeof STATUS_PEDIDO)[number]['id'];

// Classes completas (o Tailwind só gera classes escritas por extenso)
export const CLASSE_STATUS: Record<StatusPedidoId, string> = {
  aberto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  pendente_pagamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  confirmado: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  em_producao: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  pronto: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  enviado: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  finalizado: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export function rotuloStatus(id: string): string {
  return STATUS_PEDIDO.find((s) => s.id === id)?.label ?? id;
}

export function classeStatus(id: string): string {
  return (
    CLASSE_STATUS[id as StatusPedidoId] ??
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  );
}

export interface ItemRegistro {
  id: string;
  nome: string;
  qtd: number;
  unitario: number | null; // null = sob consulta
}

export interface PedidoNatal {
  id: string;
  codigo: string;
  status: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  recebimento: 'retirada' | 'entrega';
  data_entrega: string | null; // YYYY-MM-DD
  endereco: string | null;
  pagamento: string | null;
  observacoes: string | null;
  itens: ItemRegistro[];
  total: number;
  taxa_entrega: number | null;
  origem: 'site' | 'manual';
  criado_em: string; // ISO
  atualizado_em: string;
}

export function somaItens(itens: ItemRegistro[]): number {
  return itens.reduce((s, i) => s + (i.unitario ?? 0) * i.qtd, 0);
}

export function totalGeral(p: Pick<PedidoNatal, 'total' | 'taxa_entrega'>): number {
  return p.total + (p.taxa_entrega ?? 0);
}

export function quantidadeItens(itens: ItemRegistro[]): number {
  return itens.reduce((s, i) => s + i.qtd, 0);
}

/** Data local (YYYY-MM-DD) de um timestamp ISO — usada nos filtros por dia. */
export function diaLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function telefoneWhatsApp(tel: string | null): string | null {
  const d = (tel ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return d.startsWith('55') ? d : `55${d}`;
}
