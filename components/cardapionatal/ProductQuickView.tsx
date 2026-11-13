'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import {
  formatarPreco,
  mensagemProduto,
  urlWhatsApp,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';

interface Props {
  produto: ProdutoCardapio;
  qtd: number; // quantidade deste produto no pedido
  onQtd: (qtd: number) => void;
  onVerPedido: () => void;
  onFechar: () => void;
}

export default function ProductQuickView({ produto, qtd, onQtd, onVerPedido, onFechar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const v = videoRef.current;
    return () => v?.pause(); // pausa ao fechar
  }, []);

  const { midia_tipo: tipo, midia_url: url, poster_url: poster } = produto;

  return (
    <div className="cn-modal-backdrop" onClick={onFechar} role="presentation">
      <div
        className="cn-modal"
        role="dialog"
        aria-modal="true"
        aria-label={produto.nome}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={fecharRef}
          type="button"
          className="cn-modal-close"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {url && tipo === 'video' && (
          <video
            ref={videoRef}
            src={url}
            poster={poster ?? undefined}
            className="cn-media"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}
        {url && (tipo === 'gif' || tipo === 'imagem') && (
          <img src={url} alt={produto.nome} className="cn-media" loading="lazy" />
        )}

        <div className="cn-modal-body">
          <h2 className="cn-modal-title">{produto.nome}</h2>
          <p className="cn-modal-price">{formatarPreco(produto.preco)}</p>
          {produto.descricao && <p className="cn-modal-desc">{produto.descricao}</p>}

          <div className="cn-modal-actions">
            {qtd === 0 ? (
              <button type="button" className="cn-modal-wa" onClick={() => onQtd(1)}>
                <Plus size={18} /> Adicionar ao pedido
              </button>
            ) : (
              <>
                <div className="cn-modal-qtd">
                  <div className="cn-stepper cn-stepper-lg" role="group" aria-label="Quantidade">
                    <button type="button" onClick={() => onQtd(qtd - 1)} aria-label="Diminuir">
                      <Minus size={16} />
                    </button>
                    <span key={qtd} className="cn-pop" aria-live="polite">
                      {qtd}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQtd(Math.min(99, qtd + 1))}
                      aria-label="Aumentar"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="cn-muted">no seu pedido</span>
                </div>
                <button type="button" className="cn-modal-wa" onClick={onFechar}>
                  <Plus size={18} /> Continuar escolhendo
                </button>
                <button type="button" className="cn-modal-list" onClick={onVerPedido}>
                  <ShoppingBag size={16} /> Finalizar pedido
                </button>
              </>
            )}
            <a
              href={urlWhatsApp(mensagemProduto(produto))}
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              <MessageCircle size={14} /> Só tirar dúvida sobre este item
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
