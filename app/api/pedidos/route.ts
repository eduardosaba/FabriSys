import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import util from 'util';
import {
  PedidoCompraSchema,
  PedidoCompraDetalhadoArraySchema,
  PedidoCompraDetalhadoSchema,
} from '@/lib/validations/pedidos';

// Helper para extrair mensagem de erro de forma segura
function getErrorMessage(err: unknown) {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body: unknown = await request.json();
    console.log('[POST /api/pedidos] Payload recebido:', body);
    const InsumoRef = z.object({
      id: z.string(),
      ultimo_valor: z.number().nullable().optional(),
    });
    const PostSchema = z.object({
      itens: z.array(
        z.object({
          insumo: InsumoRef,
          quantidade: z.number().int().positive(),
        })
      ),
      observacoes: z.string().optional(),
    });
    const { itens, observacoes } = PostSchema.parse(body);
    console.log('[POST /api/pedidos] Itens normalizados:', itens);

    const valorTotal = itens.reduce(
      (total, item) => total + item.quantidade * (item.insumo?.ultimo_valor || 0),
      0
    );
    console.log('[POST /api/pedidos] Valor total calculado:', valorTotal);

    type PgResp<T> = { data: T | null; error: unknown | null };
    const r1 = (await supabase
      .from('pedidos_compra')
      .insert({ valor_total: valorTotal, observacoes, status: 'pendente' })
      .select()
      .single()) as unknown as PgResp<unknown>;
    console.log('[POST /api/pedidos] Resultado inserção pedido:', r1);

    if (r1.error) throw r1.error;
    const pedidoParsed = PedidoCompraSchema.parse(r1.data);
    console.log('[POST /api/pedidos] Pedido validado:', pedidoParsed);

    const itensPedido = itens.map((item) => ({
      pedido_id: pedidoParsed.id,
      insumo_id: item.insumo.id,
      quantidade: item.quantidade,
      valor_unitario: item.insumo.ultimo_valor || 0,
    }));
    console.log('[POST /api/pedidos] Itens do pedido para inserção:', itensPedido);

    const { error: erroItens } = await supabase.from('itens_pedido_compra').insert(itensPedido);
    console.log('[POST /api/pedidos] Resultado inserção itens:', erroItens);
    if (erroItens) throw erroItens;

    return NextResponse.json(pedidoParsed, { status: 201 });
  } catch (error) {
    // Erros de validação do Zod devem retornar 400 com detalhes úteis para debug
    if (error instanceof z.ZodError) {
      console.error('[POST /api/pedidos] Validação falhou:', error.errors);
      return NextResponse.json(
        { error: 'Payload inválido', details: error.errors },
        { status: 400 }
      );
    }

    // Log mais detalhado para objetos de erro não-Error
    if (error instanceof Error) {
      console.error('[POST /api/pedidos] Erro ao criar pedido:', error.stack || error.message);
    } else {
      console.error('[POST /api/pedidos] Erro não-Error:', util.inspect(error, { depth: null }));
    }
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const baseSelect = `
        *,
        itens_pedido_compra (
          *,
          insumo:insumos (*)
        ),
        notificacoes_pedido (*)
      `;
    console.log('[GET /api/pedidos] Query params:', { id });

    if (id) {
      type PgResp<T> = { data: T | null; error: unknown | null };
      const r = (await supabase
        .from('pedidos_compra')
        .select(baseSelect)
        .eq('id', id)
        .limit(1)
        .single()) as unknown as PgResp<unknown>;
      console.log('[GET /api/pedidos] Resultado busca por id:', r);
      if (r.error) throw r.error;
      const parsed = PedidoCompraDetalhadoSchema.parse(r.data);
      console.log('[GET /api/pedidos] Pedido detalhado validado:', parsed);
      return NextResponse.json(parsed);
    }

    type PgRespArr<T> = { data: T[] | null; error: unknown | null };
    const r2 = (await supabase
      .from('pedidos_compra')
      .select(baseSelect)
      .order('created_at', { ascending: false })) as unknown as PgRespArr<unknown>;
    console.log('[GET /api/pedidos] Resultado busca geral:', r2);

    if (r2.error) throw r2.error;

    // Tipos para normalização
    type Insumo = {
      id: string;
      nome: string;
      unidade_medida: string;
      ultimo_valor: number | null;
      [key: string]: unknown;
    };
    type ItemPedidoCompra = {
      id: string;
      pedido_id: string;
      insumo_id: string;
      quantidade: number;
      valor_unitario: number;
      insumo: Insumo;
      [key: string]: unknown;
    };
    type Pedido = {
      id: string;
      itens_pedido_compra: ItemPedidoCompra[];
      notificacoes_pedido: unknown[];
      [key: string]: unknown;
    };

    const normalized = (r2.data ?? []).map((p) => {
      const pedido = p as Pedido;
      return {
        ...pedido,
        itens_pedido_compra: (pedido.itens_pedido_compra ?? []).map((item) => ({
          ...item,
          insumo: {
            ...item.insumo,
            ultimo_valor:
              typeof item.insumo?.ultimo_valor === 'number' ? item.insumo.ultimo_valor : 0,
          },
        })),
      };
    });
    console.log('[GET /api/pedidos] Dados normalizados:', normalized);

    const parsed = PedidoCompraDetalhadoArraySchema.parse(normalized);
    console.log('[GET /api/pedidos] Pedidos validados:', parsed);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error(
      '[GET /api/pedidos] Erro ao listar pedidos:',
      util.inspect(error, { depth: null })
    );
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao listar pedidos' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = getSupabase();
    const InsumoRef = z.object({
      id: z.string(),
      ultimo_valor: z.number().nullable().optional(),
    });
    const PatchSchema = z.object({
      id: z.string(),
      status: z.enum(['pendente', 'enviado', 'aprovado', 'rejeitado', 'finalizado']).optional(),
      observacoes: z.string().nullable().optional(),
      itens: z
        .array(
          z.object({
            insumo: InsumoRef,
            quantidade: z.number().int().positive(),
          })
        )
        .optional(),
    });
    const { id, status, observacoes, itens } = PatchSchema.parse(await request.json());
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Caso itens sejam enviados, substitui os itens da ordem
    if (Array.isArray(itens)) {
      const valorTotal = itens.reduce(
        (total, item) => total + item.quantidade * (item.insumo?.ultimo_valor || 0),
        0
      );

      const { error: delErr } = await supabase
        .from('itens_pedido_compra')
        .delete()
        .eq('pedido_id', id);
      if (delErr) throw delErr;

      const itensPedido = itens.map((item) => ({
        pedido_id: id,
        insumo_id: item.insumo.id,
        quantidade: item.quantidade,
        valor_unitario: item.insumo.ultimo_valor || 0,
      }));

      const { error: insErr } = await supabase.from('itens_pedido_compra').insert(itensPedido);
      if (insErr) throw insErr;

      const updatePedido: Record<string, unknown> = { valor_total: valorTotal };
      if (typeof status !== 'undefined') updatePedido.status = status;
      if (typeof observacoes !== 'undefined') updatePedido.observacoes = observacoes;

      type PgResp<T> = { data: T | null; error: unknown | null };
      const r3 = (await supabase
        .from('pedidos_compra')
        .update(updatePedido)
        .eq('id', id)
        .select('*')
        .single()) as unknown as PgResp<unknown>;

      if (r3.error) throw r3.error;
      const parsed = PedidoCompraSchema.parse(r3.data);
      return NextResponse.json(parsed);
    }

    const update: Record<string, unknown> = {};
    if (typeof status !== 'undefined') update.status = status;
    if (typeof observacoes !== 'undefined') update.observacoes = observacoes;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    type PgResp<T> = { data: T | null; error: unknown | null };
    const r4 = (await supabase
      .from('pedidos_compra')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()) as unknown as PgResp<unknown>;

    if (r4.error) throw r4.error;
    const parsed = PedidoCompraSchema.parse(r4.data);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro ao atualizar status:', util.inspect(error, { depth: null }));
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabase();
    const DeleteSchema = z.object({ id: z.string() });
    const { id } = DeleteSchema.parse(await request.json());

    const { error } = await supabase.from('pedidos_compra').delete().eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erro ao excluir pedido:', util.inspect(error, { depth: null }));
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao excluir pedido' },
      { status: 500 }
    );
  }
}
