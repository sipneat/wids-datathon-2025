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
cp .env.example .env # Add your API keys to .env
npm run dev
```

App runs on http://localhost:5173

### Backend

```bash
cd backend
cp .env.example .env
go mod tidy
go run main.go
```

API runs on http://localhost:3000

### Firebase setup

```bash
firebase login
firebase init
firebase emulators:start
```
