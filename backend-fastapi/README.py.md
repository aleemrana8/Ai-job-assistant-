"""
AI Career Agent — FastAPI Backend
=================================

Production-grade autonomous job hunting & auto-apply platform.

## Quick Start (Docker)

```bash
# 1. Copy env file and configure
cp .env.example .env
# Edit .env with your API keys

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec api alembic upgrade head

# 4. Access API docs
open http://localhost:8000/docs
```

## Quick Start (Local Development)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start PostgreSQL & Redis (or use Docker for just those)
docker-compose up -d db redis

# 3. Run migrations
alembic upgrade head

# 4. Start the API server
uvicorn app.main:app --reload --port 8000

# 5. Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info

# 6. Start Celery beat (separate terminal)
celery -A app.workers.celery_app beat --loglevel=info
```

## Architecture

```
backend-fastapi/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── api/                 # API route handlers
│   │   ├── auth.py          # JWT registration/login
│   │   ├── profile.py       # CV upload & profile management
│   │   ├── jobs.py          # Job listing, matching, cover letters
│   │   ├── applications.py  # Application tracking & auto-apply
│   │   ├── dashboard.py     # Dashboard & analytics
│   │   └── email_api.py     # Email triggers
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (.env loader)
│   │   └── security.py      # JWT + password hashing
│   ├── database/
│   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   └── session.py       # Async engine & session factory
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── ai/                  # LLM integration layer
│   │   ├── llm_client.py    # OpenAI client wrapper
│   │   ├── cv_analyzer.py   # CV analysis with LLM
│   │   ├── job_matcher.py   # AI job scoring & matching
│   │   ├── cover_letter_gen.py  # Cover letter generation
│   │   └── question_answerer.py # Application Q&A
│   ├── services/
│   │   ├── cv_parser.py     # PDF/DOCX text extraction
│   │   └── job_fetcher.py   # LinkedIn & Indeed API fetcher
│   ├── workers/
│   │   ├── celery_app.py    # Celery configuration & beat schedule
│   │   └── tasks.py         # Background tasks (fetch, match, apply, email)
│   ├── automation/
│   │   └── applicant.py     # Playwright browser automation
│   └── emails/
│       └── sender.py        # SMTP email sender with HTML templates
├── alembic/                 # Database migrations
├── requirements.txt
├── Dockerfile
├── docker-compose.yml       # Full stack: API + Worker + Beat + DB + Redis
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login & get JWT |
| GET | /api/profile/ | Get user profile |
| POST | /api/profile/upload-cv | Upload & analyze CV |
| PATCH | /api/profile/ | Update profile fields |
| GET | /api/jobs/ | List all jobs (filter by status/source/score) |
| GET | /api/jobs/{id} | Get single job |
| PATCH | /api/jobs/{id}/status | Update job status |
| POST | /api/jobs/match-all | Re-score all jobs with AI |
| GET | /api/jobs/{id}/cover-letter | Generate/get cover letter |
| POST | /api/jobs/refresh | Trigger job fetch |
| GET | /api/applications/ | List all applications |
| POST | /api/applications/{job_id}/apply | Mark as manually applied |
| POST | /api/applications/{job_id}/auto-apply | Trigger auto-apply |
| GET | /api/dashboard/ | Dashboard overview |
| GET | /api/dashboard/analytics | Detailed analytics |
| POST | /api/email/send-digest | Trigger digest email |
| POST | /api/email/test | Send test email |

## Celery Beat Schedule

| Task | Frequency |
|------|-----------|
| Fetch jobs from LinkedIn & Indeed | Every 5 minutes |
| AI-match new jobs against profile | Every 10 minutes |
| Auto-apply to eligible jobs (score≥8) | Every 15 minutes |
| Email digest (morning) | 2:30 AM UTC |
| Email digest (afternoon) | 2:30 PM UTC |

## Tech Stack

- **Framework:** FastAPI + Uvicorn
- **Database:** PostgreSQL + SQLAlchemy (async)
- **Migrations:** Alembic
- **Task Queue:** Celery + Redis
- **AI:** OpenAI GPT-4o-mini
- **Browser Automation:** Playwright (Chromium)
- **Email:** aiosmtplib + Jinja2 templates
- **Auth:** JWT + bcrypt
- **Containerization:** Docker + Docker Compose
"""
