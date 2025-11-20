import { NextResponse } from 'next/server';
import { enviarEmailPedido } from '@/lib/email';
import { enviarWhatsAppPedido } from '@/lib/whatsapp';
import PDFDocument from 'pdfkit';

async function gerarPDFTeste(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.text('PDF de Teste - Pedido de Compra', { align: 'center' });
    doc.moveDown();
    doc.text('Este é um PDF de teste para validar o envio de mensagens.');

    doc.end();
  });
}

export async function GET(_request: Request) {
  try {
    // Gerar PDF de teste
    console.log('Gerando PDF de teste...');
    const pdfBuffer = await gerarPDFTeste();

    const resultados = {
      email: false,
      whatsapp: false,
      erros: [] as string[],
    };

    // Testar envio de email
    try {
      console.log('Testando envio de email...');
      resultados.email = await enviarEmailPedido(
        'eduardopedro.fsa@gmail.com',
        'Teste - Pedido de Compra',
        'Este é um email de teste do Confectio.',
        pdfBuffer
      );
    } catch (error) {
      resultados.erros.push(
        `Erro no email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }

    // Testar envio de WhatsApp
    try {
      console.log('Testando envio de WhatsApp...');
      resultados.whatsapp = await enviarWhatsAppPedido(
        '75991156937',
        'Este é um teste do Confectio.',
        'https://example.com/test.pdf' // URL de teste
      );
    } catch (error) {
      resultados.erros.push(
        `Erro no WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }

    return NextResponse.json(resultados);
  } catch (error) {
    console.error('Erro nos testes:', error);
    return NextResponse.json({ error: 'Erro ao executar testes' }, { status: 500 });
  }
}
