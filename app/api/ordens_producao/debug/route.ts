import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(_request: Request) {
  // inicializar o cliente aqui para evitar erro em tempo de build quando variáveis não estiverem definidas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Chaves do Supabase não configuradas no ambiente de execução' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
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
