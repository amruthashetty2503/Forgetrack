import pandas as pd

def inspect_full(file_path, output_path):
    xl = pd.ExcelFile(file_path)
    with open(output_path, "w", encoding="utf-8") as f:
        for sheet_name in xl.sheet_names:
            f.write(f"--- Sheet: {sheet_name} ---\n")
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
            f.write("First 20 rows and 100 columns:\n")
            f.write(df.iloc[:20, :100].to_string())
            f.write("\n\n")
            f.write("Row 0: " + str(df.iloc[0].tolist()) + "\n")
            f.write("Row 1: " + str(df.iloc[1].tolist()) + "\n")
            f.write("Row 2: " + str(df.iloc[2].tolist()) + "\n")
            f.write("Row 3: " + str(df.iloc[3].tolist()) + "\n")
            f.write("-" * 50 + "\n\n")

if __name__ == "__main__":
    inspect_full("Data Engineering and AI - Actual Program (1).xlsx", "c:/Users/Amrutha/OneDrive/Documents/forgetrack/scratch/excel_inspection.txt")
