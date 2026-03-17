#!/usr/bin/env python3
"""
Groq RAG Chatbot for wildfire recovery guidance.
Uses Pinecone vector search to find relevant narratives, then Groq LLM to answer.
"""

import sys
from pathlib import Path

_EMBED_DIR = Path(__file__).resolve().parent
if str(_EMBED_DIR) not in sys.path:
    sys.path.insert(0, str(_EMBED_DIR))

import config  # noqa: E402
from data import load_embedding_model, get_pinecone_index, TOP_K  # noqa: E402

GROQ_API_KEY = config.GROQ_API_KEY
GROQ_MODEL = config.GROQ_MODEL

SYSTEM_PROMPT = """You are a wildfire recovery assistant. Your role is to help people who have been affected by wildfires with practical guidance on housing, insurance, timelines, and next steps.

RULES:
- Answer ONLY using the provided context from similar past wildfire cases.
- If the context does not contain relevant information, say so clearly. Do not make up details.
- Be empathetic, concise, and actionable.
- Prioritize housing, insurance claims, FEMA assistance, and recovery timelines when relevant."""


def get_groq_client():
    """Return a Groq client. Exits if API key is missing."""
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not set.")
        print("Add to .env or run: export GROQ_API_KEY='gsk_xxxx'")
        sys.exit(1)
    from groq import Groq
    return Groq(api_key=GROQ_API_KEY)


def rag_response(query: str, model, index, groq_client, top_k: int = TOP_K, silent: bool = True) -> str:
    """
    Retrieve relevant narratives from Pinecone and generate a response using Groq.
    Returns the LLM's answer string.
    If silent=False, also prints the retrieved matches (for debugging).
    """
    query_vec = model.encode([query], task="retrieval.query")[0].tolist()
    results = index.query(vector=query_vec, top_k=top_k, include_metadata=True)
    docs = [m["metadata"].get("text", "") for m in results["matches"]]

    if not silent:
        for i, match in enumerate(results["matches"]):
            meta = match["metadata"]
            print(f"  [{i+1}] Score: {round(match['score'], 3)} | {meta.get('severity')}/{meta.get('disruption')}")

    context = "\n\n---\n\n".join(docs) if docs else "(No matching narratives found.)"

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""Context from similar wildfire recovery cases:

{context}

User question: {query}

Provide a helpful answer based only on the context above."""},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content


def chat_loop(model, index):
    """
    Interactive RAG chat loop. User types questions; bot answers using
    retrieved narratives + Groq.
    """
    groq_client = get_groq_client()

    print("=" * 60)
    print("Wildfire Recovery RAG Chatbot (Groq)")
    print("Ask about housing, insurance, timelines, evacuation, etc.")
    print("Type 'quit' to exit, 'help' for example questions.")
    print("=" * 60)

    while True:
        try:
            query = input("\n🔹 You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not query:
            continue
        if query.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break
        if query.lower() == "help":
            print("\nExample questions:")
            print("  - My family evacuated after a large wildfire. What should we expect for housing?")
            print("  - When can we expect insurance claims to process?")
            print("  - How long does recovery typically take after a high-severity fire?")
            print("  - What FEMA assistance is available?")
            continue

        print("\n🔹 Assistant: ", end="", flush=True)
        try:
            answer = rag_response(query, model, index, groq_client)
            print(answer)
        except Exception as e:
            print(f"[Error: {e}]")


def main():
    """Load model and index, then run the chat loop."""
    print("Loading embedding model...")
    model = load_embedding_model()
    index = get_pinecone_index()
    chat_loop(model, index)


if __name__ == "__main__":
    main()