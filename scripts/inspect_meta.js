(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Defina as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente');
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Accept: 'application/json, text/plain, */*' } },
    });

    const localArg = process.argv[2] || process.env.LOCAL_ID || null;
    let localId = localArg;

    if (!localId) {
      console.log('Nenhum localId fornecido, buscando primeiro local PDV...');
      const { data: locais, error: locaisErr } = await supabase.from('locais').select('id, nome').eq('tipo', 'pdv').limit(1);
      if (locaisErr) throw locaisErr;
      if (!locais || locais.length === 0) {
        console.error('Nenhum local PDV encontrado');
        process.exit(2);
      }
      localId = locais[0].id;
      console.log('Usando localId:', localId, 'nome:', locais[0].nome);
    } else {
      console.log('Usando localId:', localId);
    }

    // Calcular intervalo do dia no fuso local
    const localStart = new Date();
    localStart.setHours(0, 0, 0, 0);
    const localEnd = new Date(localStart);
    localEnd.setDate(localEnd.getDate() + 1);

    const inicio = localStart.toISOString();
    const fim = localEnd.toISOString();

    console.log('Intervalo (local):', inicio, ' — ', fim);

    // Buscar meta do dia
    const dataRef = localStart.toISOString().split('T')[0];
    const { data: metaData, error: metaErr } = await supabase
      .from('metas_vendas')
      .select('*')
      .eq('local_id', localId)
      .eq('data_referencia', dataRef)
      .maybeSingle();
    if (metaErr) throw metaErr;
    console.log('Meta do dia:', metaData ?? null);

    // Buscar vendas do dia
    const { data: vendas, error: vendasErr } = await supabase
      .from('vendas')
      .select('id, created_at, total_venda')
      .eq('local_id', localId)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .order('created_at', { ascending: true });
    if (vendasErr) throw vendasErr;

    const total = (vendas || []).reduce((s, v) => s + Number(v.total_venda || 0), 0);
    console.log('Vendas encontradas:', (vendas || []).length, 'Total soma:', total);
    console.log('Entradas de vendas (primeiras 20):');
    console.log((vendas || []).slice(0, 20));

    process.exit(0);
  } catch (err) {
    console.error('Erro no script inspect_meta:', err);
    process.exit(1);
  }
})();
