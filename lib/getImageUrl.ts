export default function getImageUrl(
  value?: string | null,
  options?: { bucket?: string }
): string | null {
  if (!value) return null;
  const v = String(value).trim();

  if (!v) return null;
  // keep data URLs and absolute URLs
  if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://')) return v;

  const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const bucket = options?.bucket || 'logos';

  // Already a storage path without origin
  if (v.startsWith('/storage/v1/object/public/')) {
    return SUPABASE_URL ? `${SUPABASE_URL}${v}` : v;
  }

  // Legacy local uploads: /uploads/xxx -> map to storage public URL when possible
  if (v.startsWith('/uploads/')) {
    const key = v.replace(/^\/uploads\//, '');
    return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}` : v;
  }

  // If value looks like: bucket/path/to/file.jpg or logos/file.png
  if (!v.startsWith('/') && v.includes('/')) {
    // treat as storage path
    return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${v}` : `/${v}`;
  }

  // Fallback: if it's a plain filename, assume it's stored in the bucket
  if (!v.includes('/')) {
    return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${v}` : `/uploads/${v}`;
  }

  return v;
}
