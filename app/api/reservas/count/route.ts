import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';

export async function GET() {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    // Service key não configurada no ambiente de dev/build — retornar 0 sem quebrar.
    return NextResponse.json({ count: 0 });
  }

  try {
    const { data, error } = await supabase
      .from('ordens_producao')
      .select('estoque_seguranca, quantidade_enviada_extra')
      .neq('status_logistica', 'recebido')
      .gt('estoque_seguranca', 0);

    if (error) return NextResponse.json({ count: 0 });

    const total = (data as any[]).reduce((acc, op) => {
      const estoque = Number(op.estoque_seguranca ?? 0);
      const enviado = Number(op.quantidade_enviada_extra ?? 0);
      return acc + Math.max(0, estoque - enviado);
    }, 0);

    return NextResponse.json({ count: total });
  } catch (err) {
    return NextResponse.json({ count: 0 });
  }
}
