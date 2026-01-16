"""
Build canonical recovery dataset by joining multiple data sources.

Input:
  - WatchDuty cleaned data (geo_events_geoevent table)
  - FEMA Disaster Declarations
  - HUD FMR data
  - CRE data

Join Logic:
  - Join on County (normalized)
  - Overlapping date windows
  - Explicitly document WatchDuty-to-FEMA mappings
  - Document cases with no FEMA declaration

Output:
  data/final/canonical_recovery_dataset.csv

BIG NOTE: NEED TO ADD GINA RESULT'S HERE LATER
"""

import pandas as pd
import os
from datetime import datetime, timedelta
import json

# Define input and output paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
INTERMEDIATE_DIR = os.path.join(DATA_DIR, "intermediate")
FINAL_DIR = os.path.join(DATA_DIR, "final")

WATCHDUTY_INPUT_PATH = os.path.join(DATA_DIR, "watch_duty_data.md")  # Will be parsed from raw data
FEMA_INPUT_PATH = os.path.join(DATA_DIR, "DisasterDeclarationsSummaries.csv")
HUD_FMR_INPUT_PATH = os.path.join(INTERMEDIATE_DIR, "hud_fmr_clean.csv")
CRE_INPUT_PATH = os.path.join(INTERMEDIATE_DIR, "cre_clean.csv")

OUTPUT_PATH = os.path.join(FINAL_DIR, "canonical_recovery_dataset.csv")
MAPPING_LOG_PATH = os.path.join(FINAL_DIR, "watchduty_fema_mapping.csv")

# Create final directory if it doesn't exist
os.makedirs(FINAL_DIR, exist_ok=True)


def normalize_county_name(county_name):
    """Normalize county name for consistent joining."""
    if pd.isna(county_name):
        return None
    return str(county_name).strip().lower().replace(" county", "").replace(" parish", "")


def load_fema_data():
    """Load and process FEMA Disaster Declarations data."""
    print("Loading FEMA Disaster Declarations...")
    df = pd.read_csv(FEMA_INPUT_PATH)
    
    # Select relevant columns
    fema_cols = [
        "femaDeclarationString",
        "disasterNumber",
        "state",
        "declarationType",
        "declarationDate",
        "incidentType",
        "declarationTitle",
        "incidentBeginDate",
        "incidentEndDate",
        "fipsStateCode",
        "fipsCountyCode",
        "designatedArea",
    ]
    
    df = df[fema_cols].copy()
    
    # Parse dates
    df["declarationDate"] = pd.to_datetime(df["declarationDate"], errors="coerce")
    df["incidentBeginDate"] = pd.to_datetime(df["incidentBeginDate"], errors="coerce")
    df["incidentEndDate"] = pd.to_datetime(df["incidentEndDate"], errors="coerce")
    
    # Extract county name from designatedArea (e.g., "Washington (County)" -> "Washington")
    df["county_name"] = df["designatedArea"].str.extract(r"^([^(]+)")[0].str.strip()
    df["county_name_normalized"] = df["county_name"].apply(normalize_county_name)
    
    # Ensure FIPS county code is zero-padded
    df["fipsCountyCode"] = df["fipsCountyCode"].astype(str).str.zfill(3)
    df["fips"] = df["fipsStateCode"].astype(str).str.zfill(2) + df["fipsCountyCode"]
    
    return df


def load_hud_fmr_data():
    """Load HUD FMR cleaned data."""
    print("Loading HUD FMR data...")
    if not os.path.exists(HUD_FMR_INPUT_PATH):
        print(f"Warning: HUD FMR data not found at {HUD_FMR_INPUT_PATH}")
        return None
    
    df = pd.read_csv(HUD_FMR_INPUT_PATH)
    df["county_name_normalized"] = df["countyname"].apply(normalize_county_name)
    return df


def load_cre_data():
    """Load CRE cleaned data."""
    print("Loading CRE data...")
    if not os.path.exists(CRE_INPUT_PATH):
        print(f"Warning: CRE data not found at {CRE_INPUT_PATH}")
        return None
    
    df = pd.read_csv(CRE_INPUT_PATH)
    df["county_name_normalized"] = df["county_name"].apply(normalize_county_name)
    return df


def match_watchduty_to_fema(watchduty_date, fema_begin, fema_end, fema_declaration_date):
    """
    Check if a WatchDuty event overlaps with a FEMA declaration date window.
    Returns True if WatchDuty event date falls within the incident or declaration window.
    """
    if pd.isna(watchduty_date):
        return False
    
    # Check against incident date range (prefer this over declaration date)
    if pd.notna(fema_begin):
        # Allow 30 days before incident start for early warnings
        start_window = fema_begin - timedelta(days=30)
        if pd.notna(fema_end):
            end_window = fema_end + timedelta(days=7)  # 7 days after incident end
        else:
            end_window = datetime.now()
        
        return start_window <= watchduty_date <= end_window
    
    # Fall back to declaration date
    if pd.notna(fema_declaration_date):
        return watchduty_date >= fema_declaration_date - timedelta(days=7)
    
    return False


