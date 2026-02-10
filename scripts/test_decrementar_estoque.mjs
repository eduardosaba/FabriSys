import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Starting integration test: decrementar_estoque_loja');

  // 1) Find or create a PDV local
  let { data: locais } = await supabase.from('locais').select('id').eq('tipo', 'pdv').limit(1);
  let localId = locais?.[0]?.id || null;
  let createdLocal = false;

  if (!localId) {
    const nome = `local_teste_rpc_${Date.now()}`;
    const { data: newLocal, error: errLocal } = await supabase.from('locais').insert({ nome, tipo: 'pdv' }).select().single();
    if (errLocal) throw errLocal;
    localId = newLocal.id;
    createdLocal = true;
    console.log('Criado local de teste', localId);
  }

  // 2) Criar produto de teste
  const prodNome = `produto_teste_rpc_${Date.now()}`;
  const { data: prod, error: errProd } = await supabase
    .from('produtos_finais')
    .insert({ nome: prodNome, preco_venda: 1.0, ativo: true })
    .select()
    .single();
  if (errProd) throw errProd;
  const produtoId = prod.id;
  console.log('Criado produto teste', produtoId);

  // 3) Inserir estoque inicial
  const { error: errEst } = await supabase.from('estoque_produtos').upsert({
    produto_id: produtoId,
    local_id: localId,
    quantidade: 10,
    updated_at: new Date().toISOString(),
  });
  if (errEst) throw errEst;

  // 4) Chamar RPC para decrementar 3 unidades
  const { error: errRpc } = await supabase.rpc('decrementar_estoque_loja_numeric', {
    p_local_id: localId,
    p_produto_id: produtoId,
    // Enviar como string decimal para evitar ambiguidade entre overloads integer/numeric
    p_qtd: '3.0',
  });
  if (errRpc) throw errRpc;
  console.log('RPC executada: decremento de 3 unidades');

  // 5) Validar resultado
  const { data: estoque } = await supabase
    .from('estoque_produtos')
    .select('quantidade')
    .eq('produto_id', produtoId)
    .eq('local_id', localId)
    .single();

  console.log('Quantidade atual:', estoque?.quantidade);

  const expected = 7;
  if (Number(estoque?.quantidade) === expected) {
    console.log('Teste passou ✅');
  } else {
    console.error(`Teste falhou: esperado ${expected} got ${estoque?.quantidade}`);
    process.exit(1);
  }

  // Cleanup: remover produto (opcional)
  await supabase.from('produtos_finais').delete().eq('id', produtoId);
  if (createdLocal) await supabase.from('locais').delete().eq('id', localId);

  process.exit(0);
}

main().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
