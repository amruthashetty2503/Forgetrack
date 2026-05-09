import pandas as pd

def inspect_student(file_path, student_name):
    xl = pd.ExcelFile(file_path)
    sheet_name = 'n8n links can be found here '
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    student_row = None
    for i, row in df.iterrows():
        if student_name.lower() in str(row.iloc[1]).lower():
            student_row = row
            break
            
    if student_row is not None:
        print(f"Found {student_name}:")
        headers = df.iloc[1]
        for i, val in enumerate(student_row):
            if i >= 7:
                header = headers.iloc[i]
                if str(val).strip().lower() in ['true', '1', '1.0', 'p', 'present', 'yes']:
                    print(f"  {header}: {val}")
    else:
        print(f"Student {student_name} not found")

if __name__ == "__main__":
    inspect_student("Data Engineering and AI - Actual Program (1).xlsx", "SANVITH S RAI")
