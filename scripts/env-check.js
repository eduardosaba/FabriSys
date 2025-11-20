#!/usr/bin/env node

/**
 * Script para verificar variáveis de ambiente críticas
 * Executado automaticamente antes da build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis do .env.local se existir
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const optionalEnvVars = ['SUPABASE_SERVICE_ROLE_KEY'];

console.log('🔍 Verificando variáveis de ambiente críticas...\n');

let hasErrors = false;

// Verificar variáveis obrigatórias
console.log('📋 Variáveis obrigatórias:');
requiredEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: MISSING`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: OK`);
  }
});

// Verificar variáveis opcionais
console.log('\n📋 Variáveis opcionais:');
optionalEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  if (!value) {
    console.log(
      `⚠️  ${envVar}: MISSING (opcional, mas recomendado para funcionalidades administrativas)`
    );
  } else {
    console.log(`✅ ${envVar}: OK`);
  }
});

// Verificar se as URLs têm formato válido
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.log('\n⚠️  AVISO: NEXT_PUBLIC_SUPABASE_URL deve começar com https:// para produção');
}

if (hasErrors) {
  console.log('\n❌ ERRO: Variáveis de ambiente obrigatórias estão faltando!');
  console.log('💡 Dica: Copie .env.example para .env.local e preencha os valores necessários.');
  process.exit(1);
} else {
  console.log('\n✅ Todas as variáveis de ambiente críticas estão configuradas!');
}
