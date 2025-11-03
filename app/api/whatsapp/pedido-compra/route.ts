import { NextResponse } from 'next/server';
import { enviarWhatsAppPedido as enviarWhatsApp } from '@/lib/whatsapp';
import { enviarPedidoWhatsApp } from '@/lib/pedidos';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const BodySchema = z.object({
      pedidoId: z.string().optional(),
      telefone: z.string().min(8),
      pdfUrl: z.string().url(),
    });
    const { pedidoId, telefone, pdfUrl } = BodySchema.parse(await request.json());

    // Enviar WhatsApp
    await enviarWhatsApp(
      telefone,
      'Segue o pedido de compra solicitado. Você pode acessar o PDF através do link abaixo.',
      pdfUrl
    );

    // Atualizar status do pedido
    if (pedidoId) {
      await enviarPedidoWhatsApp(pedidoId, telefone, pdfUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao enviar WhatsApp' }, { status: 500 });
  }
}
