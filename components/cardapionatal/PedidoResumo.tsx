'use client';

import { useState } from 'react';
import { Download, MessageCircle } from 'lucide-react';
import {
  PRAZO_TEXTO,
  formatarData,
  formatarPreco,
  rotuloRecebimento,
  type ClientePedido,
  type LinhaPedido,
} from '@/lib/cardapio-natal';
import { compartilharOuBaixarPdf, gerarPdfPedido } from '@/lib/pedido-pdf';

interface Props {
  codigo: string;
  emitidoEm: number;
  cliente: ClientePedido;
  linhas: LinhaPedido[];
  total: number;
  temSobConsulta: boolean;
}

/** Página que a Larissa abre pelo link do WhatsApp: resumo do pedido + PDF para salvar. */
export default function PedidoResumo({
  codigo,
  emitidoEm,
  cliente,
  linhas,
  total,
  temSobConsulta,
}: Props) {
  const [gerando, setGerando] = useState(false);

  const baixar = async () => {
    setGerando(true);
    try {
      const blob = await gerarPdfPedido({
        codigo,
        emitidoEm,
        linhas,
        total,
        temSobConsulta,
        cliente,
      });
      await compartilharOuBaixarPdf(blob, codigo, `Pedido ${codigo}`);
    } finally {
      setGerando(false);
    }
  };

  const digitos = cliente.telefone.replace(/\D/g, '');
  const telWa = digitos.startsWith('55') ? digitos : `55${digitos}`;
  const emitido = new Date(emitidoEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <main className="cn-pedido-page">
      <div className="cn-pedido-card">
        <img
          src="/cardapionatal/pedido-header.jpg"
          alt="Larissa Saba Gourmet — Cardápio Natalino"
          className="cn-pedido-banner"
        />
        <div className="cn-pedido-body">
          <div className="cn-pedido-title">
            <h1>Pedido de Natal</h1>
            <span>
              Nº {codigo} · {emitido}
            </span>
          </div>

          <dl className="cn-pedido-dados">
            <dt>Cliente</dt>
            <dd>{cliente.nome}</dd>
            <dt>Telefone</dt>
            <dd>{cliente.telefone}</dd>
            <dt>Recebimento</dt>
            <dd>{rotuloRecebimento(cliente.recebimento)}</dd>
            <dt>Data desejada</dt>
            <dd>{cliente.data ? formatarData(cliente.data) : '—'}</dd>
            {cliente.recebimento === 'entrega' && (
              <>
                <dt>Endereço</dt>
                <dd>{cliente.endereco}</dd>
              </>
            )}
            <dt>Pagamento</dt>
            <dd>{cliente.pagamento}</dd>
          </dl>

          <table className="cn-pedido-tabela">
            <thead>
              <tr>
                <th>Qtd</th>
                <th>Produto</th>
                <th className="n">Unitário</th>
                <th className="n">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td>{l.qtd}x</td>
                  <td>{l.nome}</td>
                  <td className="n">
                    {l.unitario == null ? 'sob consulta' : formatarPreco(l.unitario)}
                  </td>
                  <td className="n">
                    <strong>
                      {l.subtotal == null ? 'sob consulta' : formatarPreco(l.subtotal)}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cn-pedido-total">
            <span>Total dos itens</span>
            <strong>{formatarPreco(total)}</strong>
          </div>
          {temSobConsulta && (
            <p className="cn-pedido-nota">Há itens sob consulta, que não entram no total.</p>
          )}
          {cliente.recebimento === 'entrega' && (
            <p className="cn-pedido-nota">
              Taxa de entrega a combinar com o cliente (não inclusa no total).
            </p>
          )}
          {cliente.observacoes.trim() && (
            <p className="cn-pedido-obs">
              <strong>Observações:</strong> {cliente.observacoes}
            </p>
          )}
          <p className="cn-pedido-nota">
            Encomendas até {PRAZO_TEXTO}. Pedido sujeito a confirmação.
          </p>

          <div className="cn-pedido-acoes">
            <button type="button" className="cn-pedido-btn" onClick={baixar} disabled={gerando}>
              <Download size={18} /> {gerando ? 'Gerando PDF…' : 'Baixar PDF do pedido'}
            </button>
            {digitos.length >= 10 && (
              <a
                className="cn-pedido-btn cn-pedido-btn-wa"
                href={`https://wa.me/${telWa}?text=${encodeURIComponent(`Olá, ${cliente.nome}! Recebi seu pedido ${codigo}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} /> Responder ao cliente
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
