/**
 * Cardápio Natalino (flipbook) — tipos, dados padrão e helpers.
 * Os dados reais vêm da tabela `cardapio_natal_produtos` (editável no admin).
 * Os PADRAO_PRODUTOS abaixo servem de fallback e de seed inicial.
 */

export const TOTAL_PAGINAS = 11;
export const WHATSAPP_NUMERO = '5575988031197';
export const PAGINA_ASPECTO = 9 / 16; // largura / altura das páginas do PDF

export interface Hotspot {
  pagina: number; // 1..TOTAL_PAGINAS
  // porcentagens (0-100) relativas à página
  x: number;
  y: number;
  w: number;
  h: number;
  // posição do botão "+" (centro, % da página). Se ausente, canto superior direito do retângulo.
  px?: number;
  py?: number;
}

export function pontoHotspot(h: Hotspot): { px: number; py: number } {
  return { px: h.px ?? h.x + h.w - 4.5, py: h.py ?? h.y + 2.5 };
}

export interface ProdutoCardapio {
  id: string;
  nome: string;
  preco: number | null;
  descricao: string | null;
  mensagem_whatsapp: string | null; // se vazio, usa mensagem padrão
  hotspots: Hotspot[];
  midia_tipo: 'imagem' | 'gif' | 'video' | null;
  midia_url: string | null;
  poster_url: string | null;
  ativo: boolean;
  ordem: number;
}

export type MidiaTipo = 'imagem' | 'gif' | 'video';

/**
 * Página do livro. `pagina` é a CHAVE estável (1..11 = páginas do PDF; 12+ = páginas novas
 * criadas no admin). Os hotspots dos produtos apontam para essa chave; a posição no livro
 * vem de `ordem`. Sem `midia_url`, usa a imagem original do PDF (só chaves 1..11).
 */
export interface PaginaCfg {
  pagina: number;
  ordem: number;
  ativo: boolean;
  midia_tipo: MidiaTipo | null;
  midia_url: string | null;
  repetir: boolean; // vídeo da página em loop (false = toca uma vez a cada vez que a página aparece)
  overlay_url: string | null; // camada transparente (PNG/WebP) por cima da mídia
  areas: AreaMidia[]; // vídeos/GIFs/imagens em áreas da página
}

/** Mídia posicionada sobre uma região da página (coordenadas em % da página). */
export interface AreaMidia {
  x: number;
  y: number;
  w: number;
  h: number;
  tipo: MidiaTipo;
  url: string;
  repetir: boolean;
}

export interface ConfigCardapio {
  intro_url: string | null; // vídeo de abertura (tela cheia, antes do livro)
  outro_url: string | null; // vídeo de encerramento (ao tentar avançar da última página)
  fundo_url: string | null; // imagem de fundo da tela do flipbook (desktop)
  fundo_mobile_url: string | null; // imagem de fundo para celular (retrato); se vazia, usa a do desktop
  og_image_url: string | null; // imagem de pré-visualização ao compartilhar o link (WhatsApp, etc.)
}

export const CONFIG_PADRAO: ConfigCardapio = {
  intro_url: null,
  outro_url: null,
  fundo_url: null,
  fundo_mobile_url: null,
  og_image_url: null,
};

/** Mescla as páginas padrão do PDF (1..11) com o que estiver salvo no banco. */
export function mesclarPaginas(rows: Partial<PaginaCfg>[] | null | undefined): PaginaCfg[] {
  const porChave = new Map<number, Partial<PaginaCfg>>();
  for (const r of rows ?? []) if (typeof r.pagina === 'number') porChave.set(r.pagina, r);
  const chaves = new Set<number>([
    ...Array.from({ length: TOTAL_PAGINAS }, (_, i) => i + 1),
    ...Array.from(porChave.keys()),
  ]);
  const lista: PaginaCfg[] = Array.from(chaves).map((chave) => {
    const r = porChave.get(chave);
    return {
      pagina: chave,
      ordem: r?.ordem ?? chave,
      ativo: r?.ativo ?? true,
      midia_tipo: r?.midia_tipo ?? null,
      midia_url: r?.midia_url ?? null,
      repetir: r?.repetir ?? true,
      overlay_url: r?.overlay_url ?? null,
      areas: Array.isArray(r?.areas) ? r.areas : [],
    };
  });
  return lista.sort((a, b) => a.ordem - b.ordem || a.pagina - b.pagina);
}

export function paginaSrc(n: number): string {
  return `/cardapionatal/paginas/p${String(n).padStart(2, '0')}.webp`;
}

