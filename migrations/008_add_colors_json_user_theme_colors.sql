-- Migration: Add colors_json column to user_theme_colors
-- Run this on your Supabase/Postgres instance
BEGIN;
ALTER TABLE public.user_theme_colors
  ADD COLUMN IF NOT EXISTS colors_json TEXT;
COMMIT;
