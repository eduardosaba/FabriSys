#!/usr/bin/env node

/**
 * Script de debug para validar persistência de cores em user_theme_colors
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas');
  console.error('Certifique-se de criar um arquivo .env.local com as credenciais do Supabase');
  process.exit(1);
}

console.log('🔍 Conectando ao Supabase...');
console.log(`   URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    console.log('\n📊 Buscando usuário autenticado...');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn(
        '⚠️  Nenhum usuário autenticado. Listando todos os registros em user_theme_colors...\n'
      );
    } else {
      console.log(`✅ Usuário autenticado: ${user.id} (${user.email})\n`);
    }

    // Query 1: Todos os registros de user_theme_colors
    console.log('📋 Registros em user_theme_colors:');
    console.log('─'.repeat(80));

    const { data: allRows, error: queryError } = await supabase
      .from('user_theme_colors')
      .select('*');

    if (queryError) {
      console.error(`❌ Erro ao buscar registros: ${queryError.message}`);
    } else if (!allRows || allRows.length === 0) {
      console.warn('⚠️  Nenhum registro encontrado em user_theme_colors');
    } else {
      console.log(`Total de registros: ${allRows.length}\n`);

      allRows.forEach((row, idx) => {
        console.log(`[${idx + 1}] ID: ${row.id}`);
        console.log(`    User: ${row.user_id}`);
        console.log(`    Mode: ${row.theme_mode}`);
        console.log(`    Primary: ${row.primary_color}`);
        console.log(`    Sidebar BG: ${row.sidebar_bg}`);
        console.log(`    Logo URL: ${row.logo_url || 'N/A'}`);
        console.log(`    Logo Scale: ${row.logo_scale || 'N/A'}`);
        console.log(`    Colors JSON: ${row.colors_json ? '✅ presente' : '❌ vazio'}`);
        if (row.colors_json) {
          try {
            const parsed = JSON.parse(row.colors_json);
            console.log(`      → Presets: ${parsed.presets ? parsed.presets.length : 0}`);
          } catch (e) {
            console.log(`      → ⚠️ JSON inválido`);
          }
        }
        console.log(
          `    Updated: ${row.updated_at ? new Date(row.updated_at).toLocaleString('pt-BR') : 'N/A'}`
        );
        console.log('');
      });
    }

    // Query 2: Se houver usuário autenticado, mostrar seus registros específicos
    if (user) {
      console.log('📌 Registros do usuário autenticado:');
      console.log('─'.repeat(80));

      const { data: userRows, error: userError } = await supabase
        .from('user_theme_colors')
        .select('*')
        .eq('user_id', user.id);

      if (userError) {
        console.error(`❌ Erro ao buscar registros do usuário: ${userError.message}`);
      } else if (!userRows || userRows.length === 0) {
        console.warn(`⚠️  Nenhum registro encontrado para usuário ${user.id}`);
      } else {
        console.log(`Total de registros do usuário: ${userRows.length}\n`);

        userRows.forEach((row) => {
          console.log(
            `[${row.theme_mode.toUpperCase()}] ${row.primary_color} | ${row.sidebar_bg} | ${new Date(row.updated_at).toLocaleString('pt-BR')}`
          );
        });
      }
    }

    console.log('\n✅ Debug concluído!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Abra http://localhost:3000/dashboard/configuracoes');
    console.log('   2. Vá para "Aparência" e aplique um tema ou edite uma cor');
    console.log('   3. Clique em "Salvar Customização"');
    console.log('   4. Rode este script novamente para verificar se os dados foram salvos');
  } catch (err) {
    console.error('❌ Erro durante execução:', err.message);
    process.exit(1);
  }
})();
