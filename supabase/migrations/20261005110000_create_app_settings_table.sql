-- ==============================================================================
-- Migration: Create app_settings table for SMS Gateways & General configuration
-- Created at: 2026-10-05
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies for public reading & updating
DROP POLICY IF EXISTS "Allow public read access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public read access to app_settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public upsert access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public upsert access to app_settings"
  ON public.app_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
