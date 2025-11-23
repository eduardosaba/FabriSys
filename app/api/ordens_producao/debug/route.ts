import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required on server');
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export async function GET(_request: Request) {
  // Segurança: somente permitir em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ordens_producao')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao ler ordens_producao (debug):', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erro no debug ordens_producao:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
