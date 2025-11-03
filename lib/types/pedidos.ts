export interface PedidoCompra {
  id: string;
  created_at: string;
  status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado' | 'finalizado';
  observacoes?: string;
  valor_total: number;
  email_enviado: boolean;
  whatsapp_enviado: boolean;
  data_envio_email?: string;
  data_envio_whatsapp?: string;
}

export interface ItemPedidoCompra {
  id: string;
  pedido_id: string;
  insumo_id: string;
  quantidade: number;
  valor_unitario: number;
  observacoes?: string;
  created_at: string;
}

export interface NotificacaoPedido {
  id: string;
  pedido_id: string;
  tipo: 'status' | 'email' | 'whatsapp';
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export type StatusPedido = PedidoCompra['status'];

export interface PedidoCompraDetalhado extends PedidoCompra {
  itens_pedido_compra: (ItemPedidoCompra & {
    insumo: {
      id: string;
      nome: string;
      unidade_medida: string;
      ultimo_valor: number | null;
    };
  })[];
  notificacoes_pedido: NotificacaoPedido[];
}
