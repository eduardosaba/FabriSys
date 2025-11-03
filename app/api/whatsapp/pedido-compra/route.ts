import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { enviarWhatsAppPedido as enviarWhatsApp } from '@/lib/whatsapp';
import { enviarPedidoWhatsApp } from '@/lib/pedidos';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { pedidoId, telefone, pdfUrl } = await request.json();

    // Enviar WhatsApp
    await enviarWhatsApp(
      telefone,
      'Segue o pedido de compra solicitado. Você pode acessar o PDF através do link abaixo.',
      pdfUrl
    );

    // Atualizar status do pedido
    await enviarPedidoWhatsApp(pedidoId, telefone, pdfUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao enviar WhatsApp' }, { status: 500 });
  }
}
