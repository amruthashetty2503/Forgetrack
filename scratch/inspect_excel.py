import pandas as pd
import json

def inspect_excel(file_path):
    try:
        # Load the excel file
        xl = pd.ExcelFile(file_path)
        print(f"Sheet names: {xl.sheet_names}")
        
        # Load the first sheet or the one that looks relevant
        sheet_name = xl.sheet_names[0]
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # Print first few rows to see the structure
        print("\nFirst 10 rows:")
        print(df.head(10).to_string())
        
        # Identify columns that look like attendance
        # Usually they have dates or P/A values
        
        # Let's try to find the header row
        header_row_idx = -1
        for i, row in df.iterrows():
            if any(str(cell).lower().strip() in ['usn', 'name', 'email'] for cell in row):
                header_row_idx = i
                break
        
        if header_row_idx != -1:
            print(f"\nDetected header row at index: {header_row_idx}")
            headers = df.iloc[header_row_idx]
            print("\nHeaders:")
            print(headers.tolist())
            
            # Count attendance columns
            attendance_cols = []
            for i, col in enumerate(headers):
                # Try to parse as date or look for 'Attendance'
                if pd.notnull(col):
                    col_str = str(col).lower()
                    if 'attendance' in col_str:
                        attendance_cols.append(i)
                    # Check if it looks like a date (e.g. 04/08, 06/08, etc.)
                    import re
                    if re.search(r'\d{1,2}/\d{1,2}', col_str):
                        attendance_cols.append(i)
            
            print(f"\nNumber of potential attendance columns: {len(set(attendance_cols))}")
            
            # Check a few students and their attendance
            data = df.iloc[header_row_idx+1:]
            print("\nSample student data (first 5 students):")
            for i in range(min(5, len(data))):
                student_row = data.iloc[i]
                print(f"Student: {student_row.iloc[1]} (USN: {student_row.iloc[0]})")
                attendance = student_row.iloc[attendance_cols]
                present_count = sum(1 for val in attendance if str(val).strip().lower() in ['p', '1', 'present', 'yes', 'true'])
                total_count = len(attendance)
                print(f"  Attendance: {present_count}/{total_count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_excel("Data Engineering and AI - Actual Program (1).xlsx")
