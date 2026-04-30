-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Mentors have full access to everything
CREATE POLICY "Mentors can do everything on students" ON public.students FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

CREATE POLICY "Mentors can do everything on sessions" ON public.sessions FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

CREATE POLICY "Mentors can do everything on attendance" ON public.attendance FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

CREATE POLICY "Mentors can do everything on materials" ON public.materials FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

CREATE POLICY "Mentors can do everything on import_log" ON public.import_log FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

CREATE POLICY "Mentors can do everything on users" ON public.users FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

-- Students access policies
CREATE POLICY "Students can view their own profile" ON public.students FOR SELECT USING (
  id = (SELECT student_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Students can view all sessions" ON public.sessions FOR SELECT USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
);

CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT USING (
  student_id = (SELECT student_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Students can view all materials" ON public.materials FOR SELECT USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
);

CREATE POLICY "Users can view their own user profile" ON public.users FOR SELECT USING (
  id = auth.uid()
);
