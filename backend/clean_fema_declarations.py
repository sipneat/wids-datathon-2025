import pandas as pd
from pathlib import Path
from datetime import datetime

# Define paths
DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "DisasterDeclarationsSummaries.csv"
OUTPUT_DIR = DATA_DIR / "intermediate"
OUTPUT_FILE = OUTPUT_DIR / "fema_fire_declarations.csv"

# Create output directory if it doesn't exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def clean_fema_declarations():
    """
    Clean and filter FEMA declarations data:
    - Filter to Fire incidents only
    - Normalize date columns
    - Create recovery_start_date
    - Keep relevant columns
    """
    
    # Read the CSV file
    df = pd.read_csv(INPUT_FILE)
    
    # Filter to Fire incidents only
    df = df[df["incidentType"] == "Fire"].copy()
    
    # Normalize date columns to YYYY-MM-DD format
    date_columns = ["incidentBeginDate", "incidentEndDate", "declarationDate"]
    for col in date_columns:
        if col in df.columns:
            # Parse ISO format datetime and convert to date only
            df[col] = pd.to_datetime(df[col], utc=True).dt.strftime("%Y-%m-%d")
    
    # Create recovery_start_date from declarationDate
    df["recovery_start_date"] = df["declarationDate"]
    
    # Select relevant columns
    # Columns to keep: declarationType, county FIPS (fipsCountyCode), programs (IA, PA, HMGP)
    columns_to_keep = [
        "declarationType",
        "fipsCountyCode",
        "iaProgramDeclared",
        "paProgramDeclared",
        "hmProgramDeclared",
        "incidentBeginDate",
        "incidentEndDate",
        "declarationDate",
        "recovery_start_date"
    ]
    
    df = df[columns_to_keep]
    
    # Rename columns for clarity
    df = df.rename(columns={
        "declarationType": "declaration_type",
        "fipsCountyCode": "county_fips",
        "iaProgramDeclared": "ia_program",
        "paProgramDeclared": "pa_program",
        "hmProgramDeclared": "hmgp_program",
        "incidentBeginDate": "incident_begin_date",
        "incidentEndDate": "incident_end_date",
        "declarationDate": "declaration_date"
    })
    
    # Save to CSV
    df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"✓ Cleaned FEMA fire declarations")
    print(f"  Input: {INPUT_FILE}")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"  Records: {len(df)}")
    
    return df

if __name__ == "__main__":
    clean_fema_declarations()
