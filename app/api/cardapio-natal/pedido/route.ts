import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  PADRAO_PRODUTOS,
  PRAZO_ENCOMENDA,
  codigoPedido,
  validarCliente,
  type ClientePedido,
  type ItemPedido,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';
import type { ItemRegistro } from '@/lib/cardapio-natal-pedidos';

export const runtime = 'nodejs';

// Limite simples por IP (melhor esforço; em serverless cada instância tem a sua memória)
const janela = new Map<string, { n: number; t: number }>();
function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const r = janela.get(ip);
  if (!r || agora - r.t > 60_000) {
    janela.set(ip, { n: 1, t: agora });
    return false;
  }
  r.n += 1;
  return r.n > 12;
}

const txt = (v: unknown, max: number) =>
  String(v ?? '')
    .trim()
    .slice(0, max);

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Registra um pedido enviado pelo cardápio. NÃO confia em preços/nomes vindos do cliente:
 * recebe só ids e quantidades e recalcula tudo a partir do cardápio atual.
 */
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (excedeuLimite(ip))
    return NextResponse.json({ erro: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 });

  if (Number(req.headers.get('content-length') ?? 0) > 30_000) {
    return NextResponse.json({ erro: 'Pedido grande demais.' }, { status: 413 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });
  }

  // ---- entrada sanitizada
  const brutos = Array.isArray(corpo.itens) ? (corpo.itens as unknown[]).slice(0, 60) : [];
  const itens: ItemPedido[] = brutos
    .map((x) => {
      const o = x as { id?: unknown; qtd?: unknown };
      return { id: txt(o?.id, 80), qtd: Math.floor(Number(o?.qtd)) };
    })
    .filter((i) => i.id && i.qtd >= 1 && i.qtd <= 99);
  if (!itens.length) return NextResponse.json({ erro: 'Pedido sem itens.' }, { status: 422 });

  const c = (corpo.cliente ?? {}) as Record<string, unknown>;
  const cliente: ClientePedido = {
    nome: txt(c.nome, 80),
    telefone: txt(c.telefone, 25),
    recebimento: c.recebimento === 'entrega' ? 'entrega' : 'retirada',
    data: /^\d{4}-\d{2}-\d{2}$/.test(String(c.data)) ? String(c.data) : '',
    endereco: txt(c.endereco, 200),
    pagamento: txt(c.pagamento, 60),
    observacoes: txt(c.observacoes, 300),
  };
  const erros = validarCliente(cliente);
  if (erros.length) return NextResponse.json({ erro: erros.join(' ') }, { status: 422 });

  const emitidoEm = Number(corpo.emitidoEm);
  if (!Number.isFinite(emitidoEm) || Math.abs(Date.now() - emitidoEm) > 24 * 3600 * 1000) {
    return NextResponse.json({ erro: 'Data do pedido inválida.' }, { status: 400 });
  }

  const db = servico();
  if (!db) return NextResponse.json({ erro: 'Registro indisponível no momento.' }, { status: 503 });

  // ---- preços sempre do cardápio atual
  const { data: prods } = await db
    .from('cardapio_natal_produtos')
    .select('id, nome, preco')
    .eq('ativo', true);
  const base: Pick<ProdutoCardapio, 'id' | 'nome' | 'preco'>[] = prods?.length
    ? prods
    : PADRAO_PRODUTOS;
  const mapa = new Map(base.map((p) => [p.id, p]));

  const registro: ItemRegistro[] = [];
  for (const it of itens) {
    const p = mapa.get(it.id);
    if (!p) continue;
    registro.push({
      id: p.id,
      nome: p.nome,
      qtd: it.qtd,
      unitario: p.preco == null ? null : Number(p.preco),
    });
  }
  if (!registro.length) return NextResponse.json({ erro: 'Itens indisponíveis.' }, { status: 422 });

  const total = registro.reduce((s, i) => s + (i.unitario ?? 0) * i.qtd, 0);
  const codigo = codigoPedido(emitidoEm, itens); // mesmo código do PDF e da mensagem do WhatsApp

  const { error } = await db.from('cardapio_natal_pedidos').upsert(
    {
      codigo,
      status: 'aberto',
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone,
      recebimento: cliente.recebimento,
      data_entrega: cliente.data <= PRAZO_ENCOMENDA ? cliente.data : null,
      endereco: cliente.recebimento === 'entrega' ? cliente.endereco : null,
      pagamento: cliente.pagamento,
      observacoes: cliente.observacoes || null,
      itens: registro,
      total,
      origem: 'site',
    },
    { onConflict: 'codigo', ignoreDuplicates: true } // reenvio do mesmo pedido não duplica
  );

  if (error) {
    console.error('[cardapio-natal] falha ao registrar pedido:', error.message);
    return NextResponse.json({ erro: 'Não foi possível registrar o pedido.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, codigo });
}
