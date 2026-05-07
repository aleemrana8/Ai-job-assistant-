# AI Job Assistant — Dashboard (Backend + Frontend)

Local-first dashboard for the n8n workflow. Replaces (or complements) the Google Sheet.

```
n8n  ──HTTP POST /api/ingest──►  Express + SQLite  ◄──REST──  React + Vite UI
```

## 1. Backend (Node/Express + SQLite)

```powershell
cd backend
npm install
npm run dev
# API: http://localhost:4000
```

Endpoints:

| Method | Path                       | Purpose                                  |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/health`              | Liveness check                           |
| GET    | `/api/jobs`                | List jobs. Query: `status, source, minScore, search, limit` |
| GET    | `/api/stats`               | Counts, avg score, top 5                 |
| PATCH  | `/api/jobs/:id/status`     | Body `{ "status": "Applied" }`           |
| DELETE | `/api/jobs/:id`            | Remove a job                             |
| POST   | `/api/ingest`              | Upsert one job or `{ jobs: [...] }`      |

Optional auth: set `INGEST_TOKEN=...` in env, then n8n must send header `X-Ingest-Token: <same>`.

DB file: `backend/data/jobs.db` (SQLite, WAL).

## 2. Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
# UI: http://localhost:5173  (proxies /api -> :4000)
```

Features: search, filter by status/source/min-score, inline status updates, expandable detail row with summary / reason / skills match / skills missing, live stats.

## 3. Wire n8n into the API (instead of / alongside Google Sheets)

In your `AI_Remote_PM_Job_Agent.json` workflow, after `Parse AI -> Rows`, add an **HTTP Request** node:

- Method: `POST`
- URL: `http://host.docker.internal:4000/api/ingest`  *(use `host.docker.internal` because n8n is in Docker; the API runs on your host)*
- Send Body: `JSON`
- Body content type: `JSON`
- JSON body:
  ```
  ={{ { "jobs": $json } }}
  ```
  *(or wrap each item — easiest is to use an aggregate before this node and send the whole array)*
- Headers (only if you set a token): `X-Ingest-Token: <your-token>`

The ingest endpoint upserts on `id`, so re-runs won't create duplicates.

## 4. Status workflow

The dropdown supports: `New → Interested → Applied → Interview → Offer / Rejected / Skip`. Updates persist immediately.

## 5. Production notes

- `npm run build` in `frontend/` produces `dist/`. You can serve it statically from Express by adding `app.use(express.static('../frontend/dist'))` if you want a single port.
- For multi-user / cloud use, swap SQLite for Postgres (the `db.js` module is the only file to change).
