#!/usr/bin/env python3

# Search the Pinecone index for wildfire narratives.
import os, sys
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Your Pinecone API key (set via: export PINECONE_API_KEY="your_key")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
INDEX_NAME = "wildfire-narratives"  # must match the index you created in Pinecone
JINA_MODEL = "jinaai/jina-embeddings-v3"  # same model used when uploading
TOP_K = 3  # number of results to return per query

if not PINECONE_API_KEY:
    print("ERROR: run export PINECONE_API_KEY='your_key'")
    sys.exit(1)

# Load the Jina model locally (uses cached version after first download)
print("Loading model...")
model = SentenceTransformer(JINA_MODEL, trust_remote_code=True)

# Connect to your Pinecone index
index = Pinecone(api_key=PINECONE_API_KEY).Index(INDEX_NAME)
print(f"Connected. {index.describe_index_stats()['total_vector_count']} vectors in index.\n")

# Interactive search loop
while True:
    try:
        query = input("🔍 Query: ").strip()
    except (EOFError, KeyboardInterrupt):
        break

    if not query or query.lower() in ("quit", "exit", "q"):
        break

    # Embed the query (task="retrieval.query" for search queries, not documents)
    vec = model.encode([query], task="retrieval.query")[0].tolist()

    # Search Pinecone for the most similar narratives
    results = index.query(vector=vec, top_k=TOP_K, include_metadata=True)

    for i, match in enumerate(results["matches"]):
        meta = match["metadata"]
        print(f"\n[{i+1}] Score: {round(match['score'], 3)} | Severity: {meta.get('severity')} | Disruption: {meta.get('disruption')}")
        print(f"     {meta.get('text', '')[:300]}...")
    print()