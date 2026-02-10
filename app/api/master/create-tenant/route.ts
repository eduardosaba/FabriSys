import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cliente MESTRE (Ignora RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresaNome, plano, adminNome, adminEmail, adminSenha } = body as {
      empresaNome?: string;
      plano?: string;
      adminNome?: string;
      adminEmail?: string;
      adminSenha?: string;
    };

    if (!empresaNome || !adminEmail || !adminSenha) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Criar a Organização (Empresa)
    type _OrgRow = { id: string };
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ nome: empresaNome, plano: plano ?? 'pro' })
      .select()
      .single();

    if (orgError || !org)
      throw new Error(`Erro ao criar empresa: ${orgError?.message ?? 'sem retorno'}`);

    // 2. Criar o Usuário Admin no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminSenha,
      email_confirm: true,
      user_metadata: { full_name: adminNome },
    });

    if (authError) {
      // Se der erro no usuário, deletar a empresa para não ficar "lixo" no banco
      try {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      } catch (delErr) {
        console.error('Falha ao remover org após erro de auth:', delErr);
      }
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    // authUser.data shape may vary; defensively extract id
    const userId = authUser?.user?.id ?? (authUser as any)?.user?.id;
    if (!userId) {
      // Tentativa de limpeza
      try {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      } catch (delErr) {
        console.error('Falha ao remover org após auth sem id:', delErr);
      }
      throw new Error('Usuário criado no auth sem id retornado');
    }

    // 3. Criar o Perfil do Colaborador vinculado à Empresa
    type _ColabRow = { id: string };
    const { error: profileError } = await supabaseAdmin.from('colaboradores').upsert({
      id: userId,
      nome: adminNome ?? '',
      email: adminEmail,
      role: 'admin', // O cliente é Admin da própria empresa
      organization_id: org.id, // <--- separação por organização
      ativo: true,
      status_conta: 'ativo',
    });

    if (profileError) {
      // Cleanup: remover usuario auth e org para não deixar dados inconsistentes
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (delAuthErr) {
        console.error('Erro ao remover usuário auth após falha no profile:', delAuthErr);
      }
      try {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      } catch (delOrgErr) {
        console.error('Erro ao remover org após falha no profile:', delOrgErr);
      }
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    return NextResponse.json({ success: true, orgId: org.id, userId });
  } catch (error: any) {
    console.error('Erro em /api/master/create-tenant:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
