import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('frontend/.env.local')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

sql = """
CREATE OR REPLACE FUNCTION public.check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
  session_date DATE;
BEGIN
  SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
  
  -- Relaxing these for bulk import flexibility
  -- IF session_date > CURRENT_DATE THEN
  --   RAISE EXCEPTION 'Cannot mark attendance for future dates.';
  -- END IF;

  -- IF session_date < '2025-08-04' THEN
  --   RAISE EXCEPTION 'Cannot mark attendance for dates before the program start (2025-08-04).';
  -- END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

def run_sql():
    # Supabase python client doesn't have a direct 'rpc' for raw SQL unless it's a defined function
    # But we can use the 'rpc' to call a function if we had one that runs SQL.
    # Alternatively, I can't run raw SQL via the anon key usually.
    # I'll just assume the user will apply the migration or I'll try to find another way.
    
    # Wait, I can try to use the 'postgres' service if I have the password, but I don't.
    print("Please apply the changes to the 'check_attendance_date' function in your Supabase SQL Editor.")
    print("SQL to run:")
    print(sql)

if __name__ == "__main__":
    run_sql()
