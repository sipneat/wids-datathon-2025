#!/usr/bin/env python3

# Data manipulation, feature engineering, and Pinecone upload for wildfire narratives.
import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
import pandas as pd
import requests

# Load .env before reading config
import config  # noqa: F401

_demo_rows_raw = str(config.get("DEMO_MAX_ROWS_PER_FILE", "500")).strip().lower()
DEMO_MAX_ROWS_PER_FILE = None if _demo_rows_raw in {"", "none", "null", "-1"} else int(_demo_rows_raw)
PINECONE_API_KEY = config.PINECONE_API_KEY
INDEX_NAME = config.INDEX_NAME
JINA_MODEL = config.JINA_MODEL
DIMENSION = config.DIMENSION
TOP_K = config.TOP_K
JINA_API_KEY = config.get("JINA_API_KEY", "")
JINA_EMBEDDING_DIMENSIONS = DIMENSION
JINA_API_URL = "https://api.jina.ai/v1/embeddings"
JINA_BATCH_SIZE = int(config.get("JINA_BATCH_SIZE", "8"))


# STAGE 1: Load all CSV files from ./data into one big dataframe
def load_all_csvs(data_dir: str = None) -> pd.DataFrame:
    if data_dir is None:
        # Default: data folder is at project root, relative to this script location
        script_dir = Path(__file__).resolve().parent
        data_dir = str(script_dir.parent / "data")
    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    # Skip these columns because they contain huge geometry strings
    SKIP_COLS = {"geom", "geom_label"}
    frames = []

    for csv_file in sorted(data_path.glob("*.csv")):
        try:
            peek = pd.read_csv(csv_file, nrows=0)
            usecols = [c for c in peek.columns if c not in SKIP_COLS]
            read_opts = dict(usecols=usecols if usecols else None, low_memory=False, on_bad_lines="skip")
            if DEMO_MAX_ROWS_PER_FILE is not None:
                read_opts["nrows"] = DEMO_MAX_ROWS_PER_FILE
            df = pd.read_csv(csv_file, **read_opts)
            df["_source_file"] = csv_file.name
            frames.append(df)
        except Exception as e:
            print(f"Warning: Could not load {csv_file.name}: {e}")

    if not frames:
        raise ValueError("No CSV files could be loaded.")

    # Combine all files into one dataframe, filling missing columns with NaN
    combined = pd.concat(frames, axis=0, join="outer", ignore_index=True)
    if DEMO_MAX_ROWS_PER_FILE is not None:
        print(f"(Limited to {DEMO_MAX_ROWS_PER_FILE:,} rows per file - set DEMO_MAX_ROWS_PER_FILE=None for full run)")
    return combined


# Safely convert a value to float without crashing
def safe_float(val, default=None):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def safe_text(val, default=""):
    if val is None:
        return default
    text = str(val).strip()
    if not text or text.lower() == "nan":
        return default
    return text


def normalize_state_code(val):
    text = safe_text(val)
    if not text:
        return ""
    text = text.upper()
    if re.fullmatch(r"[A-Z]{2}", text):
        return text
    return ""


def normalize_county_name(val):
    text = safe_text(val)
    if not text:
        return ""
    return " ".join(text.replace("\n", " ").split())


def normalize_zip_code(val):
    text = safe_text(val)
    return text


def classify_risk_category(incidents_5yr, severity, disruption):
    if incidents_5yr >= 3:
        return "high"
    if incidents_5yr >= 1:
        return "medium"
    if severity == "high" or disruption == "high":
        return "medium"
    return "low"


def estimate_return_timeline_months(severity, disruption):
    if severity == "high" and disruption == "high":
        return 18
    if severity in ("high", "medium") or disruption == "high":
        return 9
    return 3


def extract_incident_date(row: pd.Series):
    raw = _row_value(
        row,
        [
            "incidentBeginDate",
            "incident_begin_date",
            "incidentDate",
            "declarationDate",
            "declaration_date",
            "start_date",
            "date",
        ],
    )
    if raw is None:
        return pd.NaT
    dt = pd.to_datetime(raw, errors="coerce", utc=True)
    return dt


