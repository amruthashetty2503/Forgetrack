import pandas as pd

def check_usn(file_path, student_name):
    xl = pd.ExcelFile(file_path)
    sheet_name = 'n8n links can be found here '
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    for i, row in df.iterrows():
        if student_name.lower() in str(row.iloc[1]).lower():
            print(f"Name: {row.iloc[1]}, USN: {row.iloc[4]}")
            break

if __name__ == "__main__":
    check_usn("Data Engineering and AI - Actual Program (1).xlsx", "SANVITH S RAI")
