#!/usr/bin/env python3
"""
Tests that Pinecone has vectors and that search is working correctly.
"""

import os
import sys

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
INDEX_NAME = "wildfire-narratives"
JINA_MODEL = "jinaai/jina-embeddings-v3"


def get_index():
    if not PINECONE_API_KEY:
        print("ERROR: PINECONE_API_KEY not set. Run: export PINECONE_API_KEY='your_key'")
        sys.exit(1)
    from pinecone import Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    return pc.Index(INDEX_NAME)


def load_model():
    print("Loading Jina model...")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(JINA_MODEL, trust_remote_code=True)
    print("Model loaded.\n")
    return model


def run_tests(model, index):
    passed = 0
    failed = 0

    # ── Test 1: Check vector count ────────────────────────────────────────────
    print("TEST 1: Does Pinecone have vectors?")
    stats = index.describe_index_stats()
    count = stats["total_vector_count"]
    if count > 0:
        print(f"  PASS — {count} vectors found in Pinecone\n")
        passed += 1
    else:
        print("  FAIL — No vectors found. Run wildfire_recovery_demo.py --rebuild\n")
        failed += 1
        return  # no point running other tests

    # ── Test 2: Basic search returns results ──────────────────────────────────
    print("TEST 2: Does a basic search return results?")
    query_vec = model.encode(["wildfire recovery"], task="retrieval.query")[0].tolist()
    results = index.query(vector=query_vec, top_k=3, include_metadata=True)
    if len(results["matches"]) > 0:
        print(f"  PASS — Got {len(results['matches'])} results\n")
        passed += 1
    else:
        print("  FAIL — No results returned\n")
        failed += 1

    # ── Test 3: High severity query returns high severity docs ────────────────
    print("TEST 3: Does 'massive wildfire thousands of acres' return high-severity docs?")
    query_vec = model.encode(["massive wildfire thousands of acres burned"], task="retrieval.query")[0].tolist()
    results = index.query(vector=query_vec, top_k=5, include_metadata=True)
    severities = [m["metadata"].get("severity", "") for m in results["matches"]]
    high_count = severities.count("high")
    print(f"  Severities returned: {severities}")
    if high_count >= 3:
        print(f"  PASS — {high_count}/5 results are high severity\n")
        passed += 1
    else:
        print(f"  WARN — Only {high_count}/5 results are high severity (may be OK for templated data)\n")
        failed += 1

    # ── Test 4: Low severity query returns low severity docs ──────────────────
    print("TEST 4: Does 'small contained fire minimal damage' return low-severity docs?")
    query_vec = model.encode(["small contained fire minimal damage quick recovery"], task="retrieval.query")[0].tolist()
    results = index.query(vector=query_vec, top_k=5, include_metadata=True)
    severities = [m["metadata"].get("severity", "") for m in results["matches"]]
    low_count = severities.count("low")
    print(f"  Severities returned: {severities}")
    if low_count >= 3:
        print(f"  PASS — {low_count}/5 results are low severity\n")
        passed += 1
    else:
        print(f"  WARN — Only {low_count}/5 results are low severity\n")
        failed += 1

    # ── Test 5: Show sample results so you can eyeball them ──────────────────
    print("TEST 5: Eyeball test — searching 'evacuation and housing displacement'")
    query_vec = model.encode(["evacuation and housing displacement"], task="retrieval.query")[0].tolist()
    results = index.query(vector=query_vec, top_k=3, include_metadata=True)
    for i, match in enumerate(results["matches"]):
        meta = match["metadata"]
        print(f"  [{i+1}] Score: {round(match['score'], 3)} | Severity: {meta.get('severity')} | Disruption: {meta.get('disruption')}")
        print(f"       {meta.get('text', '')[:200]}...")
    print()
    passed += 1  # always passes, just for eyeballing

    # ── Summary ───────────────────────────────────────────────────────────────
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    if failed == 0:
        print("All tests passed — Pinecone is working correctly!")
    else:
        print("Some tests failed — check output above for details.")
    print("=" * 60)


def main():
    print("=" * 60)
    print("Pinecone + Jina Integration Tests")
    print("=" * 60 + "\n")

    index = get_index()
    model = load_model()
    run_tests(model, index)


if __name__ == "__main__":
    main()