import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const users = [
  { id: '7c5a47e3-10e2-48ba-980a-04bcf4ba3059', email: 'sababrtv@gmail.com', password: 'admin123' },
  {
    id: '3bedd5be-0992-4a07-a794-e84b36d7c7c4',
    email: 'eduardosaba.rep@gmail.com',
    password: 'fabrica123',
  },
  { id: 'a0cfb928-1420-4117-aefd-e6a79ad9ceed', email: 'eduardosaba@uol.com', password: 'pdv123' },
];

async function run() {
  for (const u of users) {
    try {
      console.log(`Patch password for ${u.email} (id ${u.id})`);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${u.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ password: u.password }),
        }
      );

      const text = await res.text();
      console.log('status', res.status);
      console.log('body', text);
    } catch (err) {
      console.error('err', err);
    }
    console.log('');
  }
}

run();
