/*
 Script: create_test_users.js
 Uso: definir SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente e executar:
   node scripts/create_test_users.js

 O script cria/atualiza 3 usuários via Admin API do Supabase e insere/atualiza
 os registros na tabela `profiles` usando o endpoint PostgREST (service role key).

 Observações:
 - Recomendado executar apenas em ambiente de desenvolvimento.
 - Exige SERVICE ROLE KEY (não use em produção em locais inseguros).
*/

// Carrega variáveis do .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
  try {
    // Usa NEXT_PUBLIC_SUPABASE_URL se SUPABASE_URL não estiver definido
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
      process.exit(1);
    }

    const baseUrl = SUPABASE_URL.replace(/\/+$/, '');

    const users = [
      { id: '972cd273-7812-487d-a24a-a43cffda65af', email: 'sababrtv@gmail.com', password: 'admin123', nome: 'Administrador', role: 'admin' },
      { id: '910a58fc-776a-4466-afcb-0c1421eac7e5', email: 'eduardosaba.rep@gmail.com', password: 'fabrica123', nome: 'Usuario Fabrica', role: 'fabrica' },
      { id: 'f53c6333-9759-4d18-be45-387325ea9638', email: 'eduardosaba@uol.com', password: 'pdv123', nome: 'Usuario PDV', role: 'pdv' }
    ];

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    };

    async function createAuthUser(u) {
      const res = await fetch(`${baseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: u.id, email: u.email, password: u.password, email_confirm: true, user_metadata: { nome: u.nome } })
      });
      const text = await res.text();
      let json;
  try { json = JSON.parse(text); } catch { json = text; }
      return { status: res.status, ok: res.ok, body: json };
    }

    async function getUserByEmail(email) {
      const res = await fetch(`${baseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
    }

    async function updateAuthUser(id, u) {
      const res = await fetch(`${baseUrl}/auth/v1/admin/users/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ password: u.password, user_metadata: { nome: u.nome } })
      });
  const text = await res.text();
  try { return { ok: res.ok, body: JSON.parse(text) }; } catch { return { ok: res.ok, body: text }; }
    }

    async function upsertProfile(u) {
      const now = new Date().toISOString();
      // PostgREST upsert using Prefer: resolution=merge-duplicates
      const res = await fetch(`${baseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ id: u.id, role: u.role, nome: u.nome, email: u.email, created_at: now, updated_at: now })
      });
  const text = await res.text();
  try { return { ok: res.ok, body: JSON.parse(text) }; } catch { return { ok: res.ok, body: text }; }
    }

    for (const u of users) {
      process.stdout.write(`Processando ${u.email}... `);
      const resCreate = await createAuthUser(u);
      if (resCreate.ok) {
        console.log('auth user criado.');
      } else {
        // tentar detectar se já existe
        if (resCreate.status === 409 || (resCreate.body && typeof resCreate.body === 'string' && resCreate.body.toLowerCase().includes('already exists')) ) {
          console.log('já existe — atualizando.');
          const existing = await getUserByEmail(u.email);
          let userId = null;
          if (existing && Array.isArray(existing) && existing.length > 0) {
            userId = existing[0].id;
          } else if (existing && existing.id) {
            userId = existing.id;
          }
          if (userId) {
            const upd = await updateAuthUser(userId, u);
            if (upd.ok) console.log('auth user atualizado.'); else console.log('falha ao atualizar auth user', upd.body);
          } else {
            console.log('Não foi possível localizar usuário existente para atualizar. Resposta do servidor:', resCreate.body);
            continue;
          }
        } else if (resCreate.status === 400 && resCreate.body && typeof resCreate.body === 'object' && resCreate.body.error && resCreate.body.error.message && resCreate.body.error.message.toLowerCase().includes('user with this email already exists')) {
          // outra forma de mensagem
          console.log('já existe (mensagem 400) — tentando localizar e atualizar.');
          const existing = await getUserByEmail(u.email);
          let userId = existing && existing[0] && existing[0].id;
          if (userId) {
            const upd = await updateAuthUser(userId, u);
            if (upd.ok) console.log('auth user atualizado.'); else console.log('falha ao atualizar auth user', upd.body);
          } else {
            console.log('Não foi possível localizar usuário existente para atualizar. Resposta:', resCreate.body);
            continue;
          }
        } else {
          console.log('falha criando usuário auth:', resCreate.status, resCreate.body);
          continue;
        }
      }

      // Criar/atualizar profile via PostgREST
      const resProfile = await upsertProfile(u);
      if (resProfile.ok) console.log('profile inserido/atualizado.'); else console.log('falha ao inserir profile:', resProfile.body);
    }

    console.log('Concluído.');
    process.exit(0);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
})();
