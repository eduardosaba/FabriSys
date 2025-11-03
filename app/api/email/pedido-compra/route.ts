import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { enviarEmailPedido } from '@/lib/email';
import { enviarPedidoEmail } from '@/lib/pedidos';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { pedidoId, email, pdfBuffer } = await request.json();

    // Enviar email
    await enviarEmailPedido(
      email,
      'Pedido de Compra',
      'Segue em anexo o pedido de compra.',
      pdfBuffer
    );

    // Atualizar status do pedido
    await enviarPedidoEmail(pedidoId, email, pdfBuffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
  }
}
