-- Seed Data for ForgeTrack

-- Note: We assume the mentor and test student will be created through the Auth UI or custom script since creating Auth users directly in SQL requires pgcrypto and raw passwords. 
-- However, we can create the student records and the triggers will handle creating the auth.users for students.

-- 1. Insert 25 Students
INSERT INTO public.students (name, usn, branch_code, batch, email, admission_number) VALUES
('Abhishek Sharma', '4SH24CS001', 'CS', '2024-2028', 'abhishek@forge.local', '24CS001'),
('Divya Kulkarni', '4SH24CS002', 'AI', '2024-2028', 'divya@forge.local', '24CS002'),
('Ravi Kumar', '4SH24CS003', 'CS', '2024-2028', 'ravi@forge.local', '24CS003'),
('Sneha Reddy', '4SH24CS004', 'IS', '2024-2028', 'sneha@forge.local', '24IS001'),
('Karan Patel', '4SH24CS005', 'CS', '2024-2028', 'karan@forge.local', '24CS005'),
('Priya Singh', '4SH24CS006', 'AI', '2024-2028', 'priya@forge.local', '24AI003'),
('Rahul Verma', '4SH24CS007', 'CS', '2024-2028', 'rahul@forge.local', '24CS007'),
('Neha Gupta', '4SH24CS008', 'IS', '2024-2028', 'neha@forge.local', '24IS004'),
('Vikram Singh', '4SH24CS009', 'AI', '2024-2028', 'vikram@forge.local', '24AI005'),
('Anjali Desai', '4SH24CS010', 'CS', '2024-2028', 'anjali@forge.local', '24CS010'),
('Arjun Nair', '4SH24CS011', 'CS', '2024-2028', 'arjun@forge.local', '24CS011'),
('Meera Menon', '4SH24CS012', 'AI', '2024-2028', 'meera@forge.local', '24AI006'),
('Rohan Das', '4SH24CS013', 'IS', '2024-2028', 'rohan@forge.local', '24IS007'),
('Pooja Iyer', '4SH24CS014', 'CS', '2024-2028', 'pooja@forge.local', '24CS014'),
('Siddharth Rao', '4SH24CS015', 'AI', '2024-2028', 'siddharth@forge.local', '24AI008'),
('Kavya Shetty', '4SH24CS016', 'CS', '2024-2028', 'kavya@forge.local', '24CS016'),
('Aditya Joshi', '4SH24CS017', 'IS', '2024-2028', 'aditya@forge.local', '24IS009'),
('Nandini Bhat', '4SH24CS018', 'CS', '2024-2028', 'nandini@forge.local', '24CS018'),
('Varun Prasad', '4SH24CS019', 'AI', '2024-2028', 'varunp@forge.local', '24AI010'),
('Shruti Hegde', '4SH24CS020', 'CS', '2024-2028', 'shruti@forge.local', '24CS020'),
('Akash Gowda', '4SH24CS021', 'IS', '2024-2028', 'akash@forge.local', '24IS011'),
('Nikita Patil', '4SH24CS022', 'CS', '2024-2028', 'nikita@forge.local', '24CS022'),
('Manoj M', '4SH24CS023', 'AI', '2024-2028', 'manoj@forge.local', '24AI012'),
('Rashmi R', '4SH24CS024', 'CS', '2024-2028', 'rashmi@forge.local', '24CS024'),
('Sanjay K', '4SH24CS025', 'IS', '2024-2028', 'sanjay@forge.local', '24IS013')
ON CONFLICT (usn) DO NOTHING;

-- 2. Insert 15 Sessions
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type, notes) VALUES
('2025-11-01', '8-Layer AI Stack', 4, 2.0, 'offline', 'Introduction to the full stack'),
('2025-11-04', 'Python Fundamentals', 4, 2.0, 'offline', 'Basic Python concepts'),
('2025-11-08', 'Data Structures', 4, 2.0, 'online', 'Lists, Dicts, Sets'),
('2025-11-15', 'FastAPI Introduction', 4, 2.5, 'offline', 'Building basic APIs'),
('2025-11-22', 'Database Integration', 4, 2.0, 'offline', 'SQLAlchemy basics'),

('2025-12-02', 'LLM Fundamentals', 5, 2.0, 'offline', 'How LLMs work'),
('2025-12-09', 'Prompt Engineering', 5, 2.0, 'online', 'Writing effective prompts'),
('2025-12-16', 'ReAct Agent Pattern', 5, 2.5, 'offline', 'Reasoning and Acting'),
('2025-12-23', 'LangChain Basics', 5, 2.0, 'offline', 'Introduction to LangChain'),
('2025-12-30', 'Vector Embeddings', 5, 2.0, 'offline', 'Creating and storing embeddings'),

('2026-01-06', 'pgvector RAG', 6, 2.0, 'offline', 'Retrieval Augmented Generation with Postgres'),
('2026-01-13', 'Advanced RAG', 6, 2.0, 'online', 'Chunking strategies and reranking'),
('2026-01-20', 'Tiered Autonomy Multi-Agent', 6, 3.0, 'offline', 'Building multi-agent systems'),
('2026-01-27', 'Agent Evaluation', 6, 2.0, 'offline', 'Evaluating agent performance'),
('2026-02-03', 'Deployment Strategies', 6, 2.0, 'offline', 'Deploying AI applications')
ON CONFLICT (date) DO NOTHING;

-- 3. Insert Attendance (Sample random attendance distribution)
-- We use a CROSS JOIN to generate records for all students and sessions, and use random() to mark ~80% present.
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT 
  st.id as student_id,
  se.id as session_id,
  CASE WHEN random() > 0.2 THEN true ELSE false END as present,
  'system' as marked_by
FROM public.students st
CROSS JOIN public.sessions se
ON CONFLICT (student_id, session_id) DO NOTHING;

-- 4. Insert Materials
INSERT INTO public.materials (session_id, title, type, url, description)
SELECT 
  id as session_id,
  topic || ' Slides',
  'slides',
  'https://docs.google.com/presentation/d/placeholder/edit',
  'Presentation slides for ' || topic
FROM public.sessions;

INSERT INTO public.materials (session_id, title, type, url, description)
SELECT 
  id as session_id,
  topic || ' Recording',
  'recording',
  'https://youtube.com/watch?v=placeholder',
  'Session recording for ' || topic
FROM public.sessions WHERE session_type = 'online';

-- 5. Insert Import Log
INSERT INTO public.import_log (filename, uploaded_by, total_rows, imported_rows, skipped_rows, warnings, column_mapping, status) VALUES
('month4_attendance.csv', 'Nischay', 120, 118, 2, '[{"row": 15, "msg": "Student missing name"}]', '{"name":"student_name", "usn":"usn", "15/11/25":"date"}', 'completed'),
('month5_attendance.csv', 'Varun', 125, 125, 0, '[]', '{"name":"student_name", "usn":"usn", "12/12/25":"date"}', 'completed');

-- To create the Mentor User manually (this requires pgcrypto to be enabled for auth.users, which might be restricted):
-- The user should run this part manually if they want to seed the mentor, otherwise create via Supabase UI.
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
