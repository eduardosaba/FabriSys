import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';

export async function POST(req: Request) {
  // Usamos o cliente server-side (service role). Se a chave não existir,
  // rejeitamos para evitar comportamentos inseguros.
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    return NextResponse.json({ error: 'Service role key não configurada' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { loja_id, itens, created_by } = body;

    if (!created_by) {
      return NextResponse.json({ error: 'Não autorizado: created_by ausente' }, { status: 401 });
    }

    // Chamar RPC; itens deve ser JSON serializável (jsonb)
    const { data, error } = await supabase.rpc('create_remessa', {
      loja_id: loja_id,
      itens: JSON.stringify(itens),
      created_by: created_by,
    });

    if (error) {
      const msg = String(error.message || 'Erro RPC');
      if (msg.includes('insuficiente')) {
        return NextResponse.json(
          { error: 'Reserva de segurança insuficiente para esta operação.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true, remessa_id: data });
  } catch (err: any) {
    console.error('[remessas.create] error', err);
    return NextResponse.json(
      { error: err?.message ?? 'Erro ao processar remessa' },
      { status: 500 }
    );
  }
}
