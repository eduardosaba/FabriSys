import { NextResponse } from 'next/server';
import { enviarEmailPedido } from '@/lib/email';
import { enviarPedidoEmail } from '@/lib/pedidos';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const BodySchema = z.object({
      pedidoId: z.string().optional(),
      email: z.string().email(),
      // Recebemos o PDF como array de bytes (números 0..255)
      pdfBuffer: z.array(z.number().int().min(0).max(255)),
    });
    const { pedidoId, email, pdfBuffer } = BodySchema.parse(await request.json());
    const buffer = Buffer.from(Uint8Array.from(pdfBuffer));

    // Enviar email
    await enviarEmailPedido(
      email,
      'Pedido de Compra',
      'Segue em anexo o pedido de compra.',
      buffer
    );

    // Atualizar status do pedido
    if (pedidoId) {
      await enviarPedidoEmail(pedidoId, email, buffer);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
  }
}
