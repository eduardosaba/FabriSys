import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPasswordReset() {
  console.log('🧪 Testando reset de senha...\n');

  const testEmail = 'sababrtv@gmail.com';

  try {
    console.log(`Enviando email de reset para: ${testEmail}`);

    const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/update-password`,
    });

    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      return;
    }

    console.log('✅ Email enviado com sucesso!');
    console.log('📧 Verifique sua caixa de entrada');
    console.log('🔗 O link deve redirecionar para:', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/update-password`);

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

testPasswordReset();