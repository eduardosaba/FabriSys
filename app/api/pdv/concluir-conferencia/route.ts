import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServiceSupabase } from '@/lib/supabase-service';

export async function POST(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();

  // Cria o cliente Supabase para o Route Handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  // 1. Tentar obter usuário pela sessão (Cookie)
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  let finalAdminId = '';
  let activeClient = supabase;

  if (sessionUser) {
    // Verifica se o usuário logado é admin
    if (sessionUser.app_metadata?.role !== 'admin' && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    finalAdminId = sessionUser.id;
  } else {
    // Fallback: Se não houver sessão, tenta usar a Service Key e o admin_id do corpo
    if (!body.admin_id) {
      return NextResponse.json({ error: 'Sessão expirada ou admin_id ausente.' }, { status: 401 });
    }

    try {
      activeClient = await getServiceSupabase();
      finalAdminId = body.admin_id;
    } catch (e) {
      return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 });
    }
  }

  // 2. Executar a RPC
  try {
    const { error } = await activeClient.rpc('finalizar_conferencia_caixa', {
      p_fechamento_id: body.id,
      p_pix: body.pix,
      p_cartao: body.cartao,
      p_ajuste_promo: body.ajustePromo,
      p_observacao: body.observacao,
      p_admin_id: finalAdminId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno' }, { status: 500 });
  }
}
