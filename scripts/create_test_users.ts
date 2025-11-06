/**
 * create_test_users.ts
 * Uso:
 * 1) Instale dependências: pnpm add -D ts-node typescript @types/node && pnpm add @supabase/supabase-js
 * 2) Defina no seu ambiente: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * 3) Rode: npx ts-node scripts/create_test_users.ts
 *
 * Observações de segurança:
 * - Use apenas em desenvolvimento. Nunca comite a service_role key.
 * - Se seu ambiente Supabase não permitir ações de Admin via service_role, use o painel ou uma alternativa segura.
 */

import { createClient } from '@supabase/supabase-js';

type UserSpec = {
  id: string;
  email: string;
  password: string;
  nome: string;
  role: 'admin' | 'fabrica' | 'pdv';
};

const USERS: UserSpec[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'sababrtv@gmail.com',
    password: 'admin123',
    nome: 'Administrador',
    role: 'admin',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'eduardosaba.rep@gmail.com',
    password: 'fabrica123',
    nome: 'Usuario Fabrica',
    role: 'fabrica',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'eduardosaba@uol.com',
    password: 'pdv123',
    nome: 'Usuario PDV',
    role: 'pdv',
  },
];

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  for (const u of USERS) {
    process.stdout.write(`Processando ${u.email}... `);
    try {
      // Tenta criar o usuário via Admin API
      // @ts-expect-error - admin namespace exists on client in runtime
      const createRes = await (supabase.auth as any).admin.createUser({
        id: u.id,
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nome: u.nome },
      });

      if (createRes && !createRes.error) {
        console.log('auth user criado.');
      } else if (createRes && createRes.error) {
        const msg = String(createRes.error.message || createRes.error);
        if (
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('user already exists')
        ) {
          // tenta atualizar
          console.log('já existe — tentando atualizar.');
          try {
            // @ts-expect-error - admin namespace exists on client in runtime
            const upd = await (supabase.auth as any).admin.updateUserById(u.id, {
              password: u.password,
              user_metadata: { nome: u.nome },
            });
            if (upd && !upd.error) console.log('auth user atualizado.');
            else console.log('falha ao atualizar auth user', upd?.error || upd);
          } catch {
            console.log(
              'erro ao atualizar usuário (tentativa direta por id falhou). Tentando localizar por email.'
            );
            // Tenta localizar por email (lista de usuários) e atualizar
            try {
              // @ts-expect-error - admin namespace exists on client in runtime
              const list = await (supabase.auth as any).admin.listUsers();
              const found =
                list && list.data && Array.isArray(list.data)
                  ? list.data.find((x: any) => x.email === u.email)
                  : null;
              const userId = found?.id;
              if (userId) {
                const upd2 = await (supabase.auth as any).admin.updateUserById(userId, {
                  password: u.password,
                  user_metadata: { nome: u.nome },
                });
                if (upd2 && !upd2.error) console.log('auth user atualizado (por lookup).');
                else console.log('falha ao atualizar auth user (lookup):', upd2?.error || upd2);
              } else {
                console.log(
                  'Não foi possível localizar usuário existente para atualizar. Resposta create:',
                  createRes.error
                );
              }
            } catch (e2) {
              console.log('Erro listando usuários:', e2);
            }
          }
        } else {
          console.log('falha criando usuário auth:', createRes.error);
        }
      }
    } catch (err) {
      console.log('Erro ao criar/atualizar usuário via Admin API:', err);
    }

    // Upsert profile usando PostgREST via client from().upsert
    try {
      const now = new Date().toISOString();
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        {
          id: u.id,
          role: u.role,
          nome: u.nome,
          email: u.email,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );

      if (!upsertErr) {
        console.log('profile inserido/atualizado.');
      } else {
        console.log('falha ao inserir profile:', upsertErr);
      }
    } catch (err) {
      console.log('Erro ao upsert profile:', err);
    }
  }

  console.log('Concluído.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
