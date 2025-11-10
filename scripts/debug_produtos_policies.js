import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (hardcoded para debug)
const supabaseUrl = 'https://vrvpldtfutltmxkzfzkj.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydnBsZHRmdXRsdG14a3pmemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTQ4NzEsImV4cCI6MjA3NzYzMDg3MX0.Nj0s_1CDJZ6au5dsfZjBk_ZmiuiosrdheFtbMMUBPRY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProdutosFinaisPolicies() {
  try {
    console.log('=== DEBUG POLÍTICAS PRODUTOS FINAIS ===');

    // Verificar se produto específico existe
    console.log('=== VERIFICANDO PRODUTO ESPECÍFICO ===');
    const produtoId = '9656ba77-639d-45e0-8dfa-86818a858cac';
    console.log('Verificando produto ID:', produtoId);

    const { data: produtoData, error: produtoError } = await supabase
      .from('produtos_finais')
      .select('*')
      .eq('id', produtoId)
      .single();

    if (produtoError) {
      console.error('Erro ao buscar produto específico:', produtoError);
    } else {
      console.log('Produto encontrado:', produtoData);
    }

    // Verificar políticas RLS
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check')
      .eq('tablename', 'produtos_finais')
      .order('policyname');

    if (policiesError) {
      console.error('Erro ao buscar políticas:', policiesError);
    } else {
      console.log('Políticas encontradas:', policies);
    }

    // Verificar se RLS está habilitado
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('tablename', 'produtos_finais');

    if (tablesError) {
      console.error('Erro ao verificar RLS:', tablesError);
    } else {
      console.log('RLS habilitado:', tables);
    }

    // Tentar fazer um UPDATE simples para testar permissões
    console.log('\n=== TESTE DE PERMISSÃO UPDATE ===');
    const { data: testData, error: testError } = await supabase
      .from('produtos_finais')
      .select('id, nome')
      .limit(1);

    if (testError) {
      console.error('Erro ao fazer SELECT:', testError);
    } else {
      console.log('SELECT funcionou, produto encontrado:', testData);

      if (testData && testData.length > 0) {
        // Tentar UPDATE
        const { error: updateError } = await supabase
          .from('produtos_finais')
          .update({ nome: testData[0].nome }) // Mesmo valor para não alterar
          .eq('id', testData[0].id);

        if (updateError) {
          console.error('Erro ao fazer UPDATE:', updateError);
        } else {
          console.log('UPDATE funcionou!');
        }
      }
    }
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

debugProdutosFinaisPolicies();
