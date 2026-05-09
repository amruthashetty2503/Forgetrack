import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Try to load from .env.local
load_dotenv('frontend/.env.local')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Supabase credentials not found in env")
    exit(1)

supabase: Client = create_client(url, key)

def check_db():
    print("--- Students ---")
    res = supabase.table("students").select("id, usn, name").limit(5).execute()
    print(res.data)
    
    print("\n--- Sessions ---")
    res = supabase.table("sessions").select("id, date").limit(5).execute()
    print(res.data)
    
    # Count total sessions
    res = supabase.table("sessions").select("id", count="exact").execute()
    print(f"\nTotal sessions in DB: {res.count}")

if __name__ == "__main__":
    check_db()
