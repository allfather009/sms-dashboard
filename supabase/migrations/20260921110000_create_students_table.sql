-- ==============================================================================
-- Migration: Create Students Table with Unique Student ID and RLS Policies
-- ==============================================================================

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  stage TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students (student_id);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students (department);
CREATE INDEX IF NOT EXISTS idx_students_stage ON public.students (stage);
CREATE INDEX IF NOT EXISTS idx_students_phone_number ON public.students (phone_number);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing development policies if re-running
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public delete access to students" ON public.students;

-- 6. Development Row Level Security (RLS) Policies
CREATE POLICY "Allow public read access to students"
  ON public.students
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to students"
  ON public.students
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to students"
  ON public.students
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to students"
  ON public.students
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 7. Seed initial sample university students (Bulk SMS Iraq format: 9647XXXXXXXXX)
INSERT INTO public.students (student_id, full_name, department, stage, phone_number)
VALUES
  ('U2024-1001', 'Ahmed Ali Al-Bayati', 'Information Technology', 'Stage 2', '9647501234567'),
  ('U2024-1002', 'Fatima Zahra Hassan', 'Information Technology', 'Stage 2', '9647702345678'),
  ('U2024-1003', 'Mustafa Mohammed Kareem', 'Computer Science', 'Stage 1', '9647803456789'),
  ('U2024-1004', 'Zainab Hussein Al-Musawi', 'Computer Science', 'Stage 1', '9647504567890'),
  ('U2024-1005', 'Omar Farooq Al-Janabi', 'Software Engineering', 'Stage 3', '9647705678901'),
  ('U2024-1006', 'Noor Al-Huda Kadhim', 'Software Engineering', 'Stage 3', '9647806789012'),
  ('U2024-1007', 'Youssef Tariq Al-Hamadani', 'Civil Engineering', 'Stage 4', '9647507890123'),
  ('U2024-1008', 'Mariam Aqeel Al-Saadi', 'Civil Engineering', 'Stage 4', '9647708901234'),
  ('U2024-1009', 'Haider Salam Al-Khafaji', 'Business Administration', 'Stage 1', '9647809012345'),
  ('U2024-1010', 'Sara Bilal Al-Obaidi', 'Business Administration', 'Stage 2', '9647501122334'),
  ('U2024-1011', 'Ali Murtadha Al-Hakim', 'Information Technology', 'Stage 1', '9647702233445'),
  ('U2024-1012', 'Dalia Raad Al-Tikriti', 'Computer Science', 'Stage 3', '9647803344556')
ON CONFLICT (student_id) DO NOTHING;
