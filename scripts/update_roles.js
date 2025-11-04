import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateRoles() {
  console.log('🔧 Atualizando roles dos usuários...\n');

  const updates = [
    { id: '972cd273-7812-487d-a24a-a43cffda65af', email: 'sababrtv@gmail.com', role: 'admin' },
    { id: '910a58fc-776a-4466-afcb-0c1421eac7e5', email: 'eduardosaba.rep@gmail.com', role: 'fabrica' },
    { id: 'f53c6333-9759-4d18-be45-387325ea9638', email: 'eduardosaba@uol.com', role: 'pdv' }
  ];

  for (const update of updates) {
    console.log(`Atualizando ${update.email} para role ${update.role}...`);

    const { error } = await supabase
      .from('profiles')
      .update({ role: update.role })
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Erro ao atualizar ${update.email}:`, error);
    } else {
      console.log(`✅ ${update.email} atualizado com sucesso.`);
    }
  }

  console.log('\n🔍 Verificando atualizações...\n');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('id', updates.map(u => u.id));

  if (error) {
    console.error('❌ Erro ao verificar:', error);
  } else {
    data.forEach(profile => {
      console.log(`${profile.email}: ${profile.role}`);
    });
  }
}

updateRoles();