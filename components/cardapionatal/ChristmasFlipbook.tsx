'use client';

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import {
  PAGINA_ASPECTO,
  TOTAL_PAGINAS,
  paginaSrc,
  CLIENTE_VAZIO,
  montarLinhas,
  pontoHotspot,
  totalLinhas,
  urlWhatsApp,
  type ClientePedido,
  type ConfigCardapio,
  type Hotspot,
  type ItemPedido,
  type PaginaCfg,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';
import CheckoutPanel from './CheckoutPanel';
import FlipbookControls from './FlipbookControls';
import MusicaFundo from './MusicaFundo';
import ProductQuickView from './ProductQuickView';
import VideoOverlay from './VideoOverlay';
import WhatsappFloatingButton from './WhatsappFloatingButton';

// react-pageflip exige todas as props do setting no tipo; usamos um alias solto.

const Book = HTMLFlipBook as any;

interface PageProps {
  pos: number; // posição no livro (1..N)
  pagina: PaginaCfg;
  carregar: boolean;
  hotspots: { produto: ProdutoCardapio; hotspot: Hotspot }[];
  visivel: boolean;
  onSelecionar: (p: ProdutoCardapio) => void;
}

function PaginaVideo({
  src,
  poster,
  tocar,
  repetir,
  className = 'h-full w-full select-none object-cover',
  style,
}: {
  src: string;
  poster?: string;
  tocar: boolean;
  repetir: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (tocar) {
      if (!repetir) v.currentTime = 0; // sem loop: recomeça cada vez que a página aparece
      void v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [tocar, repetir]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      style={style}
      muted
      loop={repetir}
      playsInline
      preload="metadata"
    />
  );
}

const Page = forwardRef<HTMLDivElement, PageProps>(function Page(
  { pos, pagina, carregar, hotspots, visivel, onSelecionar },
  ref
) {
  const original = pagina.pagina <= TOTAL_PAGINAS ? paginaSrc(pagina.pagina) : undefined;
  const alt = `Cardápio Natalino — página ${pos}`;
  return (
    <div ref={ref} className="cn-page">
      {carregar && pagina.midia_url && pagina.midia_tipo === 'video' ? (
        <PaginaVideo
          src={pagina.midia_url}
          poster={original}
          tocar={visivel}
          repetir={pagina.repetir}
        />
      ) : carregar && (pagina.midia_url || original) ? (
        <img
          src={pagina.midia_url ?? original}
          alt={alt}
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      ) : (
        <div className="h-full w-full bg-[#7a0c12]" />
      )}
      {/* áreas animadas (vídeo/GIF/imagem sobre uma região da página) */}
      {carregar &&
        pagina.areas.map((a, i) => {
          const estilo: React.CSSProperties = {
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: `${a.w}%`,
            height: `${a.h}%`,
          };
          return a.tipo === 'video' ? (
            <PaginaVideo
              key={`a${i}`}
              src={a.url}
              tocar={visivel}
              repetir={a.repetir}
              className="cn-area"
              style={estilo}
            />
          ) : (
            <img
              key={`a${i}`}
              src={a.url}
              alt=""
              draggable={false}
              className="cn-area"
              style={estilo}
            />
          );
        })}
      {/* camada transparente por cima da mídia */}
      {carregar && pagina.overlay_url && (
        <img src={pagina.overlay_url} alt="" draggable={false} className="cn-overlay-img" />
      )}
      {/* sombra de dobra (lombada) */}
      <div className={`cn-gutter ${pos % 2 === 0 ? 'cn-gutter-right' : 'cn-gutter-left'}`} />
      {carregar &&
        hotspots.map(({ produto, hotspot }, i) => (
          <button
            key={`${produto.id}-${i}`}
            type="button"
            className="cn-hotspot"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.w}%`,
              height: `${hotspot.h}%`,
            }}
            aria-label={`Ver ${produto.nome}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelecionar(produto);
            }}
          >
            <span
              className="cn-hotspot-dot"
              aria-hidden="true"
              style={{
                left: `${((pontoHotspot(hotspot).px - hotspot.x) / hotspot.w) * 100}%`,
                top: `${((pontoHotspot(hotspot).py - hotspot.y) / hotspot.h) * 100}%`,
              }}
            >
              +
            </span>
          </button>
        ))}
    </div>
  );
});

const SS_INTRO = 'cardapio-natal-intro';
const SS_ABERTO = 'cardapio-natal-aberto';
const LS_PEDIDO = 'cardapio-natal-pedido';

