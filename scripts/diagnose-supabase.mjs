import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first (Next.js convention), then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_KEY');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Supabase URL:', url);
  try {
    console.log('\n1) Testando select em `fornecedores` (limit 5)');
    const f = await supabase.from('fornecedores').select('id,nome').limit(5);
    console.log('fornecedores:', f.error ? `ERROR: ${f.error.message || f.error}` : `OK (${(f.data||[]).length} rows)`);

    console.log('\n2) Testando select em `pedidos_compra` (limit 5)');
    const p = await supabase.from('pedidos_compra').select('id,numero,fornecedor_id').limit(5);
    console.log('pedidos_compra:', p.error ? `ERROR: ${p.error.message || p.error}` : `OK (${(p.data||[]).length} rows)`);

    console.log('\n3) Testando view/relacao `ficha_tecnica_insumos` (limit 3)');
    const ft = await supabase.from('ficha_tecnica_insumos').select('*').limit(3);
    console.log('ficha_tecnica_insumos:', ft.error ? `ERROR: ${ft.error.message || ft.error}` : `OK (${(ft.data||[]).length} rows)`);

    console.log('\n4) Invocando RPC `calcular_compras_planejamento()`');
    const rpc = await supabase.rpc('calcular_compras_planejamento');
    if (rpc.error) {
      console.error('RPC ERROR:', rpc.error);
    } else {
      const rows = rpc.data || [];
      console.log('RPC OK. rows:', Array.isArray(rows) ? rows.length : typeof rows);
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('Sample row keys:', Object.keys(rows[0]));
      }
    }

    console.log('\n5) Testando leitura de `itens_pedido_compra` (limit 3)');
    const ip = await supabase.from('itens_pedido_compra').select('id,insumo_id,quantidade').limit(3);
    console.log('itens_pedido_compra:', ip.error ? `ERROR: ${ip.error.message || ip.error}` : `OK (${(ip.data||[]).length} rows)`);

    const errors = [f.error, p.error, ft.error, rpc.error, ip.error].filter(Boolean);
    if (errors.length > 0) {
      console.error('\nDIAGNÓSTICO: Alguns endpoints produziram erros. Veja acima.');
      process.exit(3);
    }

    console.log('\nDIAGNÓSTICO: Tudo ok (sem erros nas chamadas testadas).');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error during diagnosis:', err);
    process.exit(4);
  }
}

run();
