import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { salvarPedido } from '@/lib/pedidos';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { itens, observacoes } = await request.json();

    const pedido = await salvarPedido(itens, observacoes);

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: pedidos, error } = await supabase
      .from('pedidos_compra')
      .select(
        `
        *,
        itens_pedido_compra (
          *,
          insumo:insumos (*)
        ),
        notificacoes_pedido (*)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return NextResponse.json({ error: 'Erro ao listar pedidos' }, { status: 500 });
  }
}
