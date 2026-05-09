import pandas as pd
import json

file_path = r"c:\Users\Amrutha\OneDrive\Documents\forgetrack\Data Engineering and AI - Actual Program (1).xlsx"

try:
    xl = pd.ExcelFile(file_path)
    sheets = xl.sheet_names
    print(f"Sheets: {sheets}")
    
    for sheet in sheets:
        df = pd.read_excel(xl, sheet_name=sheet)
        print(f"\n--- Sheet: {sheet} ---")
        print(f"Columns: {df.columns.tolist()}")
        print(f"First Row:\n{df.iloc[0].to_dict()}")
except Exception as e:
    print(f"Error: {e}")
