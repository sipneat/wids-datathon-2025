# WIDS Datathon 2025 - SCU

## Project Overview

Post-diaster recovery tool for supporting individuals, families, and workers to connect them with the right resources and information necessary. The goal is to help people rebuild their lives via a personalized screening, AI chatbot interface, context of both the situation and individual, and crowdsourced community resources.

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Go](https://go.dev/dl/)
- Firebase CLI
  - `npm install -g firebase-tools`

### Clone the repo

```bash
git clone https://github.com/sipneat/wids-datathon-2025.git
cd wids-datathon-2025
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs on http://localhost:5173

### Backend

```bash
cd backend
cp .env.example .env # Add your preferred port and path to Firebase service key to .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server.py
```

API runs on http://localhost:3000 by default, unless port changes
