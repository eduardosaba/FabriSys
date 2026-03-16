/**
 * Script de verificação de locais (Fábrica e PDVs) para uma organization_id
 * Uso: node scripts/verify_locais.js <ORGANIZATION_ID>
 * Ex.: node scripts/verify_locais.js 00000000-0000-0000-0000-000000000000
 */

const { supabase } = require('../lib/supabase-client');

async function main() {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error('Usage: node scripts/verify_locais.js <ORGANIZATION_ID>');
    process.exit(1);
  }

  console.log('Buscando locais para organization_id=', orgId);

  try {
    const { data, error } = await supabase
      .from('locais')
      .select('id, nome, tipo, endereco, created_at')
      .eq('organization_id', orgId)
      .order('tipo');

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('Nenhum local encontrado para essa organização.');
      process.exit(0);
    }

    console.log('Locais encontrados:');
    for (const loc of data) {
      console.log(`- id: ${loc.id} | nome: ${loc.nome} | tipo: ${loc.tipo}`);
    }

    // Mostrar fábrica(s) e PDVs separadamente
    const fabricas = data.filter((l) => l.tipo === 'fabrica');
    const pdvs = data.filter((l) => l.tipo === 'pdv' || l.tipo === 'loja' || l.tipo === 'pdv_loja');

    console.log('\nResumo:');
    console.log(`Fabricas: ${fabricas.length}`);
    fabricas.forEach((f) => console.log(`  - ${f.id} : ${f.nome}`));

    console.log(`PDVs: ${pdvs.length}`);
    pdvs.forEach((p) => console.log(`  - ${p.id} : ${p.nome}`));

    console.log(
      '\nUse os IDs acima para travar os parâmetros p_fabrica_id / p_pdv_id nas chamadas RPC.'
    );
  } catch (e) {
    console.error('Erro ao buscar locais:', e.message || e);
    process.exit(1);
  }
}

main();