def is_fire_event_row(row: pd.Series) -> bool:
    incident_type = safe_text(_row_value(row, ["incidentType", "incident_type"]))
    declaration_title = safe_text(_row_value(row, ["declarationTitle", "title"]))
    source_name = safe_text(_row_value(row, ["source_incident_name", "name"]))
    haystack = " ".join([incident_type, declaration_title, source_name]).lower()
    return "fire" in haystack or "wildfire" in haystack


def add_historical_risk_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["_incident_date"] = df.apply(extract_incident_date, axis=1)
    df["_is_fire_event"] = df.apply(is_fire_event_row, axis=1)
    df["_incidents_5yr"] = 0
    df["_avg_recurrence_years"] = 5.0

    max_date = df["_incident_date"].dropna().max()
    if pd.notna(max_date):
        cutoff = max_date - pd.Timedelta(days=365 * 5)
    else:
        cutoff = None

    grouped = df.groupby(["_state", "_county"], dropna=False)
    for (state, county), group in grouped:
        if not safe_text(state) or not safe_text(county):
            continue

        events = group[group["_is_fire_event"]]
        if cutoff is not None:
            recent = events[events["_incident_date"] >= cutoff]
        else:
            recent = events
        incidents_5yr = int(len(recent))

        recurrence = 5.0
        dated = events["_incident_date"].dropna().sort_values().unique()
        if len(dated) >= 2:
            diffs = []
            for i in range(1, len(dated)):
                delta_days = (pd.Timestamp(dated[i]) - pd.Timestamp(dated[i - 1])).days
                if delta_days > 0:
                    diffs.append(delta_days / 365.25)
            if diffs:
                recurrence = round(sum(diffs) / len(diffs), 2)
        elif incidents_5yr >= 3:
            recurrence = 1.5
        elif incidents_5yr >= 2:
            recurrence = 2.5
        elif incidents_5yr == 1:
            recurrence = 4.0

        mask = (df["_state"] == state) & (df["_county"] == county)
        df.loc[mask, "_incidents_5yr"] = incidents_5yr
        df.loc[mask, "_avg_recurrence_years"] = recurrence

    df["_risk_category"] = df.apply(
        lambda r: classify_risk_category(
            int(r.get("_incidents_5yr", 0)),
            safe_text(r.get("severity"), "low"),
            safe_text(r.get("disruption"), "low"),
        ),
        axis=1,
    )
    df["_return_timeline_months"] = df.apply(
        lambda r: estimate_return_timeline_months(
            safe_text(r.get("severity"), "low"),
            safe_text(r.get("disruption"), "low"),
        ),
        axis=1,
    )
    return df


def _row_value(row: pd.Series, candidate_cols):
    normalized = {str(col).strip().lower().replace("\n", " "): col for col in row.index}
    for candidate in candidate_cols:
        key = candidate.lower().strip()
        if key in normalized:
            return row.get(normalized[key])
    return None


def extract_location_fields(row: pd.Series) -> dict:
    state = normalize_state_code(
        _row_value(row, ["state_alpha", "stusps", "state", "statecode", "state code"])
    )
    county = normalize_county_name(
        _row_value(
            row,
            [
                "county",
                "countyname",
                "county_town_name",
                "designatedArea",
            ],
        )
    )

    # FEMA designatedArea often looks like "Washington (County)".
    if county and "(" in county:
        county = county.split("(", 1)[0].strip()

    zip_code = normalize_zip_code(_row_value(row, ["zip", "zip code", "postal", "postal code"]))
    return {
        "state": state,
        "county": county,
        "zip_code": zip_code,
    }


