'use server';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('id, chave, valor, organization_id')
      .eq('chave', 'modo_pdv');
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { organization_id = null, valor } = body;
    if (!valor || (valor !== 'padrao' && valor !== 'inventario')) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const payload: any = {
      chave: 'modo_pdv',
      valor,
      organization_id,
    };

    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .upsert([payload], { onConflict: 'chave,organization_id' })
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
