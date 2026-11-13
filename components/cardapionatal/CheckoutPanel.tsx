'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Info, Minus, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import {
  FORMAS_PAGAMENTO,
  PRAZO_ENCOMENDA,
  PRAZO_TEXTO,
  codificarPedido,
  codigoPedido,
  formatarPreco,
  mensagemPedido,
  montarLinhas,
  totalLinhas,
  urlWhatsApp,
  validarCliente,
  type ClientePedido,
  type ItemPedido,
  type LinhaPedido,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';
import { compartilharOuBaixarPdf, gerarPdfPedido } from '@/lib/pedido-pdf';

/** Cópia do pedido no momento do envio (o carrinho é esvaziado, mas o PDF continua disponível). */
interface PedidoEnviado {
  codigo: string;
  texto: string;
  waUrl: string;
  itens: ItemPedido[];
  linhas: LinhaPedido[];
  total: number;
  temSobConsulta: boolean;
  cliente: ClientePedido;
  emitidoEm: number;
}

interface Props {
  produtos: ProdutoCardapio[];
  itens: ItemPedido[];
  cliente: ClientePedido;
  onCliente: (c: ClientePedido) => void;
  onQtd: (id: string, qtd: number) => void;
  onLimpar: () => void;
  onFechar: () => void;
}