export function formatarPreco(v: number | null): string {
  if (v == null) return 'Sob consulta';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function mensagemProduto(p: Pick<ProdutoCardapio, 'nome' | 'mensagem_whatsapp'>): string {
  return p.mensagem_whatsapp?.trim() || `Olá! Quero encomendar o produto: ${p.nome}.`;
}

export function urlWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export function mensagemLista(produtos: Pick<ProdutoCardapio, 'nome' | 'preco'>[]): string {
  const linhas = produtos.map(
    (p) => `- ${p.nome}${p.preco != null ? ` (${formatarPreco(p.preco)})` : ''}`
  );
  return `Olá! Tenho interesse nos seguintes itens do cardápio natalino:\n${linhas.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Dados padrão (posições dos hotspots estimadas — ajustáveis no admin)
// ---------------------------------------------------------------------------
type Seed = Omit<
  ProdutoCardapio,
  'midia_tipo' | 'midia_url' | 'poster_url' | 'ativo' | 'ordem' | 'descricao' | 'mensagem_whatsapp'
>;

const seeds: Seed[] = [
  {
    id: 'brownie-natalino-recheado',
    nome: 'Brownie natalino recheado',
    preco: 14,
    hotspots: [
      { pagina: 2, x: 6, y: 41, w: 76, h: 13 },
      { pagina: 3, x: 8, y: 30, w: 84, h: 62, px: 86, py: 50 },
    ],
  },
  {
    id: 'mini-guirlanda-de-brownie',
    nome: 'Mini guirlanda de brownie',
    preco: 40,
    hotspots: [{ pagina: 2, x: 21, y: 55, w: 73, h: 11 }],
  },
  {
    id: 'lata-com-bombom-de-brownie',
    nome: 'Lata com bombom de brownie',
    preco: 30,
    hotspots: [{ pagina: 2, x: 6, y: 67, w: 76, h: 13 }],
  },
  {
    id: 'saquinho-com-bombom-de-brownie',
    nome: 'Saquinho com bombom de brownie',
    preco: 25,
    hotspots: [{ pagina: 2, x: 6, y: 80, w: 88, h: 14 }],
  },

  {
    id: 'torta-de-limao',
    nome: 'Torta de limão',
    preco: 90,
    hotspots: [{ pagina: 4, x: 2, y: 23, w: 47, h: 16 }],
  },
  {
    id: 'torta-de-bombom-de-uva',
    nome: 'Torta de bombom de uva',
    preco: 90,
    hotspots: [{ pagina: 4, x: 50, y: 23, w: 49, h: 16 }],
  },
  {
    id: 'torta-delicia-de-abacaxi',
    nome: 'Torta delícia de abacaxi',
    preco: 90,
    hotspots: [{ pagina: 4, x: 2, y: 42, w: 47, h: 18 }],
  },
  {
    id: 'torta-de-maracuja-trufado',
    nome: 'Torta de maracujá trufado',
    preco: 100,
    hotspots: [{ pagina: 4, x: 50, y: 42, w: 49, h: 18 }],
  },
  {
    id: 'torta-de-bombom-de-morango',
    nome: 'Torta de bombom de morango',
    preco: 110,
    hotspots: [{ pagina: 4, x: 2, y: 62, w: 47, h: 17 }],
  },
  {
    id: 'pave-de-ninho-com-geleia-de-morango',
    nome: 'Pavê de ninho com geleia de morango',
    preco: 110,
    hotspots: [
      { pagina: 4, x: 50, y: 62, w: 49, h: 17 },
      { pagina: 5, x: 0, y: 18, w: 100, h: 42 },
    ],
  },
  {
    id: 'browninho-com-nutella',
    nome: 'Browninho com Nutella',
    preco: 110,
    hotspots: [{ pagina: 4, x: 2, y: 81, w: 47, h: 15 }],
  },
  {
    id: 'kinder',
    nome: 'Kinder',
    preco: 110,
    hotspots: [
      { pagina: 4, x: 50, y: 81, w: 49, h: 15 },
      { pagina: 5, x: 0, y: 60, w: 100, h: 40 },
    ],
  },

  {
    id: 'caixinha-natalina-4-docinhos',
    nome: 'Caixinha natalina com 4 docinhos',
    preco: 12,
    hotspots: [{ pagina: 6, x: 5, y: 28, w: 90, h: 18 }],
  },
  {
    id: 'caixinha-natalina-4-mini-brownies',
    nome: 'Caixinha natalina com 4 mini brownies',
    preco: 12,
    hotspots: [{ pagina: 6, x: 5, y: 47, w: 90, h: 14 }],
  },
  {
    id: 'doces-encomenda-25',
    nome: 'Doces por encomenda — 25 doces',
    preco: 50,
    hotspots: [{ pagina: 6, x: 40, y: 69, w: 58, h: 5.5 }],
  },
  {
    id: 'doces-encomenda-50',
    nome: 'Doces por encomenda — 50 doces',
    preco: 85,
    hotspots: [{ pagina: 6, x: 40, y: 74.5, w: 58, h: 5.5 }],
  },
  {
    id: 'doces-encomenda-100',
    nome: 'Doces por encomenda — 100 doces',
    preco: 170,
    hotspots: [{ pagina: 6, x: 40, y: 80, w: 58, h: 5.5 }],
  },

  {
    id: 'torre-de-brigadeiro',
    nome: 'Torre de Brigadeiro',
    preco: 100,
    hotspots: [{ pagina: 7, x: 5, y: 40, w: 90, h: 55 }],
  },

  {
    id: 'empadao-carne-do-sol-catupiry',
    nome: 'Empadão de carne do sol com catupiry',
    preco: 200,
    hotspots: [{ pagina: 8, x: 8, y: 34, w: 86, h: 18 }],
  },
  {
    id: 'empadao-camarao-catupiry',
    nome: 'Empadão de camarão com catupiry',
    preco: 150,
    hotspots: [{ pagina: 8, x: 8, y: 50, w: 86, h: 18 }],
  },
  {
    id: 'empadao-frango-catupiry',
    nome: 'Empadão de frango com catupiry',
    preco: 125,
    hotspots: [{ pagina: 8, x: 8, y: 69, w: 86, h: 18 }],
  },

  {
    id: 'guirlanda-brownie',
    nome: 'Guirlanda Brownie',
    preco: 100,
    hotspots: [{ pagina: 9, x: 5, y: 22, w: 90, h: 62 }],
  },

  {
    id: 'pao-metro-frango-cremoso',
    nome: 'Pão metro — Frango cremoso',
    preco: 110,
    hotspots: [{ pagina: 10, x: 15, y: 41, w: 70, h: 12 }],
  },
  {
    id: 'pao-metro-salame-peito-de-peru',
    nome: 'Pão metro — Salame e peito de peru',
    preco: 120,
    hotspots: [{ pagina: 10, x: 15, y: 54, w: 77, h: 11 }],
  },
  {
    id: 'pao-metro-charque-cremoso',
    nome: 'Pão metro — Charque cremoso',
    preco: 140,
    hotspots: [{ pagina: 10, x: 15, y: 65, w: 70, h: 12 }],
  },
];

export const PADRAO_PRODUTOS: ProdutoCardapio[] = seeds.map((s, i) => ({
  ...s,
  descricao: null,
  mensagem_whatsapp: null,
  midia_tipo: null,
  midia_url: null,
  poster_url: null,
  ativo: true,
  ordem: i + 1,
}));

// ---------------------------------------------------------------------------
// Pedido (carrinho -> mensagem do WhatsApp + PDF + link sem armazenamento)
// ---------------------------------------------------------------------------
export const PRAZO_ENCOMENDA = '2026-12-14'; // data máxima de retirada/entrega (YYYY-MM-DD)
export const PRAZO_TEXTO = '14/12';
export const FORMAS_PAGAMENTO = ['Pix', 'Cartão de crédito (à vista ou parcelado)'] as const;

export interface ItemPedido {
  id: string;
  qtd: number;
}

export interface ClientePedido {
  nome: string;
  telefone: string;
  recebimento: 'retirada' | 'entrega';
  data: string; // YYYY-MM-DD
  endereco: string;
  pagamento: string;
  observacoes: string;
}

export const CLIENTE_VAZIO: ClientePedido = {
  nome: '',
  telefone: '',
  recebimento: 'retirada',
  data: '',
  endereco: '',
  pagamento: FORMAS_PAGAMENTO[0],
  observacoes: '',
};

export interface LinhaPedido {
  nome: string;
  qtd: number;
  unitario: number | null;
  subtotal: number | null;
}

export function montarLinhas(itens: ItemPedido[], produtos: ProdutoCardapio[]): LinhaPedido[] {
  const mapa = new Map(produtos.map((p) => [p.id, p]));
  const linhas: LinhaPedido[] = [];
  for (const it of itens) {
    const p = mapa.get(it.id);
    if (!p || it.qtd < 1) continue;
    linhas.push({
      nome: p.nome,
      qtd: it.qtd,
      unitario: p.preco,
      subtotal: p.preco == null ? null : p.preco * it.qtd,
    });
  }
  return linhas;
}

export function totalLinhas(linhas: LinhaPedido[]): { total: number; temSobConsulta: boolean } {
  return {
    total: linhas.reduce((s, l) => s + (l.subtotal ?? 0), 0),
    temSobConsulta: linhas.some((l) => l.subtotal == null),
  };
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export function rotuloRecebimento(r: ClientePedido['recebimento']): string {
  return r === 'entrega' ? 'Entrega (taxa a combinar)' : 'Retirada na loja';
}

export function validarCliente(c: ClientePedido): string[] {
  const erros: string[] = [];
  if (c.nome.trim().length < 3) erros.push('Informe seu nome.');
  if (c.telefone.replace(/\D/g, '').length < 10) erros.push('Informe um telefone com DDD.');
  if (!c.data) erros.push('Escolha a data de retirada/entrega.');
  else if (c.data > PRAZO_ENCOMENDA) erros.push(`A data deve ser até ${PRAZO_TEXTO}.`);
  if (c.recebimento === 'entrega' && c.endereco.trim().length < 8)
    erros.push('Informe o endereço de entrega.');
  return erros;
}

// --- link do pedido (dados dentro da URL; nenhum armazenamento) -------------
export interface PedidoCodificado {
  itens: ItemPedido[];
  cliente: ClientePedido;
  emitidoEm: number; // ms
}

function b64enc(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64dec(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function codificarPedido(p: PedidoCodificado): string {
  const c = p.cliente;
  return b64enc(
    JSON.stringify({
      i: p.itens.map((i) => [i.id, i.qtd]),
      c: [c.nome, c.telefone, c.recebimento, c.data, c.endereco, c.pagamento, c.observacoes],
      t: p.emitidoEm,
    })
  );
}

/** Decodifica e SANITIZA (o link é entrada não confiável). Preços nunca vêm do link. */
export function decodificarPedido(s: string | undefined): PedidoCodificado | null {
  if (!s || s.length > 6000) return null;
  try {
    const o = JSON.parse(b64dec(s));
    if (!Array.isArray(o.i) || !Array.isArray(o.c) || o.i.length > 60) return null;
    const txt = (v: unknown, max: number) => String(v ?? '').slice(0, max);
    const itens: ItemPedido[] = o.i
      .map((x: unknown[]) => ({ id: txt(x?.[0], 80), qtd: Math.floor(Number(x?.[1])) }))
      .filter((x: ItemPedido) => x.id && x.qtd >= 1 && x.qtd <= 99);
    if (!itens.length) return null;
    const [nome, telefone, recebimento, data, endereco, pagamento, observacoes] = o.c;
    const dataOk = /^\d{4}-\d{2}-\d{2}$/.test(String(data)) ? String(data) : '';
    return {
      itens,
      cliente: {
        nome: txt(nome, 80),
        telefone: txt(telefone, 25),
        recebimento: recebimento === 'entrega' ? 'entrega' : 'retirada',
        data: dataOk,
        endereco: txt(endereco, 200),
        pagamento: txt(pagamento, 60),
        observacoes: txt(observacoes, 300),
      },
      emitidoEm: Number.isFinite(Number(o.t)) ? Number(o.t) : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Código curto e estável do pedido (mesmo no PDF do cliente e na página da Larissa). */
export function codigoPedido(emitidoEm: number, itens: ItemPedido[]): string {
  let h = 5381;
  const base = `${emitidoEm}|${itens.map((i) => `${i.id}:${i.qtd}`).join(',')}`;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function mensagemPedido(args: {
  linhas: LinhaPedido[];
  total: number;
  temSobConsulta: boolean;
  cliente: ClientePedido;
  codigo: string;
  link: string;
}): string {
  const { linhas, total, temSobConsulta, cliente: c, codigo, link } = args;
  const itens = linhas.map(
    (l) =>
      `• ${l.qtd}x ${l.nome}${l.subtotal != null ? ` — ${formatarPreco(l.subtotal)}` : ' — sob consulta'}`
  );
  return [
    'Olá! Quero fazer uma encomenda do cardápio natalino.',
    '',
    `*Pedido ${codigo}*`,
    ...itens,
    '',
    `*Total dos itens:* ${formatarPreco(total)}${temSobConsulta ? ' (+ itens sob consulta)' : ''}`,
    `*Recebimento:* ${rotuloRecebimento(c.recebimento)}`,
    `*Data desejada:* ${formatarData(c.data)}`,
    `*Pagamento:* ${c.pagamento}`,
    `*Nome:* ${c.nome}`,
    `*Telefone:* ${c.telefone}`,
    ...(c.recebimento === 'entrega' ? [`*Endereço:* ${c.endereco}`] : []),
    ...(c.observacoes.trim() ? [`*Observações:* ${c.observacoes.trim()}`] : []),
    '',
    `Resumo do pedido (PDF): ${link}`,
  ].join('\n');
}
