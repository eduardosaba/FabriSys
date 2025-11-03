import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Insumo } from '@/lib/types/insumos';
import { PedidoCompra, ItemPedidoCompra, NotificacaoPedido } from '@/lib/types/pedidos';

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
  const { data: pedido, error: erroPedido } = await supabase
    .from('pedidos_compra')
    .insert({
      valor_total: valorTotal,
      observacoes,
      status: 'pendente',
    })
    .select()
    .single();

  if (erroPedido) throw erroPedido;

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

export async function enviarPedidoEmail(pedidoId: string, email: string, pdfBuffer: Buffer) {
  const { data: pedido, error } = await supabase
    .from('pedidos_compra')
    .update({
      email_enviado: true,
      data_envio_email: new Date().toISOString(),
      status: 'enviado',
    })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) throw error;

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'email',
    mensagem: `Pedido enviado por email para ${email}`,
  });

  return pedido;
}

export async function enviarPedidoWhatsApp(pedidoId: string, telefone: string, pdfUrl: string) {
  const { data: pedido, error } = await supabase
    .from('pedidos_compra')
    .update({
      whatsapp_enviado: true,
      data_envio_whatsapp: new Date().toISOString(),
      status: 'enviado',
    })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) throw error;

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'whatsapp',
    mensagem: `Pedido enviado por WhatsApp para ${telefone}`,
  });

  return pedido;
}

export async function atualizarStatusPedido(pedidoId: string, status: PedidoCompra['status']) {
  const { data: pedido, error } = await supabase
    .from('pedidos_compra')
    .update({ status })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) throw error;

  // Criar notificação
  await supabase.from('notificacoes_pedido').insert({
    pedido_id: pedidoId,
    tipo: 'status',
    mensagem: `Status do pedido atualizado para ${status}`,
  });

  return pedido;
}

export async function listarPedidos() {
  const { data: pedidos, error } = await supabase
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
    .order('created_at', { ascending: false });

  if (error) throw error;

  return pedidos;
}
