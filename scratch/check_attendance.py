import os
from supabase import create_client

# Read .env.local
env = {}
try:
    with open('frontend/.env.local', 'r') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                env[key] = val
except Exception as e:
    print(f"Error reading .env.local: {e}")
    exit(1)

url = env.get('VITE_SUPABASE_URL')
key = env.get('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    print("Supabase URL or Key missing in .env.local")
    exit(1)

supabase = create_client(url, key)

def check():
    # 1. Fetch students
    res = supabase.table('students').select('id, name, usn').order('name').limit(40).execute()
    students = res.data
    
    # 2. Fetch total sessions count
    res_sess = supabase.table('sessions').select('id', count='exact').execute()
    total_sessions = res_sess.count
    print(f"Total sessions in database: {total_sessions}")

    print("\nAttendance Summary (Sample 40 students):")
    print("-" * 60)
    print(f"{'Name':<30} | {'USN':<15} | {'Present':<7} | {'Total Records'}")
    print("-" * 60)
    
    for s in students:
        # Count present
        res_p = supabase.table('attendance').select('*', count='exact').eq('student_id', s['id']).eq('present', True).execute()
        present_count = res_p.count
        
        # Count total records for this student
        res_t = supabase.table('attendance').select('*', count='exact').eq('student_id', s['id']).execute()
        total_records = res_t.count
        
        print(f"{s['name'][:30]:<30} | {s['usn']:<15} | {present_count:<7} | {total_records}")

if __name__ == "__main__":
    check()
