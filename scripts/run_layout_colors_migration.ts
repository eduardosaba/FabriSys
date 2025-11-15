import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runLayoutColorsMigration() {
  console.log('Running layout colors migration...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const migrationPath = join(process.cwd(), 'migrations', '052_add_layout_colors_to_theme.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration SQL...');

    // Execute the migration using raw SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Layout colors migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

void runLayoutColorsMigration();
