#!/usr/bin/env python3

# Data manipulation, feature engineering, and Pinecone upload for wildfire narratives.
import argparse
import json
import os
import sys
from pathlib import Path
import pandas as pd

DEMO_MAX_ROWS_PER_FILE = 2000

# Your Pinecone API key (set via: export PINECONE_API_KEY="your_key")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
INDEX_NAME = "wildfire-narratives"   # name of your Pinecone index
JINA_MODEL = "jinaai/jina-embeddings-v3"  # embedding model from HuggingFace
DIMENSION = 1024   # vector size that Jina outputs (must match Pinecone index setting)
TOP_K = 3          # number of search results to return


# STAGE 1: Load all CSV files from ./data into one big dataframe
def load_all_csvs(data_dir: str = "./data") -> pd.DataFrame:
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
    df = df.copy()
    df["_acreage"] = [e["acreage"] for e in extracted]
    df["_containment"] = [e["containment"] for e in extracted]
    df["_has_evacuation"] = [e["has_evacuation"] for e in extracted]
    df["severity"] = df["_acreage"].apply(classify_severity)
    df["disruption"] = df.apply(lambda r: estimate_disruption(r["_containment"], r["_has_evacuation"]), axis=1)
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

    event_label = name if pd.notna(name) and str(name).strip() else "Event"
    return f"[{event_label}] " + " ".join([sev_summary, housing, timeline, insurance])


# STAGE 4 helper: Load Jina embedding model from HuggingFace (runs locally, no API key needed)
def load_embedding_model():
    print("Loading Jina embedding model (downloads ~2GB on first run)...")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(JINA_MODEL, trust_remote_code=True)
    print("Model loaded.\n")
    return model


# STAGE 4 helper: Connect to Pinecone and return the index (creates it if it doesn't exist)
def get_pinecone_index():
    if not PINECONE_API_KEY:
        print("ERROR: PINECONE_API_KEY not set.")
        print("Run: export PINECONE_API_KEY='your_key_here'")
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
    unique_df = df.drop_duplicates(subset=["recovery_narrative"]).reset_index(drop=True)
    print(f"Unique narratives to embed: {len(unique_df)}")

    texts = unique_df["recovery_narrative"].tolist()
    print("Embedding narratives...")
    # task="retrieval.passage" tells Jina these are documents (not queries)
    embeddings = model.encode(texts, task="retrieval.passage", show_progress_bar=True).tolist()

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
    # task="retrieval.query" tells Jina this is a search query (not a document)
    query_vec = model.encode([query], task="retrieval.query")[0].tolist()
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

        docs = search(model, index, query)

        # Groq RAG — uncomment this block when you have a GROQ_API_KEY
        # It takes the search results above and uses an LLM to answer your question
        # from groq import Groq
        # groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
        # context = "\n\n".join(docs)
        # response = groq_client.chat.completions.create(
        #     model="llama3-8b-8192",
        #     messages=[
        #         {"role": "system", "content": "You are a wildfire recovery assistant. Use only the context below to answer."},
        #         {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
        #     ]
        # )
        # print("\n💬 RAG Answer:", response.choices[0].message.content)


def main():
    # --rebuild flag forces re-embedding even if Pinecone already has vectors
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild", action="store_true", help="Force re-embed and re-upload to Pinecone")
    args = parser.parse_args()

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
        model = load_embedding_model()
    else:
        model = load_embedding_model()
        upload_to_pinecone(df, model, index)

    print("=" * 60)
    print("STAGE 5: Interactive search")
    print("=" * 60)
    interactive_loop(model, index)


if __name__ == "__main__":
    main()