export default function ChristmasFlipbook({
  produtos,
  paginas,
  config,
}: {
  produtos: ProdutoCardapio[];
  paginas: PaginaCfg[];
  config: ConfigCardapio;
}) {
  const bookRef = useRef<{
    pageFlip: () => {
      flipNext: () => void;
      flipPrev: () => void;
      flip: (n: number) => void;
      getCurrentPageIndex: () => number;
      turnToPage: (n: number) => void;
    };
  } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number; mobile: boolean } | null>(null);
  const [indice, setIndice] = useState(0);
  const [trocando, setTrocando] = useState(false); // esmaece a troca de página ao voltar (modo 1 página)
  const [zoom, setZoom] = useState(1);
  const [modo, setModo] = useState<'auto' | 'uma'>('auto');
  const [selecionado, setSelecionado] = useState<ProdutoCardapio | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [cliente, setCliente] = useState<ClientePedido>(CLIENTE_VAZIO);
  const [pedidoAberto, setPedidoAberto] = useState(false);
  const [lsPronto, setLsPronto] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [introAtiva, setIntroAtiva] = useState(!!config.intro_url);
  const [outroAberto, setOutroAberto] = useState(false);
  const interagiu = useRef(false);

  const total = paginas.length;

  // Pedido persistido no aparelho (some ao limpar o navegador; nada vai ao servidor)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PEDIDO);
      if (raw) {
        const o = JSON.parse(raw);
        if (Array.isArray(o.itens)) {
          setItens(
            o.itens.filter(
              (i: ItemPedido) =>
                i && typeof i.id === 'string' && Number.isInteger(i.qtd) && i.qtd > 0
            )
          );
        }
        if (o.cliente && typeof o.cliente === 'object')
          setCliente({ ...CLIENTE_VAZIO, ...o.cliente });
      }
    } catch {
      /* ignore */
    }
    setLsPronto(true);
  }, []);

  useEffect(() => {
    if (!lsPronto) return;
    try {
      localStorage.setItem(LS_PEDIDO, JSON.stringify({ itens, cliente }));
    } catch {
      /* ignore */
    }
  }, [itens, cliente, lsPronto]);

  const linhasPedido = useMemo(() => montarLinhas(itens, produtos), [itens, produtos]);
  const { total: totalValor } = totalLinhas(linhasPedido);
  const totalItens = linhasPedido.reduce((s, l) => s + l.qtd, 0);

  const definirQtd = useCallback((id: string, qtd: number) => {
    setItens((l) => {
      if (qtd < 1) return l.filter((i) => i.id !== id);
      const q = Math.min(99, qtd);
      return l.some((i) => i.id === id)
        ? l.map((i) => (i.id === id ? { ...i, qtd: q } : i))
        : [...l, { id, qtd: q }];
    });
  }, []);

  // Abertura em vídeo: só na 1ª visita da sessão
  useEffect(() => {
    if (!config.intro_url) return;
    try {
      if (sessionStorage.getItem(SS_INTRO) === '1') setIntroAtiva(false);
    } catch {
      /* sessionStorage indisponível */
    }
  }, [config.intro_url]);

  const fecharIntro = useCallback(() => {
    try {
      sessionStorage.setItem(SS_INTRO, '1');
    } catch {
      /* ignore */
    }
    setIntroAtiva(false);
  }, []);

  // Dimensões responsivas (página 9:16)
  useEffect(() => {
    const calc = () => {
      const el = stageRef.current;
      if (!el) return;
      const availW = el.clientWidth - 16;
      const availH = el.clientHeight - 16;
      const mobile = modo === 'uma' || availW < 760;
      const paginasLargura = mobile ? 1 : 2;
      let h = Math.min(availH, availW / (paginasLargura * PAGINA_ASPECTO));
      h = Math.max(280, Math.floor(h));
      setDim({ w: Math.floor(h * PAGINA_ASPECTO), h, mobile });
    };
    calc();
    window.addEventListener('resize', calc);
    const el = stageRef.current;
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', calc);
      ro?.disconnect();
    };
  }, [modo]);

  const mapaHotspots = useMemo(() => {
    const m = new Map<number, { produto: ProdutoCardapio; hotspot: Hotspot }[]>();
    for (const produto of produtos) {
      if (!produto.ativo) continue;
      for (const hotspot of produto.hotspots) {
        const arr = m.get(hotspot.pagina) ?? [];
        arr.push({ produto, hotspot });
        m.set(hotspot.pagina, arr);
      }
    }
    return m;
  }, [produtos]);

  const temOutro = !!config.outro_url;
  const naUltima = indice >= total - 1 || (!dim?.mobile && indice >= total - 2);

  const proxima = useCallback(() => {
    interagiu.current = true;
    if (naUltima && temOutro) {
      setOutroAberto(true);
      return;
    }
    bookRef.current?.pageFlip().flipNext();
  }, [naUltima, temOutro]);
  // Lê a página real do livro (o evento onFlip não é confiável no modo de 1 página)
  const sincronizarIndice = useCallback(() => {
    const i = bookRef.current?.pageFlip().getCurrentPageIndex?.();
    if (typeof i === 'number') setIndice(i);
  }, []);

  const anterior = useCallback(() => {
    interagiu.current = true;
    const pf = bookRef.current?.pageFlip();
    if (!pf) return;
    if (dim?.mobile) {
      // No modo de 1 página a biblioteca não anima o "voltar" (flipPrev/flip não fazem nada):
      // troca direto de página, com um rápido esmaecer para não parecer um salto seco.
      const alvo = Math.max(0, pf.getCurrentPageIndex() - 1);
      setTrocando(true);
      setTimeout(() => {
        bookRef.current?.pageFlip().turnToPage(alvo);
        sincronizarIndice();
        setTrocando(false);
      }, 140);
      return;
    }
    pf.flipPrev();
    setTimeout(sincronizarIndice, 1100); // garante o indicador/botões certos ao fim da animação
  }, [dim?.mobile, sincronizarIndice]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selecionado || introAtiva || outroAberto || pedidoAberto) {
        if (e.key === 'Escape') {
          setSelecionado(null);
          setPedidoAberto(false);
        }
        return;
      }
      if (e.key === 'ArrowRight') proxima();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proxima, anterior, selecionado, introAtiva, outroAberto, pedidoAberto]);

  // Animação de abertura automática da capa (1ª visita da sessão, após o vídeo de abertura)
  useEffect(() => {
    if (!pronto || introAtiva) return;
    let jaViu = false;
    try {
      jaViu = sessionStorage.getItem(SS_ABERTO) === '1';
      sessionStorage.setItem(SS_ABERTO, '1');
    } catch {
      /* sessionStorage indisponível */
    }
    if (jaViu) return;
    const t = setTimeout(() => {
      if (!interagiu.current) bookRef.current?.pageFlip().flipNext();
    }, 1600);
    const cancelar = () => {
      interagiu.current = true;
      clearTimeout(t);
    };
    window.addEventListener('pointerdown', cancelar, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', cancelar);
    };
  }, [pronto, introAtiva]);

  const alternarFullscreen = useCallback(() => {
    const root = document.getElementById('cn-root');
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen?.();
  }, []);

  const aberto = indice > 0;
  const rotulo = !dim
    ? ''
    : indice === 0
      ? `Capa — Página 1 de ${total}`
      : dim.mobile
        ? `Página ${indice + 1} de ${total}`
        : `Páginas ${indice + 1}–${Math.min(indice + 2, total)} de ${total}`;

  // Fundo: variáveis CSS; no celular usa a imagem própria (se houver) e cai na do computador
  const urlCss = (u: string) => `url("${u.replace(/"/g, '%22')}")`;
  const temFundo = !!(config.fundo_url || config.fundo_mobile_url);
  const fundoStyle = temFundo
    ? ({
        '--cn-fundo': config.fundo_url ? urlCss(config.fundo_url) : 'none',
        '--cn-fundo-m': config.fundo_mobile_url
          ? urlCss(config.fundo_mobile_url)
          : config.fundo_url
            ? urlCss(config.fundo_url)
            : 'none',
      } as React.CSSProperties)
    : undefined;

  return (
    <div id="cn-root" className={`cn-root${temFundo ? ' cn-tem-fundo' : ''}`} style={fundoStyle}>
      <header className="cn-header">
        <span className="cn-brand">Larissa Saba Gourmet</span>
        <span className="cn-brand-sub">Cardápio Natalino</span>
        <MusicaFundo
          musicas={config.musicas}
          volume={config.musica_volume}
          pausar={introAtiva || outroAberto}
        />
        <button
          type="button"
          className="cn-cart"
          onClick={() => setPedidoAberto(true)}
          aria-label={`Abrir meu pedido (${totalItens} ${totalItens === 1 ? 'item' : 'itens'})`}
        >
          <ShoppingBag size={18} />
          <span className="cn-cart-label">Meu pedido</span>
          {totalItens > 0 && (
            <span key={totalItens} className="cn-cart-badge cn-pop">
              {totalItens}
            </span>
          )}
        </button>
      </header>

      <div ref={stageRef} className={`cn-stage${zoom > 1 ? ' cn-stage-zoom' : ''}`}>
        {!dim ? (
          <div className="cn-loading" role="status">
            <span className="cn-spinner" /> Preparando o cardápio…
          </div>
        ) : (
          <div
            className="cn-zoom"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <div
              className="cn-book-wrap"
              style={{
                // livro fechado fica centrado na página da direita (efeito de capa)
                transform: !dim.mobile && !aberto ? `translateX(${-dim.w / 2}px)` : 'translateX(0)',
                opacity: trocando ? 0.2 : 1,
              }}
            >
              <Book
                key={`${dim.mobile ? 'm' : 'd'}-${total}`}
                ref={bookRef}
                width={dim.w}
                height={dim.h}
                size="fixed"
                minWidth={200}
                maxWidth={2000}
                minHeight={300}
                maxHeight={3000}
                showCover
                usePortrait={dim.mobile}
                maxShadowOpacity={0.55}
                drawShadow
                flippingTime={900}
                mobileScrollSupport={false}
                swipeDistance={30}
                disableFlipByClick
                useMouseEvents={zoom === 1}
                showPageCorners
                startPage={
                  dim.mobile ? indice : indice > 0 && indice % 2 === 0 ? indice - 1 : indice
                }
                autoSize={false}
                clickEventForward
                startZIndex={0}
                onInit={() => setPronto(true)}
                onFlip={(e: { data: number }) => setIndice(e.data)}
                onChangeState={(e: { data: string }) => e.data === 'read' && sincronizarIndice()}
                className="cn-flip"
                style={{}}
              >
                {paginas.map((p, i) => (
                  <Page
                    key={p.pagina}
                    pos={i + 1}
                    pagina={p}
                    carregar={Math.abs(i - indice) <= 3}
                    hotspots={mapaHotspots.get(p.pagina) ?? []}
                    visivel={dim.mobile ? i === indice : i === indice || i === indice + 1}
                    onSelecionar={setSelecionado}
                  />
                ))}
              </Book>

              {/* Zonas de clique nas bordas */}
              {zoom === 1 && (
                <>
                  <button
                    type="button"
                    className="cn-edge cn-edge-left"
                    aria-label="Página anterior"
                    onClick={anterior}
                    disabled={indice === 0}
                  />
                  <button
                    type="button"
                    className="cn-edge cn-edge-right"
                    aria-label="Próxima página"
                    onClick={proxima}
                    disabled={naUltima && !temOutro}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <FlipbookControls
        rotulo={rotulo}
        podeVoltar={indice > 0}
        podeAvancar={!naUltima || temOutro}
        onAnterior={anterior}
        onProxima={proxima}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
        onZoomReset={() => setZoom(1)}
        onFullscreen={alternarFullscreen}
        umaPagina={modo === 'uma' || !!dim?.mobile}
        podeDuasPaginas={(stageRef.current?.clientWidth ?? 0) >= 520}
        onAlternarModo={() => {
          setZoom(1);
          setModo((m) => (m === 'uma' ? 'auto' : 'uma'));
        }}
      />

      <WhatsappFloatingButton
        totalItens={totalItens}
        totalValor={totalValor}
        onAbrirPedido={() => setPedidoAberto(true)}
      />

      {selecionado && (
        <ProductQuickView
          produto={selecionado}
          qtd={itens.find((i) => i.id === selecionado.id)?.qtd ?? 0}
          onQtd={(q) => definirQtd(selecionado.id, q)}
          onVerPedido={() => {
            setSelecionado(null);
            setPedidoAberto(true);
          }}
          onFechar={() => setSelecionado(null)}
        />
      )}

      {pedidoAberto && (
        <CheckoutPanel
          produtos={produtos}
          itens={itens}
          cliente={cliente}
          onCliente={setCliente}
          onQtd={definirQtd}
          onLimpar={() => setItens([])}
          onFechar={() => setPedidoAberto(false)}
        />
      )}

      {introAtiva && config.intro_url && (
        <VideoOverlay
          src={config.intro_url}
          label="Vídeo de abertura do cardápio"
          rotuloFechar="Pular"
          onFechar={fecharIntro}
          onEnded={fecharIntro}
        />
      )}

      {outroAberto && config.outro_url && (
        <VideoOverlay
          src={config.outro_url}
          label="Vídeo de encerramento do cardápio"
          rotuloFechar="Voltar ao cardápio"
          onFechar={() => setOutroAberto(false)}
        >
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
        </VideoOverlay>
      )}
    </div>
  );
}
