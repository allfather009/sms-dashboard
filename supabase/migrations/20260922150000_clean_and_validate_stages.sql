-- ==============================================================================
-- Migration: Stage Data Cleanup & Strict Stage Check Constraint
-- ==============================================================================

-- 1. Clean existing misspelled stage data in students table
UPDATE public.students
SET stage = REPLACE(stage, 'Stage Satge ', 'Stage ')
WHERE stage LIKE '%Stage Satge %';

-- Clean any remaining 'Satge ' or case variations
UPDATE public.students
SET stage = REPLACE(stage, 'Satge ', 'Stage ')
WHERE stage LIKE '%Satge %';

-- Clean any double spaces
UPDATE public.students
SET stage = REGEXP_REPLACE(stage, '\s+', ' ', 'g')
WHERE stage ~ '\s{2,}';

-- Ensure trimmed
UPDATE public.students
SET stage = TRIM(stage)
WHERE stage <> TRIM(stage);

-- Standardize any numbers (1-5) to 'Stage X' format
UPDATE public.students
SET stage = 'Stage ' || SUBSTRING(stage FROM '[1-5]')
WHERE stage ~ '[1-5]' AND stage NOT IN ('Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5');

-- Ensure any invalid or null stages fall back to 'Stage 1'
UPDATE public.students
SET stage = 'Stage 1'
WHERE stage IS NULL OR stage NOT IN ('Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5');

-- 2. Drop existing constraint if present
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_stage_check;

-- 3. Add CHECK constraint enforcing valid standard stages
ALTER TABLE public.students
  ADD CONSTRAINT students_stage_check
  CHECK (stage IN ('Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'));