# Pull out acreage, containment %, and evacuation info from a single row
def extract_wildfire_fields(row: pd.Series) -> dict:
    acreage = None
    containment = None
    has_evacuation = False

    # Some rows have a JSON "data" column with nested wildfire details
    if "data" in row.index and pd.notna(row.get("data")):
        try:
            data = row["data"]
            if isinstance(data, str):
                data = json.loads(data)
            if isinstance(data, dict):
                acreage = safe_float(data.get("acreage"))
                containment = safe_float(data.get("containment"))
                evac_orders = data.get("evacuation_orders")
                evac_warnings = data.get("evacuation_warnings")
                evac_notes = data.get("evacuation_notes")
                has_evacuation = bool(evac_orders or evac_warnings or (evac_notes and str(evac_notes).strip()))
        except (json.JSONDecodeError, TypeError):
            pass

    # Fall back to source_acres column if no acreage found yet
    if acreage is None and "source_acres" in row.index and pd.notna(row.get("source_acres")):
        acreage = safe_float(row["source_acres"])

    # If it's a FEMA fire declaration with no acreage, use 5000 as a placeholder
    if acreage is None and "incidentType" in row.index:
        if str(row.get("incidentType", "")).strip().upper() == "FIRE":
            acreage = 5000

    return {"acreage": acreage, "containment": containment, "has_evacuation": has_evacuation}


# Classify fire size: low < 100 acres, medium < 10k, high = 10k+
def classify_severity(acreage) -> str:
    if acreage is None:
        return "low"
    if acreage < 100:
        return "low"
    if acreage < 10000:
        return "medium"
    return "high"


# Estimate how disruptive the fire was based on containment % and evacuations
def estimate_disruption(containment, has_evacuation: bool) -> str:
    if has_evacuation:
        return "high"
    if containment is None:
        return "medium"
    if containment >= 90:
        return "low"
    if containment >= 50:
        return "medium"
    return "high"


# STAGE 2: Add severity and disruption columns to the dataframe
def compute_recovery_features(df: pd.DataFrame) -> pd.DataFrame:
    extracted = df.apply(extract_wildfire_fields, axis=1)
    locations = df.apply(extract_location_fields, axis=1)
    df = df.copy()
    df["_acreage"] = [e["acreage"] for e in extracted]
    df["_containment"] = [e["containment"] for e in extracted]
    df["_has_evacuation"] = [e["has_evacuation"] for e in extracted]
    df["_state"] = [l["state"] for l in locations]
    df["_county"] = [l["county"] for l in locations]
    df["_zip_code"] = [l["zip_code"] for l in locations]
    df["severity"] = df["_acreage"].apply(classify_severity)
    df["disruption"] = df.apply(lambda r: estimate_disruption(r["_containment"], r["_has_evacuation"]), axis=1)
    df = add_historical_risk_features(df)
    return df


