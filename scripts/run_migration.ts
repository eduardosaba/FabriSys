import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running user_ratings migration...');

    // Ler o arquivo de migração
    const migrationPath = join(process.cwd(), 'migrations', '028_setup_user_ratings.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Executar a migração
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      return;
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

void runMigration();
