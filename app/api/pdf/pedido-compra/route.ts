/// <reference types="node" />
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { gerarPedidoCompraPDF } from '@/lib/pdf';

export async function POST(request: Request) {
  try {
    const { itens } = (await request.json()) as {
      itens: Array<{
        insumo: { nome: string; unidade_medida: string; ultimo_valor?: number };
        quantidade: number;
      }>;
    };

    const buffer = await gerarPedidoCompraPDF(itens);
    const bytes = new Uint8Array(buffer);
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=pedido-compra.pdf',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF', details: String(error) },
      { status: 500 }
    );
  }
}
