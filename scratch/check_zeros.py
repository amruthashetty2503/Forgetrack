import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('frontend/.env.local')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def check_zeros():
    # Fetch all students
    students = supabase.table("students").select("id, usn, name").execute().data
    
    # Fetch session count
    sessions_count = supabase.table("sessions").select("id", count="exact").execute().count
    
    # Fetch attendance
    attendance = supabase.table("attendance").select("student_id, present").execute().data
    
    stats = {s['id']: {'attended': 0, 'name': s['name'], 'usn': s['usn']} for s in students}
    for a in attendance:
        if a['present'] and a['student_id'] in stats:
            stats[a['student_id']]['attended'] += 1
            
    print(f"Total Sessions: {sessions_count}")
    print("\nStudents with 0% attendance:")
    found = False
    for sid, s in stats.items():
        if s['attended'] == 0:
            print(f"Name: {s['name']}, USN: {s['usn']}, ID: {sid}")
            found = True
    if not found:
        print("None found with exactly 0 attended.")
    else:
        # Check if they have ANY attendance records (even absent ones)
        all_att = supabase.table("attendance").select("student_id").execute().data
        att_sids = set(a['student_id'] for a in all_att)
        print("\nStudents with NO attendance records at all:")
        for sid, s in stats.items():
            if sid not in att_sids:
                print(f"Name: {s['name']}, USN: {s['usn']}")

if __name__ == "__main__":
    check_zeros()
