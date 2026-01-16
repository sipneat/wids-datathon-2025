"""
Clean and normalize Community Resilience Estimates (CRE) data.

Input: Community Resilience Estimates data
Tasks:
  - Normalize county name and derive FIPS code
  - Compute vulnerability percentages:
    * % low vulnerability (0 components)
    * % high vulnerability (3+ components)
  - Keep margins of error separate (optional)
Output: data/intermediate/cre_clean.csv
"""

import pandas as pd
import os
import re

# Define input and output paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
INTERMEDIATE_DIR = os.path.join(DATA_DIR, "intermediate")
CRE_INPUT_PATH = os.path.join(DATA_DIR, "CRE2023.CRE-2026-01-14T202326.csv")
OUTPUT_PATH = os.path.join(INTERMEDIATE_DIR, "cre_clean.csv")

# Create intermediate directory if it doesn't exist
os.makedirs(INTERMEDIATE_DIR, exist_ok=True)

# Mapping of state names to state abbreviations
STATE_ABBREV = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN",
    "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
}


def parse_percentage(value):
    """Convert percentage string to float (e.g., '25.59%' -> 25.59)."""
    if isinstance(value, str):
        return float(value.strip("%"))
    return value


def extract_county_and_state(geographic_name):
    """Extract county name and state from geographic area name."""
    # Expected format: "County Name, State Name"
    parts = geographic_name.rsplit(", ", 1)
    if len(parts) == 2:
        county_name = parts[0].strip()
        state_name = parts[1].strip()
        state_abbrev = STATE_ABBREV.get(state_name, None)
        return county_name, state_abbrev, state_name
    return None, None, None


def load_and_process_cre_data():
    """Load, process, and normalize CRE data."""
    
    print("Loading CRE data...")
    df = pd.read_csv(CRE_INPUT_PATH)
    
    # Rename the geographic column for easier access
    df.rename(columns={"Geographic Area Name (NAME)": "geographic_area"}, inplace=True)
    
    # Extract county and state information
    print("Extracting and normalizing county and state information...")
    df[["county_name", "state_abbrev", "state_name"]] = df["geographic_area"].apply(
        lambda x: pd.Series(extract_county_and_state(x))
    )
    
    # Parse percentage columns
    percent_columns = [col for col in df.columns if "Percent," in col and "_PE)" in col]
    for col in percent_columns:
        df[col] = df[col].apply(parse_percentage)
    
    # Extract vulnerability percentages
    # PRED0_PE = 0 components (low vulnerability)
    # PRED3_PE = 3+ components (high vulnerability)
    low_vuln_col = "Percent, 0 components of social vulnerability (PRED0_PE)"
    high_vuln_col = "Percent, 3+ components of social vulnerability (PRED3_PE)"
    low_vuln_moe_col = "Percent margin of error, 0 components of social vulnerability (PRED0_PM)"
    high_vuln_moe_col = "Percent margin of error, 3+ components of social vulnerability (PRED3_PM)"
    
    # Rename for clarity
    df["pct_low_vulnerability"] = df[low_vuln_col]
    df["pct_high_vulnerability"] = df[high_vuln_col]
    df["pct_low_vulnerability_moe"] = df[low_vuln_moe_col].apply(parse_percentage)
    df["pct_high_vulnerability_moe"] = df[high_vuln_moe_col].apply(parse_percentage)
    
    # Select final columns
    df_clean = df[[
        "county_name",
        "state_abbrev",
        "state_name",
        "pct_low_vulnerability",
        "pct_high_vulnerability",
        "pct_low_vulnerability_moe",
        "pct_high_vulnerability_moe"
    ]].copy()
    
    # Sort by state and county
    df_clean = df_clean.sort_values(by=["state_abbrev", "county_name"]).reset_index(drop=True)
    
    return df_clean


def main():
    """Main function to clean and save CRE data."""
    print("Starting CRE data cleaning...")
    
    # Load and process data
    df_clean = load_and_process_cre_data()
    
    # Save to CSV
    print(f"Saving cleaned data to {OUTPUT_PATH}...")
    df_clean.to_csv(OUTPUT_PATH, index=False)
    
    print(f"Success! Cleaned data saved with {len(df_clean)} rows")
    print("\nFirst few rows:")
    print(df_clean.head(10))
    print(f"\nData shape: {df_clean.shape}")
    print(f"\nVulnerability statistics:")
    print(f"  Low vulnerability (0 components): {df_clean['pct_low_vulnerability'].min():.2f}% - {df_clean['pct_low_vulnerability'].max():.2f}%")
    print(f"  High vulnerability (3+ components): {df_clean['pct_high_vulnerability'].min():.2f}% - {df_clean['pct_high_vulnerability'].max():.2f}%")


if __name__ == "__main__":
    main()
