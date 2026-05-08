<div align="center">

# 🤖 AI Job Assistant

### Autonomous AI-Powered Job Hunting Platform

**Find → Match → Score → Apply → Track**

[![Node.js](https://img.shields.io/badge/Node.js-25.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![n8n](https://img.shields.io/badge/n8n-Workflow-EA4B71?logo=n8n&logoColor=white)](https://n8n.io)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)](https://openai.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![CI](https://github.com/aleemrana8/Ai-job-assistant-/actions/workflows/ci.yml/badge.svg)](https://github.com/aleemrana8/Ai-job-assistant-/actions/workflows/ci.yml)
[![CD](https://github.com/aleemrana8/Ai-job-assistant-/actions/workflows/cd.yml/badge.svg)](https://github.com/aleemrana8/Ai-job-assistant-/actions/workflows/cd.yml)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br/>

> 🚀 A fully autonomous AI agent that hunts remote PM/Product/Scrum jobs from LinkedIn & Indeed, scores them against your CV with GPT-4o, auto-generates cover letters, and sends you a daily email digest — all while you sleep.

</div>

---

## 📋 Table of Contents

- [Goal](#-goal)
- [Scope](#-scope)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [AI Agent Pipeline](#-ai-agent-pipeline)
- [n8n Workflow](#-n8n-workflow)
- [Configuration](#-configuration)
- [Logs & Monitoring](#-logs--monitoring)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Goal

**Eliminate the daily grind of job searching.** This platform autonomously:

| What | How |
|------|-----|
| 🔍 **Finds** remote PM/Product/Scrum jobs daily | Scrapes LinkedIn & Indeed via APIs |
| 🧠 **Scores** each job against your CV (1–10) | GPT-4o-mini with structured JSON output |
| 📝 **Generates** tailored cover letters | AI-powered, one click per job |
| 📊 **Displays** everything in a live dashboard | React + Vite with real-time filters |
| 📧 **Emails** you a daily digest of top matches | Automated HTML email with apply links |
| ✅ **Tracks** your application pipeline | New → Applied → Interview → Offer |

---

## 🔭 Scope

### Target Roles
```
✅ Project Manager          ✅ Product Manager
✅ AI Project Manager        ✅ Program Manager  
✅ Technical Program Manager ✅ Scrum Master
✅ Agile Project Manager     ✅ Associate/Junior PM
```

### Filters Applied
```
✅ Remote / Remote-Friendly only
✅ LinkedIn & Indeed sources only
✅ Valid apply links required
✅ Posted within last 7 days
❌ No Senior/Director/VP/C-level
❌ No irrelevant roles (dev, design, sales)
❌ No hallucinated or fake listings
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Job Assistant                           │
├─────────────┬───────────────────────┬───────────────────────────┤
│             │                       │                           │
│  ┌──────────▼──────────┐  ┌────────▼────────┐  ┌──────────────▼─┐
│  │    n8n Workflow      │  │  Node/Express   │  │   React + Vite │
│  │   (Orchestrator)     │  │    Backend      │  │    Frontend    │
│  │                      │  │                 │  │                │
│  │ • Daily Cron 9AM     │  │ • REST API      │  │ • Dashboard    │
│  │ • Webhook Ingest     │  │ • SQLite DB     │  │ • Filters      │
│  │ • AI Filter+Score    │  │ • Job Ingest    │  │ • Score Colors │
│  │ • Email Digest       │  │ • Cover Letters │  │ • Status Mgmt  │
│  └──────────┬──────────┘  │ • Auto-Apply    │  │ • Expandable   │
│             │              └────────┬────────┘  │   Detail Rows  │
│             │                       │           └───────┬────────┘
│             ▼                       ▼                   ▼
│  ┌────────────────┐    ┌─────────────────┐   ┌──────────────────┐
│  │  OpenAI GPT-4o │    │   SQLite DB     │   │  Vite Dev Proxy  │
│  │  (Scoring +    │    │   (jobs.db)     │   │  :5173 → :4000   │
│  │   Cover Ltrs)  │    │                 │   │                  │
│  └────────────────┘    └─────────────────┘   └──────────────────┘
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              FastAPI Backend (Advanced)                     │  │
│  │  • CV Analysis  • Auto-Apply  • Celery Workers  • Auth     │  │
│  │  • Docker-Compose  • Alembic Migrations  • PostgreSQL      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| 🔄 **Auto-Fetch** | Daily cron job pulls fresh listings from LinkedIn & Indeed |
| 🧠 **AI Scoring** | GPT-4o-mini scores every job 1–10 against your CV |
| 📊 **Live Dashboard** | Dark-themed React UI with search, filters, color-coded scores |
| 📧 **Email Digest** | HTML email with top 5 jobs + apply links every morning |
| 📝 **Cover Letters** | One-click AI-generated cover letter per job |
| ✅ **Status Tracking** | Track pipeline: `New → Matched → Applied → Interview → Offer` |
| 🔍 **Smart Filters** | Filter by status, source, min score, text search |
| 💾 **Deduplication** | Same job won't appear twice (by link or title+company) |

### Advanced Features (FastAPI Backend)
| Feature | Description |
|---------|-------------|
| 🤖 **Auto-Apply** | Automatically applies to ≥8 score jobs |
| 📄 **CV Analyzer** | AI parses and understands your resume |
| 🎯 **Job Matcher** | Deep matching with skill gap analysis |
| ❓ **Question Answerer** | AI answers application questions |
| 🔐 **Auth & Security** | JWT-based authentication |
| 🐘 **PostgreSQL** | Production-ready database (replaces SQLite) |
| 🐳 **Docker Compose** | One-command deployment |
| ⏰ **Celery Workers** | Background job processing |

---

## 🛠 Tech Stack

<div align="center">

### Frontend
| Technology | Purpose |
|:----------:|---------|
| ![React](https://img.shields.io/badge/-React_18-61DAFB?logo=react&logoColor=black&style=flat-square) | UI Framework |
| ![Vite](https://img.shields.io/badge/-Vite_5-646CFF?logo=vite&logoColor=white&style=flat-square) | Build Tool & Dev Server |
| ![CSS3](https://img.shields.io/badge/-Custom_CSS-1572B6?logo=css3&logoColor=white&style=flat-square) | Dark Theme Styling |

### Backend (Node.js)
| Technology | Purpose |
|:----------:|---------|
| ![Node.js](https://img.shields.io/badge/-Node.js_25-339933?logo=node.js&logoColor=white&style=flat-square) | Runtime |
| ![Express](https://img.shields.io/badge/-Express_4-000000?logo=express&logoColor=white&style=flat-square) | REST API Framework |
| ![SQLite](https://img.shields.io/badge/-SQLite-003B57?logo=sqlite&logoColor=white&style=flat-square) | Embedded Database |

### Backend (FastAPI)
| Technology | Purpose |
|:----------:|---------|
| ![Python](https://img.shields.io/badge/-Python_3.11-3776AB?logo=python&logoColor=white&style=flat-square) | Runtime |
| ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white&style=flat-square) | API Framework |
| ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?logo=postgresql&logoColor=white&style=flat-square) | Production Database |
| ![Celery](https://img.shields.io/badge/-Celery-37814A?logo=celery&logoColor=white&style=flat-square) | Task Queue |

### AI & Automation
| Technology | Purpose |
|:----------:|---------|
| ![OpenAI](https://img.shields.io/badge/-GPT--4o--mini-412991?logo=openai&logoColor=white&style=flat-square) | Job Scoring & Cover Letters |
| ![n8n](https://img.shields.io/badge/-n8n-EA4B71?logo=n8n&logoColor=white&style=flat-square) | Workflow Orchestration |
| ![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white&style=flat-square) | Containerization |

</div>

---

## 📸 Screenshots

### Dashboard — Main View
> Dark-themed dashboard showing all scored jobs with color-coded scores, filters, and status management.

```
┌────────────────────────────────────────────────────────────────────┐
│  🤖 AI Career Agent                                   [Refresh]   │
│  Autonomous PM/Product Manager job finder                         │
├──────────┬──────────┬──────────────┬───────────────────────────────┤
│ TOTAL: 2 │ AVG: 8   │ New:2        │ LinkedIn:1 · Indeed:1         │
├──────────┴──────────┴──────────────┴───────────────────────────────┤
│ [Search...                    ] [Status ▾] [Source ▾] [Score ▾]   │
├───────┬────────────────────────┬─────────┬──────────┬─────┬───────┤
│ SCORE │ TITLE                  │ COMPANY │ SOURCE   │ DATE│STATUS │
├───────┼────────────────────────┼─────────┼──────────┼─────┼───────┤
│  🟢 9 │ Product Manager (Rem.) │ TechCo  │ LinkedIn │ 5/6 │ New ▾ │
│  🟡 7 │ Scrum Master           │ FinServ │ Indeed   │ 5/6 │ New ▾ │
└───────┴────────────────────────┴─────────┴──────────┴─────┴───────┘
```

### Expanded Job Detail
> Click any row to see AI summary, match reason, skills analysis, and action buttons.

```
┌─────────────────────────────────────────────────────────────────┐
│  Summary: Remote PM role at AI startup, perfect for 0-3 yrs.   │
│  Why it matches: Strong match for Agile+AI skills              │
│                                                                 │
│  ✅ Skills you have: Agile, Scrum, Jira, Stakeholder Mgmt     │
│  ⚠️ Skills to learn: SQL, Data Analytics                       │
│                                                                 │
│  [📝 Cover Letter]  [🔗 View & Apply]  [✅ Mark Applied]       │
└─────────────────────────────────────────────────────────────────┘
```

### Score Color Coding
| Score | Color | Meaning |
|-------|-------|---------|
| 8–10 | 🟢 Green | Strong match — Auto-Apply eligible |
| 5–7 | 🟡 Yellow | Decent match — Worth reviewing |
| 1–4 | 🔴 Red | Poor match — Likely skip |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 20
- **Docker** (for n8n)
- **OpenAI API Key**

### 1. Clone
```bash
git clone https://github.com/aleemrana8/Ai-job-assistant-.git
cd Ai-job-assistant-
```

### 2. Start n8n (Docker)
```bash
docker run -d --name n8n -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```
Open http://localhost:5678 → Import `AI_Remote_PM_Job_Agent.json`

### 3. Start Backend
```bash
cd backend
npm install
npm run dev
# API → http://localhost:4000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# UI → http://localhost:5173
```

### 5. Push Jobs via Webhook
```bash
curl -X POST http://localhost:5678/webhook/jobs-ingest \
  -H "Content-Type: application/json" \
  -d '{"jobs":[{"title":"Product Manager","company":"Acme","source":"LinkedIn","location":"Remote","apply_link":"https://linkedin.com/jobs/12345"}]}'
```

---

## 📁 Project Structure

```
Ai-job-assistant-/
│
├── 📄 AI_Remote_PM_Job_Agent.json    # n8n workflow (importable)
├── 📄 README.md                      # You are here
├── 📄 DASHBOARD.md                   # Dashboard documentation
├── 📄 .gitignore
│
├── 🟢 backend/                       # Node.js + Express API
│   ├── src/
│   │   ├── server.js                 # Express server (:4000)
│   │   ├── db.js                     # SQLite database layer
│   │   ├── fetcher.js                # Job fetching service
│   │   ├── llm.js                    # OpenAI integration
│   │   ├── email.js                  # Email digest builder
│   │   ├── profile.js                # User profile/CV handler
│   │   └── scheduler.js              # Cron job scheduler
│   ├── data/
│   │   └── jobs.db                   # SQLite database (auto-created)
│   └── package.json
│
├── ⚛️ frontend/                       # React + Vite Dashboard
│   ├── src/
│   │   ├── App.jsx                   # Main dashboard component
│   │   ├── api.js                    # API client
│   │   ├── main.jsx                  # Entry point
│   │   └── styles.css                # Dark theme styles
│   ├── index.html
│   └── vite.config.js                # Proxy :5173 → :4000
│
└── 🐍 backend-fastapi/               # FastAPI Backend (Advanced)
    ├── app/
    │   ├── main.py                   # FastAPI entry
    │   ├── ai/                       # AI modules
    │   │   ├── cover_letter_gen.py   # Cover letter generator
    │   │   ├── cv_analyzer.py        # CV analysis
    │   │   ├── job_matcher.py        # Job matching engine
    │   │   └── llm_client.py         # LLM client
    │   ├── api/                      # Route handlers
    │   │   ├── jobs.py               # Job CRUD
    │   │   ├── dashboard.py          # Dashboard stats
    │   │   ├── applications.py       # Application tracking
    │   │   └── auth.py               # Authentication
    │   ├── automation/
    │   │   └── applicant.py          # Auto-apply engine
    │   ├── services/
    │   │   ├── job_fetcher.py        # Job scraping
    │   │   └── cv_parser.py          # CV parsing
    │   └── workers/
    │       ├── celery_app.py         # Task queue
    │       └── tasks.py              # Background tasks
    ├── Dockerfile
    ├── docker-compose.yml
    └── requirements.txt
```

---

## 🔌 API Endpoints

### Node.js Backend (`:4000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/jobs` | List jobs (filters: `status`, `source`, `minScore`, `search`) |
| `GET` | `/api/stats` | Dashboard statistics |
| `POST` | `/api/ingest` | Ingest jobs from n8n (upsert) |
| `PATCH` | `/api/jobs/:id/status` | Update job status |
| `DELETE` | `/api/jobs/:id` | Remove a job |

### n8n Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/jobs-ingest` | Push raw jobs into the AI pipeline |

---

## 🧠 AI Agent Pipeline

```
📥 Raw Jobs Input (LinkedIn/Indeed)
        │
        ▼
┌───────────────────┐
│ Source Filter      │  ← Only LinkedIn & Indeed
│ (discard others)   │
└───────┬───────────┘
        ▼
┌───────────────────┐
│ Pre-Filter         │  ← Remote + PM roles + valid link
│ (title + location) │  ← Exclude senior/executive
└───────┬───────────┘
        ▼
┌───────────────────┐
│ Batch + User CV    │  ← Combine jobs with your profile
└───────┬───────────┘
        ▼
┌───────────────────┐
│ GPT-4o-mini        │  ← Score 1-10, summarize, match skills
│ (AI Filter+Score)  │  ← Extract skills_match & skills_missing
└───────┬───────────┘
        ▼
┌───────────────────┐
│ Parse + Extract    │  ← dashboard_jobs[] + email_jobs[]
└───────┬───────────┘
        │
   ┌────┴────┐
   ▼         ▼
┌──────┐  ┌──────┐
│ DB   │  │Email │  → Dashboard API + Google Sheets + Email Digest
└──────┘  └──────┘
```

### AI Output Schema
```json
{
  "dashboard_jobs": [
    {
      "job_id": "linkedin-12345",
      "title": "Product Manager",
      "company": "TechCo",
      "location": "Remote",
      "source": "LinkedIn",
      "posted_at": "2026-05-06",
      "score": 9,
      "summary": "Remote PM role at AI startup",
      "reason": "Strong match for Agile + AI skills",
      "skills_match": ["Agile", "Scrum", "Jira"],
      "skills_missing": ["SQL"],
      "apply_link": "https://linkedin.com/jobs/12345",
      "status": "New"
    }
  ],
  "email_jobs": [
    {
      "title": "Product Manager",
      "company": "TechCo",
      "score": 9,
      "apply_link": "https://linkedin.com/jobs/12345"
    }
  ]
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: `4000`) |
| `INGEST_TOKEN` | No | Auth token for n8n → API ingest |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini |

### n8n Placeholders to Replace
| Placeholder | Where |
|-------------|-------|
| `YOUR_OPENAI_CREDENTIAL_ID` | AI Filter + Score node |
| `YOUR_GOOGLE_SHEET_ID` | Google Sheets nodes (×2) |
| `YOUR_GOOGLE_CREDENTIAL_ID` | Google Sheets nodes |
| `YOUR_SMTP_ID` | Email node |
| `your@email.com` | Email from/to |

---

## 📋 Logs & Monitoring

### Backend Logs
```bash
# Express logs all requests via morgan
npm run dev
# Output:
# API listening on http://localhost:4000
# POST /api/ingest 200 5.467 ms
# GET /api/jobs 200 1.503 ms
# GET /api/stats 200 0.753 ms
```

### n8n Execution Logs
```
# View in n8n UI → Executions tab
# Each run shows:
# ✅ Webhook: Receive Jobs
# ✅ Collect & Source-Filter (kept: 15)
# ✅ Pre-Filter (kept: 8)  
# ✅ AI Filter + Score (scored: 8)
# ✅ Push to Dashboard API (upserted: 8)
# ✅ Send Email Digest (sent)
```

### Docker Logs
```bash
docker logs -f n8n        # n8n container logs
docker logs --tail 20 n8n # Last 20 lines
```

---

## � CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment.

### Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    CI Pipeline (on push/PR)                      │
├──────────────┬──────────────────┬────────────────────────────────┤
│              │                  │                                │
│  ┌───────────▼──────────┐      │     ┌──────────────────────┐   │
│  │   Lint & Validate    │      │     │   FastAPI Lint       │   │
│  │                      │      │     │                      │   │
│  │ • ESLint Backend     │      │     │ • Ruff linter        │   │
│  │ • ESLint Frontend    │      │     │ • Python 3.11        │   │
│  │ • n8n JSON validate  │      │     └──────────────────────┘   │
│  └───────────┬──────────┘      │                                │
│              │                 │                                │
│    ┌─────────┴──────────┐      │                                │
│    │                    │      │                                │
│  ┌─▼──────────────┐  ┌──▼─────────────┐                        │
│  │ Backend Tests  │  │ Frontend Build │                        │
│  │                │  │                │                        │
│  │ • Node.js 22   │  │ • Vite build   │                        │
│  │ • node:test    │  │ • Artifact ↑   │                        │
│  └─────────┬──────┘  └──────┬─────────┘                        │
│            │                │                                   │
│            └────────┬───────┘                                   │
│                     │                                           │
│           ┌─────────▼──────────┐                                │
│           │  Docker Build Test │                                │
│           │  (FastAPI image)   │                                │
│           └────────────────────┘                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   CD Pipeline (on tag v*)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Build & Push Image │→ │ Build Frontend  │→ │   Deploy      │  │
│  │                    │  │                 │  │              │  │
│  │ • Docker Buildx    │  │ • npm ci        │  │ • Staging or │  │
│  │ • GHCR push        │  │ • vite build    │  │   Production │  │
│  │ • Semver tags      │  │ • Artifact ↑    │  │ • Manual gate│  │
│  └────────────────────┘  └─────────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Workflow Files

| File | Trigger | What It Does |
|------|---------|-------------|
| `.github/workflows/ci.yml` | Push to `main`/`develop`, PRs | Lint, test, build, Docker image validation |
| `.github/workflows/cd.yml` | Tag `v*`, manual dispatch | Build Docker image → push to GHCR → deploy |

### CI Jobs

| Job | Tool | Purpose |
|-----|------|--------|
| **Lint & Validate** | ESLint, JSON parse | Catch syntax & code quality issues |
| **Backend Tests** | `node --test` | Run DB schema + API health tests |
| **Frontend Build** | Vite | Verify production build succeeds |
| **FastAPI Lint** | Ruff | Python code quality |
| **Docker Build** | Docker Buildx | Validate container image builds |

### Running Locally

```bash
# Backend lint + test
cd backend
npm run lint
npm test

# Frontend lint + build
cd frontend
npm run lint
npm run build

# FastAPI lint
cd backend-fastapi
pip install ruff
ruff check app/
```

---

## 🗺 Roadmap

- [x] n8n workflow with AI scoring
- [x] Node.js/Express backend with SQLite
- [x] React + Vite dashboard with dark theme
- [x] FastAPI backend with auto-apply
- [x] Cover letter generation
- [x] Email digest
- [x] Docker support
- [x] CI/CD pipeline (GitHub Actions)
- [x] ESLint for backend & frontend
- [x] Automated tests (Node.js test runner)
- [ ] RapidAPI JSearch integration (auto-scrape LinkedIn/Indeed)
- [ ] Chrome extension for one-click apply
- [ ] Multi-user authentication
- [ ] Analytics & apply rate tracking
- [ ] Mobile-responsive dashboard
- [ ] Slack/Discord notifications

---

## 🤝 Contributing

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [aleemrana8](https://github.com/aleemrana8)**

⭐ Star this repo if it helped you land your dream job!

</div>
