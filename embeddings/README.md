# Wildfire Recovery Embeddings & RAG Chatbot

Converts wildfire telemetry CSVs into recovery narratives, embeds them with Jina, stores in Pinecone, and powers a Groq RAG chatbot.

## Setup

```bash
cd wids-datathon-2025
pip install -r embeddings/requirements.txt

# Create .env from template (never commit .env)
cp .env.example .env
# Edit .env and add your PINECONE_API_KEY and GROQ_API_KEY
```

Or set env vars directly:
```bash
export PINECONE_API_KEY="your_pinecone_key"
export GROQ_API_KEY="gsk_xxxx"   # for RAG chatbot
```

## Run

**Full pipeline** (load data → embed → upload → search):
```bash
python embeddings/data.py
```

**Chatbot only** (uses existing Pinecone index):
```bash
python embeddings/data.py --chat
```

Or run the chatbot directly:
```bash
cd embeddings && python chatbot.py
```

**Force re-upload** to Pinecone:
```bash
python embeddings/data.py --rebuild
```

## RAG Flow

1. User asks a question (e.g., "What should I expect for housing after evacuation?")
2. Query is embedded with Jina; Pinecone returns top-K similar narratives
3. Context + question sent to Groq (llama-3.3-70b-versatile)
4. LLM answers using only the retrieved context
