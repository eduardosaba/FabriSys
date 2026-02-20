import type { SupabaseClient } from '@supabase/supabase-js';

// Tenta um select e, em caso de erro 42703 (coluna não existe), remove
// a coluna do select e re-tenta até esgotar as colunas.
export async function safeSelect(
  client: SupabaseClient,
  table: string,
  selectFields: string,
  apply?: (builder: any) => any
) {
  let fields = selectFields;
  const tried = new Set<string>();

  const extractMissing = (msg: string | undefined) => {
    if (!msg) return null;
    // Try several patterns (English and Portuguese, quoted or unquoted identifiers)
    const patterns = [
      /column\s+(?:[^.]+\.)?(?:"?([a-zA-Z0-9_]+)"?)\s+does not exist/i,
      /coluna\s+(?:[^.]+\.)?(?:"?([a-zA-Z0-9_]+)"?)\s+na[oó]\s+existe/i,
      /column\s+"([a-zA-Z0-9_]+)"\s+does not exist/i,
      /coluna\s+"([a-zA-Z0-9_]+)"\s+na[oó]\s+existe/i,
    ];

    for (const p of patterns) {
      const m = msg.match(p);
      if (m && m[1]) return m[1];
    }
    return null;
  };

  while (true) {
    const builder = client.from(table).select(fields);
    const finalBuilder = apply ? apply(builder) : builder;
    const res = await finalBuilder;
    // supabase returns { data, error }
    const { data, error } = res;
    if (!error) return { data, error: null };

    const missing = extractMissing(error.message || error.error || error.details);
    if (!missing) return { data: null, error };

    if (tried.has(missing)) return { data: null, error };
    tried.add(missing);

    // Remove missing column from fields and retry
    const arr = fields
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const filtered = arr.filter((f) => {
      const short = f.includes('.') ? f.split('.').pop() : f;
      return short !== missing;
    });
    if (filtered.length === arr.length) return { data: null, error };
    fields = filtered.join(', ');
  }
}

export default safeSelect;
