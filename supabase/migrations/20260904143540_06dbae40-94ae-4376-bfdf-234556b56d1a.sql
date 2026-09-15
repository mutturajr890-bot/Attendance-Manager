CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name text NOT NULL,
  year_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own branches" ON public.branches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.classes
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN term_start date,
  ADD COLUMN term_end date;

ALTER TABLE public.students
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE public.attendance
  ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;

-- migrate existing data: one branch per existing class
INSERT INTO public.branches (id, user_id, college_id, name, year_label)
SELECT c.id, c.user_id, c.college_id, c.class_name, COALESCE(c.semester_label, '')
FROM public.classes c;

UPDATE public.classes c SET branch_id = c.id;
UPDATE public.students s SET branch_id = s.class_id WHERE s.class_id IS NOT NULL;
UPDATE public.attendance a SET class_id = s.class_id
FROM public.students s WHERE s.id = a.student_id AND a.class_id IS NULL;

DELETE FROM public.attendance WHERE class_id IS NULL;

ALTER TABLE public.classes ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.attendance ALTER COLUMN class_id SET NOT NULL;

ALTER TABLE public.students DROP COLUMN class_id;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_att_date_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_class_student_date_key UNIQUE (class_id, student_id, att_date);

CREATE INDEX IF NOT EXISTS idx_branches_college ON public.branches(college_id);
CREATE INDEX IF NOT EXISTS idx_classes_branch ON public.classes(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON public.students(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, att_date);