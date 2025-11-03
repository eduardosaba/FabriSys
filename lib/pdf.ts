/// <reference types="node" />
'use server';

import * as htmlPdf from 'html-pdf-node';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base64Logo } from './assets/logo';
import { Buffer } from 'buffer';

interface ItemPedido {
  insumo: {
    nome: string;
    unidade_medida: string;
    ultimo_valor?: number;
  };
  quantidade: number;
}

/**
 * Gera um PDF de pedido de compra com os itens fornecidos
 */
export async function gerarPedidoCompraPDF(itens: ItemPedido[]): Promise<Buffer> {
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const valorTotal = itens.reduce(
    (total, item) => total + item.quantidade * (item.insumo.ultimo_valor || 0),
    0
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido de Compra</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 200px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; margin: 20px 0; }
        .date { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .total { margin-top: 30px; text-align: right; font-weight: bold; }
        .footer { margin-top: 50px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${base64Logo}" alt="Logo" class="logo">
        <h1 class="title">Ordem de Compra</h1>
        <div class="date">Data: ${dataAtual}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Quantidade</th>
            <th>Unidade</th>
            <th>Último Valor</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map(
              (item) => `
            <tr>
              <td>${item.insumo.nome}</td>
              <td>${item.quantidade}</td>
              <td>${item.insumo.unidade_medida}</td>
              <td>${
                item.insumo.ultimo_valor ? `R$ ${item.insumo.ultimo_valor.toFixed(2)}` : 'N/A'
              }</td>
              <td>${
                item.insumo.ultimo_valor
                  ? `R$ ${(item.quantidade * item.insumo.ultimo_valor).toFixed(2)}`
                  : 'N/A'
              }</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="total">
        Valor Total Estimado: R$ ${valorTotal.toFixed(2)}
      </div>

      <div class="footer">
        <p>Este é um valor estimado baseado nas últimas compras realizadas.</p>
      </div>
    </body>
    </html>
  `;

  const options: htmlPdf.Options = {
    format: 'A4',
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  };

  const file: htmlPdf.File = { content: html };
  // Tipagem de html-pdf-node pode não refletir o retorno (Buffer). Forçamos o cast.
  const buffer = (await (
    htmlPdf as unknown as { generatePdf: (f: htmlPdf.File, o?: htmlPdf.Options) => Promise<Buffer> }
  ).generatePdf(file, options)) as Buffer;
  return buffer;
}