export default function CheckoutPanel({
  produtos,
  itens,
  cliente,
  onCliente,
  onQtd,
  onLimpar,
  onFechar,
}: Props) {
  const [erros, setErros] = useState<string[]>([]);
  const [enviado, setEnviado] = useState<PedidoEnviado | null>(null);
  const [gerando, setGerando] = useState(false);
  const [registro, setRegistro] = useState<'enviando' | 'ok' | 'erro'>('enviando');
  // Mesmo pedido = mesmo código e mesmo link (emissão fixada ao abrir o painel)
  const [emitidoEm] = useState(() => Date.now());

  const linhas = useMemo(() => montarLinhas(itens, produtos), [itens, produtos]);
  const { total, temSobConsulta } = totalLinhas(linhas);
  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const set = <K extends keyof ClientePedido>(k: K, v: ClientePedido[K]) =>
    onCliente({ ...cliente, [k]: v });

  const dadosDoPedido = () => {
    const codigo = codigoPedido(emitidoEm, itens);
    const link = `${window.location.origin}/cardapionatal/pedido?d=${codificarPedido({ itens, cliente, emitidoEm })}`;
    const texto = mensagemPedido({ linhas, total, temSobConsulta, cliente, codigo, link });
    return { codigo, link, texto };
  };

  /** Registra o pedido no sistema da Larissa (rota de servidor; preços são recalculados lá). */
  const registrarPedido = async (p: {
    itens: ItemPedido[];
    cliente: ClientePedido;
    emitidoEm: number;
  }) => {
    setRegistro('enviando');
    try {
      const r = await fetch('/api/cardapio-natal/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
        keepalive: true,
      });
      setRegistro(r.ok ? 'ok' : 'erro');
    } catch {
      setRegistro('erro');
    }
  };

  const enviarWhatsApp = () => {
    const e = validarCliente(cliente);
    setErros(e);
    if (e.length || !linhas.length) return;
    const { codigo, texto } = dadosDoPedido();
    const waUrl = urlWhatsApp(texto);
    // window.open precisa ocorrer direto no clique (antes de qualquer await)
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setEnviado({
      codigo,
      texto,
      waUrl,
      itens,
      linhas,
      total,
      temSobConsulta,
      cliente: { ...cliente },
      emitidoEm,
    });
    void registrarPedido({ itens, cliente: { ...cliente }, emitidoEm });
    onLimpar(); // pedido enviado: esvazia o carrinho
  };

  const baixarPdf = async () => {
    setGerando(true);
    try {
      if (enviado) {
        const blob = await gerarPdfPedido({
          codigo: enviado.codigo,
          emitidoEm: enviado.emitidoEm,
          linhas: enviado.linhas,
          total: enviado.total,
          temSobConsulta: enviado.temSobConsulta,
          cliente: enviado.cliente,
        });
        await compartilharOuBaixarPdf(blob, enviado.codigo, enviado.texto);
        return;
      }
      const e = validarCliente(cliente);
      setErros(e);
      if (e.length || !linhas.length) return;
      const { codigo, texto } = dadosDoPedido();
      const blob = await gerarPdfPedido({
        codigo,
        emitidoEm,
        linhas,
        total,
        temSobConsulta,
        cliente,
      });
      await compartilharOuBaixarPdf(blob, codigo, texto);
    } finally {
      setGerando(false);
    }
  };

  // Tela de confirmação (carrinho já foi esvaziado)
  if (enviado) {
    return (
      <div className="cn-modal-backdrop cn-drawer-backdrop" onClick={onFechar} role="presentation">
        <aside
          className="cn-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Pedido enviado"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="cn-drawer-head">
            <h2>Pedido enviado</h2>
            <button
              type="button"
              className="cn-modal-close cn-drawer-close"
              onClick={onFechar}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </header>
          <div className="cn-drawer-body">
            <p className="cn-enviado" role="status">
              <CheckCircle2 size={18} />
              <span>
                Abrimos o WhatsApp com o seu pedido <strong>Nº {enviado.codigo}</strong>. Ele só é
                finalizado quando você
                <strong> envia a mensagem</strong> para a Larissa. Se o WhatsApp não abriu, use o
                botão abaixo.
              </span>
            </p>
            <p className="cn-muted">
              O carrinho foi esvaziado. Se quiser, baixe o PDF do pedido e anexe na conversa.
            </p>
            {registro === 'enviando' && <p className="cn-muted">Registrando o pedido…</p>}
            {registro === 'ok' && (
              <p className="cn-registro-ok">Pedido registrado no sistema da Larissa Saba.</p>
            )}
            {registro === 'erro' && (
              <p className="cn-erros" role="alert">
                Não conseguimos registrar o pedido no sistema agora, mas a mensagem do WhatsApp é o
                que vale.{' '}
                <button
                  type="button"
                  className="cn-link"
                  onClick={() =>
                    void registrarPedido({
                      itens: enviado.itens,
                      cliente: enviado.cliente,
                      emitidoEm: enviado.emitidoEm,
                    })
                  }
                >
                  Tentar registrar de novo
                </button>
              </p>
            )}
          </div>
          <footer className="cn-drawer-foot">
            <a
              className="cn-modal-wa"
              href={enviado.waUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} /> Abrir o WhatsApp novamente
            </a>
            <button type="button" className="cn-modal-list" onClick={baixarPdf} disabled={gerando}>
              <Download size={16} />{' '}
              {gerando ? 'Gerando PDF…' : 'Baixar / compartilhar PDF do pedido'}
            </button>
            <button type="button" className="cn-link" onClick={onFechar}>
              Voltar ao cardápio
            </button>
          </footer>
        </aside>
      </div>
    );
  }

  return (
    <div className="cn-modal-backdrop cn-drawer-backdrop" onClick={onFechar} role="presentation">
      <aside
        className="cn-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Meu pedido"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cn-drawer-head">
          <h2>Meu pedido</h2>
          <button
            type="button"
            className="cn-modal-close cn-drawer-close"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="cn-drawer-body">
          {linhas.length > 0 && (
            <p className="cn-aviso" role="note">
              <Info size={16} />
              <span>
                Seu pedido <strong>só é finalizado</strong> quando você tocar em{' '}
                <strong>“Enviar pedido pelo WhatsApp”</strong> e enviar a mensagem para a Larissa.
                Até lá, os itens ficam apenas neste aparelho.
              </span>
            </p>
          )}
          {linhas.length === 0 ? (
            <p className="cn-muted">
              Seu pedido está vazio. Toque nos “+” do cardápio para adicionar itens.
            </p>
          ) : (
            <ul className="cn-itens">
              {itens.map((it) => {
                const p = porId.get(it.id);
                if (!p) return null;
                return (
                  <li key={it.id}>
                    <div className="cn-item-nome">
                      {p.nome}
                      <small>
                        {formatarPreco(p.preco)}
                        {p.preco != null && it.qtd > 1
                          ? ` x ${it.qtd} = ${formatarPreco(p.preco * it.qtd)}`
                          : ''}
                      </small>
                    </div>
                    <div className="cn-stepper" role="group" aria-label={`Quantidade de ${p.nome}`}>
                      <button
                        type="button"
                        onClick={() => onQtd(it.id, it.qtd - 1)}
                        aria-label="Diminuir"
                      >
                        {it.qtd === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                      </button>
                      <span key={it.qtd} className="cn-pop" aria-live="polite">
                        {it.qtd}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQtd(it.id, Math.min(99, it.qtd + 1))}
                        aria-label="Aumentar"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {linhas.length > 0 && (
            <>
              <div className="cn-total">
                <span>Total dos itens</span>
                <strong key={total} className="cn-pop">
                  {formatarPreco(total)}
                </strong>
              </div>
              {temSobConsulta && (
                <p className="cn-muted">Há itens sob consulta, que não entram no total.</p>
              )}

              <form className="cn-form" onSubmit={(e) => e.preventDefault()} noValidate>
                <label>
                  Nome completo *
                  <input
                    value={cliente.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                  />
                </label>
                <label>
                  Telefone / WhatsApp *
                  <input
                    value={cliente.telefone}
                    onChange={(e) => set('telefone', e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(75) 99999-9999"
                    maxLength={25}
                  />
                </label>

                <fieldset>
                  <legend>Recebimento *</legend>
                  <div className="cn-radios">
                    {(['retirada', 'entrega'] as const).map((r) => (
                      <label key={r} className={cliente.recebimento === r ? 'ativo' : ''}>
                        <input
                          type="radio"
                          name="recebimento"
                          checked={cliente.recebimento === r}
                          onChange={() => set('recebimento', r)}
                        />
                        {r === 'retirada' ? 'Retirada na loja' : 'Entrega'}
                      </label>
                    ))}
                  </div>
                  {cliente.recebimento === 'entrega' && (
                    <p className="cn-muted">
                      A taxa de entrega, se houver, será combinada com a Larissa pelo WhatsApp.
                    </p>
                  )}
                </fieldset>

                <label>
                  Data desejada * <small>(até {PRAZO_TEXTO})</small>
                  <input
                    type="date"
                    value={cliente.data}
                    min={new Date().toISOString().slice(0, 10)}
                    max={PRAZO_ENCOMENDA}
                    onChange={(e) => set('data', e.target.value)}
                  />
                </label>

                {cliente.recebimento === 'entrega' && (
                  <label>
                    Endereço de entrega *
                    <textarea
                      rows={2}
                      value={cliente.endereco}
                      onChange={(e) => set('endereco', e.target.value)}
                      placeholder="Rua, número, bairro, referência"
                      maxLength={200}
                    />
                  </label>
                )}

                <fieldset>
                  <legend>Forma de pagamento *</legend>
                  <div className="cn-radios">
                    {FORMAS_PAGAMENTO.map((f) => (
                      <label key={f} className={cliente.pagamento === f ? 'ativo' : ''}>
                        <input
                          type="radio"
                          name="pagamento"
                          checked={cliente.pagamento === f}
                          onChange={() => set('pagamento', f)}
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label>
                  Observações
                  <textarea
                    rows={2}
                    value={cliente.observacoes}
                    onChange={(e) => set('observacoes', e.target.value)}
                    maxLength={300}
                    placeholder="Alguma preferência ou aviso?"
                  />
                </label>
              </form>

              {erros.length > 0 && (
                <ul className="cn-erros" role="alert">
                  {erros.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {linhas.length > 0 && (
          <footer className="cn-drawer-foot">
            <button type="button" className="cn-modal-wa" onClick={enviarWhatsApp}>
              <MessageCircle size={18} /> Enviar pedido pelo WhatsApp
            </button>
            <button type="button" className="cn-modal-list" onClick={baixarPdf} disabled={gerando}>
              <Download size={16} />{' '}
              {gerando ? 'Gerando PDF…' : 'Baixar / compartilhar PDF do pedido'}
            </button>
            <p className="cn-foot-nota">
              O pedido só é finalizado ao enviar a mensagem no WhatsApp. Ao enviar, seus dados ficam
              registrados no sistema da Larissa Saba apenas para atender o pedido.
            </p>
            <button type="button" className="cn-link" onClick={onLimpar}>
              Limpar pedido
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
