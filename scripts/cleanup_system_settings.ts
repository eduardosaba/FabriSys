import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local file.');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateSettings() {
  try {
    console.log('Checking system_settings entries...');

    // Get all records
    const { data: allSettings, error: allError } = await supabase
      .from('system_settings')
      .select('key, id, updated_at, value')
      .order('key', { ascending: true });

    if (allError) throw allError;

    if (!allSettings) {
      console.log('No system_settings found');
      return;
    }

    console.log(`Found ${allSettings.length} system_settings records:`);
    allSettings.forEach((setting) => {
      console.log(`- Key: ${setting.key}, ID: ${setting.id}, Updated: ${setting.updated_at}`);
    });

    // Check specifically for dashboard_layout
    const dashboardLayout = allSettings.find((s) => s.key === 'dashboard_layout');
    if (dashboardLayout) {
      console.log('\nDashboard layout record found:');
      console.log(`ID: ${dashboardLayout.id}`);
      console.log(`Updated: ${dashboardLayout.updated_at}`);
      console.log(`Value length: ${JSON.stringify(dashboardLayout.value).length} characters`);
    } else {
      console.log('\nNo dashboard_layout record found');
    }

    // Group by key and find duplicates
    const keyGroups: Record<string, typeof allSettings> = {};
    allSettings.forEach((setting) => {
      if (!keyGroups[setting.key]) {
        keyGroups[setting.key] = [];
      }
      keyGroups[setting.key].push(setting);
    });

    const duplicates = Object.entries(keyGroups)
      .filter(([_key, records]) => records.length > 1)
      .map(([key, records]) => ({ key, records }));

    if (duplicates.length === 0) {
      console.log('No duplicate entries found');
      return;
    }

    console.log(`Found ${duplicates.length} keys with duplicates:`);
    duplicates.forEach(({ key, records }) => {
      console.log(`Key: ${key}, Records: ${records.length}`);
    });

    // Keep the most recent record for each key, delete others
    for (const { key, records } of duplicates) {
      const sortedRecords = records.sort(
        (a, b) =>
          new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime()
      );
      const toDelete = sortedRecords.slice(1); // All except the first (most recent)

      for (const record of toDelete) {
        console.log(`Deleting duplicate record for key '${key}' with ID ${record.id}`);
        const { error: deleteError } = await supabase
          .from('system_settings')
          .delete()
          .eq('id', record.id);

        if (deleteError) {
          console.error(`Error deleting record ${record.id}:`, deleteError);
        }
      }
    }

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

void cleanupDuplicateSettings();
