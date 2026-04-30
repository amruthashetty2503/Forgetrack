-- Create a trigger function to create an auth user when a student is added
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  new_email TEXT;
BEGIN
  new_user_id := gen_random_uuid();
  -- Auto-generate email based on USN if email is null
  new_email := COALESCE(NEW.email, lower(NEW.usn) || '@forge.local');

  -- Insert into auth.users (Requires Supabase privileges)
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at, 
    role, 
    confirmation_token, 
    email_change, 
    email_change_token_new, 
    recovery_token
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    new_email,
    -- Default password is the USN
    crypt(NEW.usn, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'student_id', NEW.id, 'display_name', NEW.name),
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, student_id, display_name)
  VALUES (new_user_id, new_email, 'student', NEW.id, NEW.name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();
