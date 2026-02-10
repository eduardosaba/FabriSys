#!/usr/bin/env node

const slug = process.argv[2] || 'ft-pao-queijo-1770675732955';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    'Faltam variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/fichas_tecnicas?slug=eq.${encodeURIComponent(slug)}&select=*`;

(async () => {
  try {
    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Resposta não-JSON:', text);
    }
  } catch (err) {
    console.error('Erro na requisição:', err?.message || err);
    process.exit(1);
  }
})();
