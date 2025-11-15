import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listUsers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    const text = await res.text();
    console.log('status:', res.status);
    console.log('body:', text.slice(0, 4000));
  } catch (err) {
    console.error('erro:', err);
  }
}

listUsers();
