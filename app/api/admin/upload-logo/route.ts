import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const organization_id = form.get('organization_id') as string | null;
    const scaleRaw = form.get('logo_scale') as string | null;
    const chave = 'config_visual';

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Basic validation
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'file too large (max 5MB)' }, { status: 400 });
    }

    // Generate resized variants (we'll store the original + md)
    const fileExt = (file.name || 'logo').split('.').pop() || 'png';
    const baseName = `system_logo_${Date.now()}`;
    const originalPath = `settings/${baseName}.${fileExt}`;
    const mdPath = `settings/${baseName}_md.${fileExt}`;

    // Upload original to `company_assets` bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('company_assets')
      .upload(originalPath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) throw uploadErr;

    // Create medium resized (max width 300)
    const mdBuffer = await sharp(buffer)
      .resize({ width: 300, withoutEnlargement: true })
      .toBuffer();
    const { error: uploadMdErr } = await supabaseAdmin.storage
      .from('company_assets')
      .upload(mdPath, mdBuffer, { contentType: file.type, upsert: false });
    if (uploadMdErr) throw uploadMdErr;

    const { data: publicData } = supabaseAdmin.storage
      .from('company_assets')
      .getPublicUrl(originalPath);
    const publicUrl = publicData.publicUrl;

    // Persist configuration using RPC upsert for safety / permissions
    const valor = {
      logo_url: publicUrl,
      logo_scale: scaleRaw ? Number(scaleRaw) : 1,
    };

    await supabaseAdmin.rpc('rpc_upsert_configuracoes_sistema', {
      p_organization_id: organization_id ?? null,
      p_chave: chave,
      p_valor: valor,
    });

    return NextResponse.json({ ok: true, publicUrl });
  } catch (err: any) {
    console.error('upload-logo error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
