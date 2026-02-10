import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cliente MESTRE (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nome, role, currentUserId } = body;

    // 1. Identificar QUEM está tentando criar
    const { data: criador } = await supabaseAdmin
      .from('colaboradores')
      .select('organization_id, role')
      .eq('id', currentUserId)
      .single();

    if (!criador) {
      return NextResponse.json({ error: 'Usuário solicitante não encontrado.' }, { status: 403 });
    }

    // Trava de Segurança: Apenas Master cria Master
    if (role === 'master' && criador.role !== 'master') {
      return NextResponse.json(
        { error: 'Apenas Master pode criar outro Master.' },
        { status: 403 }
      );
    }

    // 2. Tentar Criar o Usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: nome },
    });

    // --- MUDANÇA AQUI: TRATAMENTO DE ERRO SEGURO ---
    if (authError) {
      // Se o erro for "Email já existe"
      if (authError.message.includes('already been registered') || authError.status === 422) {
        return NextResponse.json(
          {
            error:
              'Este e-mail já está cadastrado no sistema. Tente outro ou peça para o usuário recuperar a senha.',
          },
          { status: 409 }
        ); // 409 Conflict
      }

      // Outros erros
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    // -----------------------------------------------

    const userId = authData.user.id;

    // 3. Garantir o registro na tabela Colaboradores
    const { error: dbError } = await supabaseAdmin.from('colaboradores').insert({
      id: userId,
      email,
      nome,
      role,
      ativo: true,
      organization_id: criador.organization_id,
      status_conta: 'ativo',
    });

    if (dbError) {
      // Se falhar no banco, desfazemos a criação do Auth para não deixar lixo
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error('Erro DB:', dbError);
      return NextResponse.json(
        { error: 'Erro ao vincular perfil no banco de dados.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId: userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