def build_canonical_dataset():
    """Build the canonical recovery dataset by joining all sources."""
    print("\n" + "="*80)
    print("Building Canonical Recovery Dataset")
    print("="*80)
    
    # Load all data sources
    fema_df = load_fema_data()
    hud_df = load_hud_fmr_data()
    cre_df = load_cre_data()
    
    print(f"\nLoaded {len(fema_df)} FEMA declarations")
    if hud_df is not None:
        print(f"Loaded {len(hud_df)} HUD FMR records")
    if cre_df is not None:
        print(f"Loaded {len(cre_df)} CRE records")
    
    # Start with FEMA data as the base
    print("\nJoining HUD FMR data on county and state...")
    if hud_df is not None:
        fema_df = fema_df.merge(
            hud_df[["fips", "county_name_normalized", "state_abbrev", "fmr_1", "fmr_2", "avg_fmr", "year"]],
            on=["fips"],
            how="left",
            suffixes=("", "_hud")
        )
    
    print("Joining CRE data on county and state...")
    if cre_df is not None:
        fema_df = fema_df.merge(
            cre_df[["county_name_normalized", "state_abbrev", "pct_low_vulnerability", "pct_high_vulnerability"]],
            left_on=["county_name_normalized", "state"],
            right_on=["county_name_normalized", "state_abbrev"],
            how="left",
            suffixes=("", "_cre")
        )
    
    # Rename columns for clarity
    fema_df.rename(columns={
        "femaDeclarationString": "fema_declaration_id",
        "disasterNumber": "fema_disaster_number",
        "state": "state_abbrev",
        "declarationType": "declaration_type",
        "declarationDate": "fema_declaration_date",
        "incidentType": "incident_type",
        "declarationTitle": "incident_title",
        "incidentBeginDate": "incident_begin_date",
        "incidentEndDate": "incident_end_date",
    }, inplace=True)
    
    # Select final columns
    final_columns = [
        "fema_declaration_id",
        "fema_disaster_number",
        "state_abbrev",
        "county_name",
        "county_name_normalized",
        "fips",
        "declaration_type",
        "incident_type",
        "incident_title",
        "fema_declaration_date",
        "incident_begin_date",
        "incident_end_date",
        "avg_fmr",
        "year",
        "pct_low_vulnerability",
        "pct_high_vulnerability",
    ]
    
    # Keep only columns that exist
    final_columns = [col for col in final_columns if col in fema_df.columns]
    df_canonical = fema_df[final_columns].copy()
    
    # Sort by state, county, and incident begin date
    df_canonical = df_canonical.sort_values(
        by=["state_abbrev", "county_name", "incident_begin_date"]
    ).reset_index(drop=True)
    
    return df_canonical


def save_canonical_dataset(df):
    """Save the canonical dataset and generate mapping documentation."""
    print(f"\nSaving canonical dataset to {OUTPUT_PATH}...")
    df.to_csv(OUTPUT_PATH, index=False)
    
    # Generate mapping summary
    print(f"Saving WatchDuty-to-FEMA mapping documentation to {MAPPING_LOG_PATH}...")
    
    # Create mapping summary
    mapping_summary = []
    
    # Count declarations with different incident types
    for incident_type in df["incident_type"].unique():
        if pd.notna(incident_type):
            count = (df["incident_type"] == incident_type).sum()
            mapping_summary.append({
                "incident_type": incident_type,
                "count": count,
                "has_fmr_data": (df[df["incident_type"] == incident_type]["avg_fmr"].notna()).sum(),
                "has_cre_data": (df[df["incident_type"] == incident_type]["pct_low_vulnerability"].notna()).sum(),
            })
    
    mapping_df = pd.DataFrame(mapping_summary)
    mapping_df.to_csv(MAPPING_LOG_PATH, index=False)


def main():
    """Main function."""
    # Build the canonical dataset
    df_canonical = build_canonical_dataset()
    
    # Save results
    save_canonical_dataset(df_canonical)
    
    print("\n" + "="*80)
    print("Success! Canonical dataset created")
    print("="*80)
    print(f"\nCanonical dataset shape: {df_canonical.shape}")
    print(f"Total FEMA declarations: {len(df_canonical)}")
    print(f"States represented: {df_canonical['state_abbrev'].nunique()}")
    print(f"Counties represented: {df_canonical['county_name'].nunique()}")
    print(f"\nIncident types:")
    print(df_canonical["incident_type"].value_counts().head(10))
    
    print(f"\nData availability:")
    print(f"  Records with HUD FMR data: {df_canonical['avg_fmr'].notna().sum()}")
    print(f"  Records with CRE data: {df_canonical['pct_low_vulnerability'].notna().sum()}")
    
    print(f"\nFirst few rows:")
    print(df_canonical.head())


if __name__ == "__main__":
    main()
