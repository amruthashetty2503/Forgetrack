-- Create a secure function to lookup a student's email by their USN
-- This needs SECURITY DEFINER so unauthenticated users can call it during login to bypass RLS.
CREATE OR REPLACE FUNCTION public.get_email_by_usn(p_usn TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.students WHERE lower(usn) = lower(p_usn);
  RETURN v_email;
END;
$$;

