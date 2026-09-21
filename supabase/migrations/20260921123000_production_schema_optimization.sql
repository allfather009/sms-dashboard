-- ==============================================================================
-- Production Schema Optimization & Legacy Cleanup
-- ==============================================================================

-- 1. Schema Cleanup & Deprecation
-- Drop the legacy contacts table permanently as all records transitioned to public.students
DROP TABLE IF EXISTS public.contacts CASCADE;

-- 2. Purge Test Data
-- Clear out all sample/mock data from students and campaign_history for fresh production start
TRUNCATE TABLE public.students;
TRUNCATE TABLE public.campaign_history;

-- 3. Database Optimization & Constraints for students
-- Ensure student_id is unique
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_student_id_unique;
ALTER TABLE public.students ADD CONSTRAINT students_student_id_unique UNIQUE (student_id);

-- Ensure created_at timestamp default is set to now()
ALTER TABLE public.students ALTER COLUMN created_at SET DEFAULT now();

-- Create high-performance B-tree indexes for searching, filtering, and batch dispatch
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students (student_id);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students (department);
CREATE INDEX IF NOT EXISTS idx_students_stage ON public.students (stage);
CREATE INDEX IF NOT EXISTS idx_students_phone_number ON public.students (phone_number);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students (full_name);

-- 4. Row Level Security (RLS) & Policies Verification
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Students RLS policies
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public delete access to students" ON public.students;

CREATE POLICY "Allow public read access to students"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to students"
  ON public.students FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to students"
  ON public.students FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to students"
  ON public.students FOR DELETE
  TO anon, authenticated
  USING (true);

-- Campaign History RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_history') THEN
    DROP POLICY IF EXISTS "Allow public read access to campaign_history" ON public.campaign_history;
    DROP POLICY IF EXISTS "Allow public insert access to campaign_history" ON public.campaign_history;
    DROP POLICY IF EXISTS "Allow public update access to campaign_history" ON public.campaign_history;
    DROP POLICY IF EXISTS "Allow public delete access to campaign_history" ON public.campaign_history;

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
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow public delete access to campaign_history"
      ON public.campaign_history FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- SMS Templates RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_templates') THEN
    DROP POLICY IF EXISTS "Allow public read access to sms_templates" ON public.sms_templates;
    DROP POLICY IF EXISTS "Allow public insert access to sms_templates" ON public.sms_templates;
    DROP POLICY IF EXISTS "Allow public update access to sms_templates" ON public.sms_templates;
    DROP POLICY IF EXISTS "Allow public delete access to sms_templates" ON public.sms_templates;

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
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow public delete access to sms_templates"
      ON public.sms_templates FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