# STAGE 3: Build a plain-English narrative for each row using templates (no LLM)
def generate_recovery_narrative(row: pd.Series) -> str:
    severity = row.get("severity", "low")
    disruption = row.get("disruption", "medium")
    acreage = row.get("_acreage")
    name = row.get("name", row.get("declarationTitle", row.get("source_incident_name", "Wildfire event")))
    acreage_val = acreage if acreage is not None and not (isinstance(acreage, float) and pd.isna(acreage)) else 0

    # Describe fire size
    if severity == "high":
        acres_str = f"{acreage_val:,.0f}+ acres burned" if acreage_val else "large-scale fire"
        sev_summary = f"A high-severity wildfire event ({acres_str}). Significant resource impact and infrastructure damage likely."
    elif severity == "medium":
        acres_str = f"{acreage_val:,.0f} acres" if acreage_val else "moderate spread"
        sev_summary = f"A medium-severity wildfire ({acres_str}). Moderate property and ecosystem impact expected."
    else:
        acres_str = f"{acreage_val:.0f} acres or less" if acreage_val is not None else "limited scope"
        sev_summary = f"A low-severity incident ({acres_str}). Limited spread; localized impact."

    # Describe housing/displacement impact
    if disruption == "high":
        housing = "Likely displacement and elevated housing pressure. Temporary shelters and alternate housing may be needed."
    elif disruption == "medium":
        housing = "Some displacement possible. Housing availability may be strained in affected areas."
    else:
        housing = "Minimal displacement expected. Housing market impact likely contained."

    # Estimate how long recovery will take
    if severity == "high" and disruption == "high":
        timeline = "Recovery timeline: 12-24+ months for full restoration."
    elif severity in ("high", "medium") or disruption == "high":
        timeline = "Recovery timeline: 6-12 months typical for stabilization."
    else:
        timeline = "Recovery timeline: 1-3 months for return to normalcy."

    # Describe insurance situation
    if severity == "high":
        insurance = "Expect significant insurance claim volume and potential processing delays. Documentation and FEMA/state assistance programs may help."
    elif disruption == "high":
        insurance = "Insurance claims may face delays. Contact insurer early; keep records of evacuation and losses."
    else:
        insurance = "Standard claim processes apply. Document any damage for claims."

    state = safe_text(row.get("_state"))
    county = safe_text(row.get("_county"))
    zip_code = safe_text(row.get("_zip_code"))
    location_parts = []
    if county:
        location_parts.append(f"County: {county}")
    if state:
        location_parts.append(f"State: {state}")
    if zip_code:
        location_parts.append(f"ZIP: {zip_code}")
    location_summary = " ".join(location_parts) if location_parts else "Location: unknown"
    incidents_5yr = int(safe_float(row.get("_incidents_5yr"), default=0) or 0)
    recurrence_years = safe_float(row.get("_avg_recurrence_years"), default=5.0)
    risk_category = safe_text(row.get("_risk_category"), "unknown")
    return_timeline_months = int(safe_float(row.get("_return_timeline_months"), default=6) or 6)
    history_summary = (
        f"Past 5 years incidents: {incidents_5yr}. "
        f"Average recurrence: {recurrence_years:.1f} years. "
        f"Risk category: {risk_category}. "
        f"Estimated return timeline: {return_timeline_months} months."
    )

    event_label = name if pd.notna(name) and str(name).strip() else "Event"
    return f"[{event_label}] " + " ".join([location_summary, history_summary, sev_summary, housing, timeline, insurance])


# STAGE 4 helper: Load Jina embedding model from HuggingFace (runs locally, no API key needed)
def load_embedding_model():
    # Kept for compatibility with existing call sites. Jina API is preferred.
    return None


def _jina_model_candidates():
    candidates = [JINA_MODEL]
    if "/" in JINA_MODEL:
        candidates.append(JINA_MODEL.split("/", 1)[1])
    else:
        candidates.append(f"jinaai/{JINA_MODEL}")

    seen = set()
    return [m for m in candidates if not (m in seen or seen.add(m))]


def _embed_with_jina_api(texts, task):
    if not JINA_API_KEY:
        raise ValueError("Missing JINA_API_KEY")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {JINA_API_KEY}",
    }

    embeddings = []
    for start in range(0, len(texts), JINA_BATCH_SIZE):
        batch = texts[start:start + JINA_BATCH_SIZE]
        last_error = None

        for model_name in _jina_model_candidates():
            payloads = [
                {
                    "model": model_name,
                    "input": batch,
                    "dimensions": JINA_EMBEDDING_DIMENSIONS,
                    "task": task,
                },
                {
                    "model": model_name,
                    "input": batch,
                    "task": task,
                },
                {
                    "model": model_name,
                    "input": batch,
                },
            ]

            for payload in payloads:
                res = requests.post(JINA_API_URL, json=payload, headers=headers, timeout=60)
                if res.ok:
                    body = res.json()
                    ordered = sorted(body.get("data", []), key=lambda x: int(x.get("index", 0)))
                    batch_embeddings = [item.get("embedding", []) for item in ordered]
                    embeddings.extend(batch_embeddings)
                    print(f"  Embedded {min(start + len(batch), len(texts))}/{len(texts)}")
                    last_error = None
                    break

                last_error = res
                if res.status_code == 429:
                    time.sleep(4)
                    continue
                if res.status_code != 422:
                    break

            if last_error is None:
                break

        if last_error is not None:
            raise ValueError(f"Jina embedding failed ({last_error.status_code}): {last_error.text}")

    return embeddings


