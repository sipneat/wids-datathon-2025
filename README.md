# WIDS Datathon 2025 - SCU

## Project Overview

Post-diaster recovery tool for supporting individuals, families, and workers to connect them with the right resources and information necessary. The goal is to help people rebuild their lives via a personalized screening, AI chatbot interface, context of both the situation and individual, and crowdsourced community resources.

Live Link: https://d3piep4qmp7tbr.cloudfront.net/

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Python](https://www.python.org/downloads/)
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
cp .env.example .env # Update .env with your backend API URL and Firebase config
npm run dev
```

App runs on http://localhost:5173

### Backend

```bash
cd backend
cp .env.example .env # Update .env with your API keys and Firebase credentials
python3 -m venv venv # Windows: `py -m venv venv`
source venv/bin/activate # Windows: `venv\Scripts\activate`
pip install -r requirements.txt
python server.py
```

API runs on http://localhost:3000
