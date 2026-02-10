import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

function getRoleFromMetadata(meta: unknown): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const m = meta as Record<string, unknown>;
  const r = m.role;
  return typeof r === 'string' ? r : undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required on server');
}

export async function GET(_request: Request) {
  try {
    // Criar cliente baseado em cookies para identificar o usuário
    const supabase = createRouteHandlerClient({ cookies });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError) {
      console.error('Erro ao obter sessão/usuário:', { userError, sessionError });
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const role =
      getRoleFromMetadata(sessionData?.session?.user?.user_metadata) ||
      getRoleFromMetadata(userData?.user?.user_metadata);

    if (!role || (role !== 'admin' && role !== 'fabrica')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Usar service role no servidor para garantir leitura completa (evita RLS bloqueando)
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey, {
      auth: { persistSession: false },
    });

    type OrdemRow = {
      id: string;
      numero_op?: string;
      produto_final_id?: string | null;
      quantidade_prevista?: number | null;
      status?: string | null;
      data_prevista?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      lote_producao?: string | null;
      custo_previsto?: number | null;
    };

    const r = await supabaseAdmin
      .from('ordens_producao')
      .select(
        `id, numero_op, produto_final_id, quantidade_prevista, status, data_prevista, created_at, updated_at, lote_producao, custo_previsto`
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (r.error) {
      console.error('Erro ao ler ordens_producao (admin):', r.error);
      return NextResponse.json({ error: getErrorMessage(r.error) }, { status: 500 });
    }

    return NextResponse.json({ data: r.data ?? [] });
  } catch (err) {
    console.error('Erro in admin ordens_producao route:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
