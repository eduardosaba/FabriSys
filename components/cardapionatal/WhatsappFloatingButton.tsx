'use client';

import { MessageCircle, ShoppingBag } from 'lucide-react';
import { formatarPreco, urlWhatsApp } from '@/lib/cardapio-natal';

interface Props {
  totalItens: number;
  totalValor: number;
  onAbrirPedido: () => void;
}

/** Sem itens: atalho para o WhatsApp. Com itens: abre o pedido (carrinho). */
export default function WhatsappFloatingButton({ totalItens, totalValor, onAbrirPedido }: Props) {
  if (totalItens === 0) {
    return (
      <div className="cn-wa-wrap">
        <a
          href={urlWhatsApp()}
          target="_blank"
          rel="noopener noreferrer"
          className="cn-wa"
          aria-label="Fazer encomenda no WhatsApp"
        >
          <MessageCircle size={20} />
          <span>Fazer encomenda no WhatsApp</span>
        </a>
      </div>
    );
  }
  return (
    <div className="cn-wa-wrap">
      <button
        type="button"
        className="cn-wa"
        onClick={onAbrirPedido}
        aria-label={`Abrir meu pedido com ${totalItens} itens`}
      >
        <ShoppingBag size={20} />
        <span className="cn-wa-texto">
          Meu pedido ({totalItens}) · {formatarPreco(totalValor)}
        </span>
        <span className="cn-wa-count">{totalItens}</span>
      </button>
    </div>
  );
}