# STAGE 4 helper: Connect to Pinecone and return the index (creates it if it doesn't exist)
def get_pinecone_index():
    if not PINECONE_API_KEY:
        print("ERROR: PINECONE_API_KEY not set.")
        print("Add to .env or run: export PINECONE_API_KEY='your_key_here'")
        sys.exit(1)

    from pinecone import Pinecone, ServerlessSpec
    pc = Pinecone(api_key=PINECONE_API_KEY)

    existing = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing:
        print(f"Creating Pinecone index '{INDEX_NAME}'...")
        pc.create_index(name=INDEX_NAME, dimension=DIMENSION, metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1"))
        print("Index created.\n")
    else:
        print(f"Using existing Pinecone index '{INDEX_NAME}'.\n")

    return pc.Index(INDEX_NAME)


# STAGE 4 helper: Embed unique narratives and upload them to Pinecone
def upload_to_pinecone(df: pd.DataFrame, model, index):
    # Only embed unique narratives — many rows have identical text
    unique_df = df.drop_duplicates(subset=["recovery_narrative", "_state", "_county", "_zip_code"]).reset_index(drop=True)
    print(f"Unique narratives to embed: {len(unique_df)}")

    texts = unique_df["recovery_narrative"].tolist()
    print("Embedding narratives with Jina API...")
    embeddings = _embed_with_jina_api(texts, task="retrieval.passage")

    # Build list of vectors with metadata to store alongside each embedding
    vectors = []
    for i, (text, embedding, (_, row)) in enumerate(zip(texts, embeddings, unique_df.iterrows())):
        vectors.append({
            "id": f"doc_{i}",
            "values": embedding,
            "metadata": {
                "text": text,
                "severity": str(row.get("severity", "")),
                "disruption": str(row.get("disruption", "")),
                "acreage": str(row.get("_acreage", "")),
                "state": str(row.get("_state", "")),
                "county": str(row.get("_county", "")),
                "zip_code": str(row.get("_zip_code", "")),
                "incidents_5yr": int(safe_float(row.get("_incidents_5yr"), default=0) or 0),
                "avg_recurrence_years": float(safe_float(row.get("_avg_recurrence_years"), default=5.0) or 5.0),
                "risk_category": str(row.get("_risk_category", "")),
                "return_timeline_months": int(safe_float(row.get("_return_timeline_months"), default=6) or 6),
                "source_file": str(row.get("_source_file", "")),
            }
        })

    # Upload in batches of 100 (Pinecone's recommended batch size)
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"  Uploaded {min(i + batch_size, len(vectors))}/{len(vectors)} vectors")

    print(f"\nUploaded {len(vectors)} vectors to Pinecone.\n")


# STAGE 5 helper: Embed a query and find the most similar narratives in Pinecone
def search(model, index, query: str):
    query_vec = embed_query_text(query, model=model)
    results = index.query(vector=query_vec, top_k=TOP_K, include_metadata=True)

    print(f"\n{'─' * 60}")
    for i, match in enumerate(results["matches"]):
        score = round(match["score"], 3)
        meta = match["metadata"]
        print(f"\n[{i+1}] Score: {score}  |  Severity: {meta.get('severity')}  |  Disruption: {meta.get('disruption')}")
        print(f"     {meta.get('text', '')[:300]}...")
    print(f"{'─' * 60}\n")

    # Return the matched texts so they can be passed to Groq later
    return [m["metadata"].get("text", "") for m in results["matches"]]


