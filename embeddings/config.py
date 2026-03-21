#!/usr/bin/env python3
"""
Centralized config for embeddings/RAG. Loads .env from project root.
Use this module instead of reading os.environ directly.
"""

import os
from pathlib import Path

# Project root = parent of embeddings/
_EMBED_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _EMBED_DIR.parent

# Load .env from project root (supports local dev and deployment)
_env_path = _PROJECT_ROOT / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)


def get(key: str, default: str = "") -> str:
    """Get env var. Returns default if not set."""
    return os.environ.get(key, default)


def get_required(key: str) -> str:
    """Get required env var. Raises if not set."""
    val = os.environ.get(key)
    if not val or not str(val).strip():
        raise ValueError(
            f"Missing required env var: {key}. "
            f"Add to .env or set in deployment environment."
        )
    return val


# Embeddings / Pinecone
PINECONE_API_KEY = get("PINECONE_API_KEY")
INDEX_NAME = "wildfire-narratives"
JINA_MODEL = "jina-embeddings-v3"
DIMENSION = 1024
TOP_K = 5

# Groq RAG
GROQ_API_KEY = get("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"
