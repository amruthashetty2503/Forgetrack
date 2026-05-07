-- Seed Data for ForgeTrack

-- Note: We assume the mentor and test student will be created through the Auth UI or custom script since creating Auth users directly in SQL requires pgcrypto and raw passwords. 
-- However, we can create the student records and the triggers will handle creating the auth.users for students.

-- 1. Insert Mentors (Users)
-- These are the only hardcoded users we keep as per request.
-- Note: This requires the pgcrypto extension to be enabled for auth.users if run via SQL.
-- Most of the time it is better to create these via the Supabase Dashboard.

/*
DO $$
DECLARE
  mentor_id UUID := gen_random_uuid();
  co_fac_id UUID := gen_random_uuid();
BEGIN
  -- Insert Nischay (Lead Mentor)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
  VALUES (mentor_id, '00000000-0000-0000-0000-000000000000', 'nischay@theboringpeople.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"mentor","display_name":"Nischay"}', now(), now(), 'authenticated');
  
  INSERT INTO public.users (id, email, role, display_name)
  VALUES (mentor_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay');

  -- Insert Varun (Co-facilitator)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
  VALUES (co_fac_id, '00000000-0000-0000-0000-000000000000', 'varun@theboringpeople.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"mentor","display_name":"Varun"}', now(), now(), 'authenticated');
  
  INSERT INTO public.users (id, email, role, display_name)
  VALUES (co_fac_id, 'varun@theboringpeople.in', 'mentor', 'Varun');
END;
$$;
*/
