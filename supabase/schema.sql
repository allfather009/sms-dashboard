-- ==============================================================================
-- AIRSMS STUDIO - FULL SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run these SQL statements in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
-- URL: https://supabase.com/dashboard/project/uqprjlfaindjftaeepqf/sql/new
-- ==============================================================================

-- 1. Enable uuid extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE 1: CONTACTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  stage TEXT NOT NULL DEFAULT 'Stage 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_department ON public.contacts (department);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON public.contacts (stage);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_name_phone ON public.contacts (name, phone_number);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public delete access to contacts" ON public.contacts;

-- RLS Policies for contacts (anon & authenticated access)
CREATE POLICY "Allow public read access to contacts"
  ON public.contacts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to contacts"
  ON public.contacts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to contacts"
  ON public.contacts FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access to contacts"
  ON public.contacts FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- TABLE 2: CAMPAIGN HISTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'delivered',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  total_segments INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  message_preview TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for campaign history
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_at ON public.campaign_history (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_batch_id ON public.campaign_history (batch_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaign_history (status);

-- Enable Row Level Security
ALTER TABLE public.campaign_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to campaign_history" ON public.campaign_history;
DROP POLICY IF EXISTS "Allow public insert access to campaign_history" ON public.campaign_history;
DROP POLICY IF EXISTS "Allow public update access to campaign_history" ON public.campaign_history;
DROP POLICY IF EXISTS "Allow public delete access to campaign_history" ON public.campaign_history;

-- RLS Policies for campaign_history
CREATE POLICY "Allow public read access to campaign_history"
  ON public.campaign_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to campaign_history"
  ON public.campaign_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to campaign_history"
  ON public.campaign_history FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access to campaign_history"
  ON public.campaign_history FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- TABLE 3: SMS TEMPLATES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sms templates
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.sms_templates (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to sms_templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Allow public insert access to sms_templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Allow public update access to sms_templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Allow public delete access to sms_templates" ON public.sms_templates;

-- RLS Policies for sms_templates
CREATE POLICY "Allow public read access to sms_templates"
  ON public.sms_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to sms_templates"
  ON public.sms_templates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sms_templates"
  ON public.sms_templates FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access to sms_templates"
  ON public.sms_templates FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- SEED DATA: CONTACTS
-- ==============================================================================
INSERT INTO public.contacts (name, phone_number, department, stage)
VALUES 
  ('Eleanor Vance', '+1 (415) 555-0192', 'Sales', 'Stage 1'),
  ('Marcus Sterling', '+1 (312) 555-0144', 'Engineering', 'Stage 2'),
  ('Sophia Chen', '+1 (206) 555-0187', 'Sales', 'Stage 1'),
  ('Liam O’Connor', '+44 7700 900142', 'Human Resources', 'Stage 3'),
  ('Amara Okafor', '+1 (512) 555-0178', 'Product', 'Stage 2'),
  ('Julian Hayes', '+1 (617) 555-0163', 'Sales', 'Stage 2'),
  ('Clara Dupont', '+33 6 12 34 56 78', 'Marketing', 'Stage 1'),
  ('Tariq Al-Mansoor', '+971 50 123 4567', 'Human Resources', 'Stage 1'),
  ('Zoe Katsaros', '+1 (408) 555-0129', 'Engineering', 'Stage 3'),
  ('Devon Miller', '+1 (303) 555-0199', 'Marketing', 'Stage 2'),
  ('Maya Patel', '+1 (917) 555-0112', 'Sales', 'Stage 1'),
  ('Lucas Silva', '+55 11 98765-4321', 'Product', 'Stage 3')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- SEED DATA: SMS TEMPLATES
-- ==============================================================================
INSERT INTO public.sms_templates (title, description, content, is_default)
VALUES
  ('Stage Status Update', 'Personalized update regarding current progress stage', 'Hi {Name}, your {Department} account is now transitioning into {Stage}. Please reply to this message if you have any questions.', true),
  ('Consultation Reminder', 'Upcoming meeting or check-in reminder', 'Hello {Name}! Quick reminder of your scheduled consultation with the {Department} team tomorrow at 2:00 PM. Reply 1 to confirm.', true),
  ('Milestone Completion', 'Celebratory notification for closed or advanced stages', 'Great news {Name}! We have completed the review process for your file in {Department}. We look forward to working with you.', true),
  ('Action Item Request', 'Prompt recipient to submit required documentation', 'Attention {Name}: The {Department} team needs your updated confirmation to proceed with {Stage}. Please submit by end of day today.', true)
ON CONFLICT DO NOTHING;
