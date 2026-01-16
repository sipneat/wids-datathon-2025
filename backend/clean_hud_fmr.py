"""
Clean and normalize HUD FMR (Fair Market Rent) data.

Input: HUD FMR data for 2023 and 2025
Tasks:
  - Normalize county identifiers
  - Compute avg_fmr (mean of 1-2 bedroom)
  - Keep year as explicit column
Output: data/intermediate/hud_fmr_clean.csv
"""

import pandas as pd
import os

# Define input and output paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
INTERMEDIATE_DIR = os.path.join(DATA_DIR, "intermediate")
FY23_PATH = os.path.join(DATA_DIR, "FY23_FMRs_revised.csv")
FY25_PATH = os.path.join(DATA_DIR, "FY25_FMRs_revised.csv")
OUTPUT_PATH = os.path.join(INTERMEDIATE_DIR, "hud_fmr_clean.csv")

# Create intermediate directory if it doesn't exist
os.makedirs(INTERMEDIATE_DIR, exist_ok=True)


def load_and_process_fmr_data():
    """Load, process, and combine FMR data from 2023 and 2025."""
    
    # Load FY2023 data
    print("Loading FY2023 FMR data...")
    df_2023 = pd.read_csv(FY23_PATH)
    df_2023["year"] = 2023
    
    # Load FY2025 data
    print("Loading FY2025 FMR data...")
    df_2025 = pd.read_csv(FY25_PATH)
    df_2025["year"] = 2025
    
    # Standardize column names (FY25 has 'stusps' instead of 'state_alpha')
    df_2025.rename(columns={"stusps": "state_alpha", "state": "state_fips"}, inplace=True)
    
    # Select common columns
    common_columns = ["fips", "countyname", "state_alpha", "fmr_1", "fmr_2", "year"]
    df_2023_selected = df_2023[common_columns].copy()
    df_2025_selected = df_2025[common_columns].copy()
    
    # Combine datasets
    print("Combining 2023 and 2025 data...")
    df_combined = pd.concat([df_2023_selected, df_2025_selected], ignore_index=True)
    
    # Normalize FIPS (ensure it's zero-padded to 10 digits for consistency)
    df_combined["fips"] = df_combined["fips"].astype(str).str.zfill(10)
    
    # Compute average FMR for 1-2 bedroom units
    df_combined["avg_fmr"] = df_combined[["fmr_1", "fmr_2"]].mean(axis=1).round(2)
    
    # Select and order final columns
    df_clean = df_combined[["fips", "countyname", "state_alpha", "fmr_1", "fmr_2", "avg_fmr", "year"]].copy()
    
    # Sort by state, county, and year
    df_clean = df_clean.sort_values(by=["state_alpha", "countyname", "year"]).reset_index(drop=True)
    
    return df_clean


def main():
    """Main function to clean and save HUD FMR data."""
    print("Starting HUD FMR data cleaning...")
    
    # Load and process data
    df_clean = load_and_process_fmr_data()
    
    # Save to CSV
    print(f"Saving cleaned data to {OUTPUT_PATH}...")
    df_clean.to_csv(OUTPUT_PATH, index=False)
    
    print(f"Success! Cleaned data saved with {len(df_clean)} rows")
    print("\nFirst few rows:")
    print(df_clean.head(10))
    print(f"\nData shape: {df_clean.shape}")
    print(f"Years included: {sorted(df_clean['year'].unique())}")


if __name__ == "__main__":
    main()
