import pandas as pd

def inspect_full(file_path):
    xl = pd.ExcelFile(file_path)
    for sheet_name in xl.sheet_names:
        print(f"--- Sheet: {sheet_name} ---")
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        print("First 20 rows and 50 columns (if available):")
        print(df.iloc[:20, :50].to_string())
        print("\nColumn names if they exist in row 0 or 1:")
        print(df.iloc[0].tolist())
        print(df.iloc[1].tolist())

if __name__ == "__main__":
    inspect_full("Data Engineering and AI - Actual Program (1).xlsx")
