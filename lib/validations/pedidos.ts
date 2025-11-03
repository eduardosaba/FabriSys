import { z } from 'zod';

export const PedidoCompraSchema = z.object({
  id: z.string(),
  numero: z.number(),
  created_at: z.string(),
  status: z.enum(['pendente', 'enviado', 'aprovado', 'rejeitado', 'finalizado']),
  observacoes: z.string().nullable().optional(),
  valor_total: z.number(),
  email_enviado: z.boolean(),
  whatsapp_enviado: z.boolean(),
  data_envio_email: z.string().optional().nullable(),
  data_envio_whatsapp: z.string().optional().nullable(),
});

export const ItemPedidoCompraSchema = z.object({
  id: z.string(),
  pedido_id: z.string(),
  insumo_id: z.string(),
  quantidade: z.number(),
  valor_unitario: z.number(),
  observacoes: z.string().nullable().optional(),
  created_at: z.string(),
  insumo: z.object({
    id: z.string(),
    nome: z.string(),
    unidade_medida: z.string(),
    ultimo_valor: z.number().nullable(),
  }),
});

export const NotificacaoPedidoSchema = z.object({
  id: z.string(),
  pedido_id: z.string(),
  tipo: z.enum(['status', 'email', 'whatsapp']),
  mensagem: z.string(),
  lida: z.boolean(),
  created_at: z.string(),
});

export const PedidoCompraDetalhadoSchema = PedidoCompraSchema.extend({
  itens_pedido_compra: z.array(ItemPedidoCompraSchema),
  notificacoes_pedido: z.array(NotificacaoPedidoSchema),
});

export const PedidoCompraDetalhadoArraySchema = z.array(PedidoCompraDetalhadoSchema);

// Schemas auxiliares
export const PedidoIdSchema = z.object({ id: z.string() });
