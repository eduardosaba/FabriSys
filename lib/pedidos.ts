import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Insumo } from '@/lib/types/insumos';
import { PedidoCompra } from '@/lib/types/pedidos';
import { PedidoCompraDetalhadoArraySchema, PedidoCompraSchema } from '@/lib/validations/pedidos';

const supabase = createClientComponentClient();

export async function salvarPedido(
  itens: { insumo: Insumo; quantidade: number }[],
  observacoes?: string
) {
  const valorTotal = itens.reduce(
    (total, item) => total + item.quantidade * (item.insumo.ultimo_valor || 0),
    0
  );

  // Inserir o pedido
  type PgResp<T> = { data: T | null; error: unknown | null };
  const r1 = (await supabase
    .from('pedidos_compra')
    .insert({
      valor_total: valorTotal,
      observacoes,
      status: 'pendente',
    })
    .select()
    .single()) as unknown as PgResp<unknown>;

  if (r1.error) throw r1.error;
  const pedido = PedidoCompraSchema.parse(r1.data);

  // Inserir os itens do pedido
  const itensPedido = itens.map((item) => ({
    pedido_id: pedido.id,
    insumo_id: item.insumo.id,
    quantidade: item.quantidade,
    valor_unitario: item.insumo.ultimo_valor || 0,
  }));

  const { error: erroItens } = await supabase.from('itens_pedido_compra').insert(itensPedido);

  if (erroItens) throw erroItens;

  // Criar notificação
  const { error: erroNotificacao } = await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedido.id,
    tipo: 'status',
    mensagem: 'Novo pedido de compra criado',
  });

  if (erroNotificacao) throw erroNotificacao;

  return pedido;
}

export async function enviarPedidoEmail(pedidoId: string, email: string, _pdfBuffer: Buffer) {
  type PgResp<T> = { data: T | null; error: unknown | null };
  const r2 = (await supabase
    .from('pedidos_compra')
    .update({
      email_enviado: true,
      data_envio_email: new Date().toISOString(),
      status: 'enviado',
    })
    .eq('id', pedidoId)
    .select()
    .single()) as unknown as PgResp<unknown>;

  if (r2.error) throw r2.error;
  const pedido = PedidoCompraSchema.parse(r2.data);

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'email',
    mensagem: `Pedido enviado por email para ${email}`,
  });

  return pedido;
}

export async function enviarPedidoWhatsApp(pedidoId: string, telefone: string, _pdfUrl: string) {
  type PgResp<T> = { data: T | null; error: unknown | null };
  const r3 = (await supabase
    .from('pedidos_compra')
    .update({
      whatsapp_enviado: true,
      data_envio_whatsapp: new Date().toISOString(),
      status: 'enviado',
    })
    .eq('id', pedidoId)
    .select()
    .single()) as unknown as PgResp<unknown>;

  if (r3.error) throw r3.error;
  const pedido = PedidoCompraSchema.parse(r3.data);

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'whatsapp',
    mensagem: `Pedido enviado por WhatsApp para ${telefone}`,
  });

  return pedido;
}

export async function atualizarStatusPedido(pedidoId: string, status: PedidoCompra['status']) {
  type PgResp<T> = { data: T | null; error: unknown | null };
  const r4 = (await supabase
    .from('pedidos_compra')
    .update({ status })
    .eq('id', pedidoId)
    .select()
    .single()) as unknown as PgResp<unknown>;

  if (r4.error) throw r4.error;
  const pedido = PedidoCompraSchema.parse(r4.data);

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'status',
    mensagem: `Status do pedido atualizado para ${status}`,
  });

  return pedido;
}

export async function listarPedidos() {
  type PgRespArr<T> = { data: T[] | null; error: unknown | null };
  const r5 = (await supabase
    .from('pedidos_compra')
    .select(
      `
      *,
      itens_pedido_compra (
        *,
        insumo:insumos (*)
      ),
      notificacoes_pedido (*)
    `
    )
    .order('created_at', { ascending: false })) as unknown as PgRespArr<unknown>;

  if (r5.error) throw r5.error;

  const parsed = PedidoCompraDetalhadoArraySchema.parse(r5.data ?? []);
  return parsed;
}
