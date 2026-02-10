'use server';

import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base64Logo } from './assets/logo'; // Certifique-se que isso é uma string "data:image/png;base64,..."
import { Buffer } from 'buffer';

interface ItemPedido {
  insumo: {
    nome: string;
    unidade_medida: string;
    ultimo_valor?: number;
  };
  quantidade: number;
}

// Helper para formatar dinheiro no padrão brasileiro
const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

/**
 * Gera um PDF de pedido de compra com os itens fornecidos
 */
export async function gerarPedidoCompraPDF(itens: ItemPedido[]): Promise<Buffer> {
  // 1. Validação de segurança básica
  if (!itens || itens.length === 0) {
    throw new Error('Não é possível gerar um pedido sem itens.');
  }

  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const valorTotal = itens.reduce(
    (total, item) => total + item.quantidade * (item.insumo.ultimo_valor || 0),
    0
  );

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido de Compra</title>
      <style>
        body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            margin: 40px; 
            color: #333;
            line-height: 1.5;
        }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .logo { max-height: 80px; margin-bottom: 15px; } /* Ajustado para altura em vez de largura */
        .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 10px 0; color: #2c3e50; }
        .date { color: #7f8c8d; font-size: 14px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background-color: #f8f9fa; font-weight: bold; color: #2c3e50; text-transform: uppercase; font-size: 11px; }
        tr:nth-child(even) { background-color: #fafafa; }
        
        .valores { text-align: right; } /* Alinha colunas de dinheiro à direita */
        
        .total-container { margin-top: 30px; text-align: right; }
        .total-label { font-size: 14px; color: #666; margin-right: 10px; }
        .total-value { font-size: 20px; font-weight: bold; color: #2c3e50; }

        .footer { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0;
            text-align: center; 
            font-size: 10px; 
            color: #999; 
            padding: 20px;
            background-color: white;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${base64Logo ? `<img src="${base64Logo}" alt="Logo" class="logo">` : ''}
        <h1 class="title">Ordem de Compra</h1>
        <div class="date">Gerado em: ${dataAtual}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Qtd</th>
            <th>Unidade</th>
            <th class="valores">Valor Unit. (Est.)</th>
            <th class="valores">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map((item) => {
              const valorUnitario = item.insumo.ultimo_valor || 0;
              const subtotal = item.quantidade * valorUnitario;
              return `
            <tr>
              <td>${item.insumo.nome}</td>
              <td>${item.quantidade}</td>
              <td>${item.insumo.unidade_medida}</td>
              <td class="valores">${item.insumo.ultimo_valor ? formatarMoeda(valorUnitario) : '-'}</td>
              <td class="valores">${item.insumo.ultimo_valor ? formatarMoeda(subtotal) : '-'}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>

      <div class="total-container">
        <span class="total-label">VALOR TOTAL ESTIMADO</span>
        <div class="total-value">${formatarMoeda(valorTotal)}</div>
      </div>

      <div class="footer">
        <p>Este documento é uma ordem de compra baseada nos últimos valores registrados. Os preços estão sujeitos a alteração.</p>
      </div>
    </body>
    </html>
  `;

  // Configuração do Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Ajuda em ambientes containerizados (Docker)
      '--font-render-hinting=none', // Melhora renderização de texto
    ],
  });

  try {
    const page = await browser.newPage();

    // Carrega o HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Importante para imprimir cores de fundo (linhas da tabela)
      margin: { top: '40px', right: '30px', bottom: '60px', left: '30px' },
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha na geração do arquivo PDF');
  } finally {
    await browser.close();
  }
}
