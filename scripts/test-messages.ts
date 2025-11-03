/// <reference types="node" />
import { enviarWhatsAppPedido } from '../lib/whatsapp';
import { enviarEmailPedido } from '../lib/email';
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

async function testarEnvios() {
  try {
    // Gerar PDF de teste
    console.log('Gerando PDF de teste...');
    const pdfBuffer = await gerarPDFTeste();

    // Testar envio de email
    console.log('\nTestando envio de email...');
    const emailResult = await enviarEmailPedido(
      'eduardopedro.fsa@gmail.com',
      'Teste - Pedido de Compra',
      'Este é um email de teste do Sistema Lari.',
      pdfBuffer
    );
    console.log('Resultado do envio de email:', emailResult ? 'Sucesso' : 'Falha');

    // Testar envio de WhatsApp
    console.log('\nTestando envio de WhatsApp...');
    const whatsappResult = await enviarWhatsAppPedido(
      '75991156937',
      'Este é um teste do Sistema Lari.',
      'https://example.com/test.pdf' // URL de teste
    );
    console.log('Resultado do envio de WhatsApp:', whatsappResult ? 'Sucesso' : 'Falha');
  } catch (error) {
    console.error('Erro nos testes:', error);
  }
}

// Executar testes
void testarEnvios();
