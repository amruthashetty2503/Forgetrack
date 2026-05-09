import pandas as pd

def count_rows(file_path):
    xl = pd.ExcelFile(file_path)
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        print(f"Sheet: {sheet_name}, Rows: {len(df)}, Columns: {len(df.columns)}")

if __name__ == "__main__":
    count_rows("Data Engineering and AI - Actual Program (1).xlsx")
