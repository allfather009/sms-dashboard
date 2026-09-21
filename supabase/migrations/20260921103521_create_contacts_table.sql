-- ==============================================================================
-- Migration: Create Contacts Table with RLS Policies
-- ==============================================================================

-- 1. Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  stage TEXT NOT NULL DEFAULT 'Stage 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_department ON public.contacts (department);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON public.contacts (stage);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_name_phone ON public.contacts (name, phone_number);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing development policies if re-running
DROP POLICY IF EXISTS "Allow public read access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public delete access to contacts" ON public.contacts;

-- 6. Development Row Level Security (RLS) Policies
CREATE POLICY "Allow public read access to contacts"
  ON public.contacts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to contacts"
  ON public.contacts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to contacts"
  ON public.contacts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to contacts"
  ON public.contacts
  FOR DELETE
  TO anon, authenticated
  USING (true);