def embed_query_text(query, model=None):
    """Embed a user query using Jina API when available, otherwise fallback to local model."""
    if JINA_API_KEY:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {JINA_API_KEY}",
        }
        model_candidates = [JINA_MODEL]
        if "/" in JINA_MODEL:
            model_candidates.append(JINA_MODEL.split("/", 1)[1])
        else:
            model_candidates.append(f"jinaai/{JINA_MODEL}")

        seen = set()
        model_candidates = [m for m in model_candidates if not (m in seen or seen.add(m))]

        last_error = None
        for model_name in model_candidates:
            payloads = [
                {
                    "model": model_name,
                    "input": [query],
                    "dimensions": JINA_EMBEDDING_DIMENSIONS,
                    "task": "retrieval.query",
                },
                {
                    "model": model_name,
                    "input": [query],
                    "task": "retrieval.query",
                },
                {
                    "model": model_name,
                    "input": [query],
                },
            ]

            for payload in payloads:
                res = requests.post(JINA_API_URL, json=payload, headers=headers, timeout=30)
                if res.ok:
                    body = res.json()
                    return body["data"][0]["embedding"]
                last_error = res
                if res.status_code != 422:
                    break

        if last_error is not None:
            raise ValueError(f"Jina query embedding failed ({last_error.status_code}): {last_error.text}")
        raise ValueError("Jina query embedding failed: no response")

    if model is None:
        raise ValueError("Missing JINA_API_KEY for query embedding")
    return model.encode([query], task="retrieval.query")[0].tolist()


# STAGE 5: Interactive search loop — type a query, get matching narratives
def interactive_loop(model, index):
    print("=" * 60)
    print("Wildfire Narrative Search")
    print("Type a query to search. Type 'quit' to exit, 'help' for examples.")
    print("=" * 60)

    while True:
        try:
            query = input("\n🔍 Query: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not query:
            continue
        if query.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break
        if query.lower() == "help":
            print("\nExample queries:")
            print("  - wildfires with long recovery timelines")
            print("  - fires needing emergency housing and shelter")
            print("  - small contained fires with minimal damage")
            print("  - FEMA assistance and insurance claims")
            print("  - high disruption with evacuation orders")
            continue

        # If GROQ_API_KEY is set, answer using retrieved context via chatbot module
        if config.GROQ_API_KEY:
            from chatbot import rag_response, get_groq_client
            groq_client = get_groq_client()
            print("\n💬 RAG Answer: ", end="", flush=True)
            print(rag_response(query, model, index, groq_client, silent=False))
        else:
            search(model, index, query)
            print("(Set GROQ_API_KEY in .env for RAG answers. Run with --chat for full chatbot.)")


def main():
    parser = argparse.ArgumentParser(description="Wildfire recovery: load data, embed, upload to Pinecone, search or chat.")
    parser.add_argument("--rebuild", action="store_true", help="Force re-embed and re-upload to Pinecone")
    parser.add_argument("--chat", action="store_true", help="Run Groq RAG chatbot (skip data load; use existing Pinecone index)")
    args = parser.parse_args()

    # --chat: run chatbot only (no data pipeline)
    if args.chat:
        from chatbot import main as chatbot_main
        chatbot_main()
        return

    print("=" * 60)
    print("STAGE 1: Loading CSV files from ./data")
    print("=" * 60)
    df = load_all_csvs("./data")
    print(f"Total records loaded: {len(df):,}\n")

    print("=" * 60)
    print("STAGE 2: Computing recovery features (severity, disruption)")
    print("=" * 60)
    df = compute_recovery_features(df)
    print(f"Severity distribution: {df['severity'].value_counts().to_dict()}")
    print(f"Disruption distribution: {df['disruption'].value_counts().to_dict()}\n")

    print("=" * 60)
    print("STAGE 3: Generating recovery narratives")
    print("=" * 60)
    df["recovery_narrative"] = df.apply(generate_recovery_narrative, axis=1)
    print(f"Generated {len(df):,} narratives.\n")

    print("=" * 60)
    print("STAGE 4: Embedding + uploading to Pinecone")
    print("=" * 60)
    index = get_pinecone_index()
    stats = index.describe_index_stats()
    vector_count = stats["total_vector_count"]

    # Skip re-embedding if vectors already exist in Pinecone (saves ~5 hours)
    if vector_count > 0 and not args.rebuild:
        print(f"Pinecone already has {vector_count} vectors — skipping embed & upload.")
        print("Run with --rebuild to force re-upload.\n")
        model = None
    else:
        model = None
        upload_to_pinecone(df, model, index)

    print("=" * 60)
    print("STAGE 5: Interactive search")
    print("=" * 60)
    interactive_loop(model, index)


if __name__ == "__main__":
    main()