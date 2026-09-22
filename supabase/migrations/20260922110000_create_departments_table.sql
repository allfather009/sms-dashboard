-- ==============================================================================
-- Migration: Create Departments Table & Pre-populate TIU Sulaimani Departments
-- ==============================================================================

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create index on department name for fast lookups
CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments (name);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for departments
DROP POLICY IF EXISTS "Allow public read access to departments" ON public.departments;
CREATE POLICY "Allow public read access to departments"
  ON public.departments FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to departments" ON public.departments;
CREATE POLICY "Allow public insert access to departments"
  ON public.departments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to departments" ON public.departments;
CREATE POLICY "Allow public update access to departments"
  ON public.departments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to departments" ON public.departments;
CREATE POLICY "Allow public delete access to departments"
  ON public.departments FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. Seed TIU Sulaimani departments by default
INSERT INTO public.departments (name) VALUES
  ('Architectural Engineering'),
  ('Interior Design Engineering'),
  ('Civil Engineering'),
  ('Computer Engineering'),
  ('Information Technology (IT)'),
  ('English Language Teaching'),
  ('Business and Management'),
  ('Dentistry'),
  ('Pharmacy'),
  ('Physiotherapy'),
  ('Finance and Banking'),
  ('International Relations and Diplomacy'),
  ('Accounting'),
  ('Medical Analysis'),
  ('Nursing')
ON CONFLICT (name) DO NOTHING;

-- 6. Ensure any existing students have their departments registered in departments table
INSERT INTO public.departments (name)
SELECT DISTINCT s.department
FROM public.students s
WHERE s.department IS NOT NULL
  AND s.department <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.departments d WHERE d.name = s.department
  )
ON CONFLICT (name) DO NOTHING;

-- 7. Add foreign key constraint to students table
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS fk_students_department;

ALTER TABLE public.students
  ADD CONSTRAINT fk_students_department
  FOREIGN KEY (department) REFERENCES public.departments (name)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
