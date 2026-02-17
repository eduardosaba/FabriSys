import { supabase } from '@/lib/supabase';

export const FLOAT_BTN_SIZE = 56;

export function loadFloatingPosition(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

export function saveFloatingPosition(key: string, pos: { x: number; y: number } | null) {
  try {
    if (pos) localStorage.setItem(key, JSON.stringify(pos));
  } catch (e) {
    // ignore
  }
}

export async function saveFloatingPositionServer(userId: string | null | undefined, key: string, pos: { x: number; y: number } | null) {
  if (!userId) return;
  try {
    await supabase.from('user_ui_settings').upsert({ user_id: userId, key, value: pos } as any, { onConflict: 'user_id,key' });
  } catch (e) {
    // ignore server errors
  }
}

export async function loadFloatingPositionServer(userId: string | null | undefined, key: string) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.from('user_ui_settings').select('value').eq('user_id', userId).eq('key', key).maybeSingle();
    if (error) return null;
    return (data as any)?.value ?? null;
  } catch (e) {
    return null;
  }
}
