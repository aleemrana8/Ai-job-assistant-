# AI Remote PM Job Agent (n8n)

Fully autonomous daily pipeline that finds remote Project / Product / Program / Scrum jobs (0–3 yrs), matches them against your CV, scores them with an LLM, stores them, and emails a digest.

## Flow
```
Cron 9AM
  → [User CV node]                       ← edit your CV here
  → Multi Job Sources (Remotive ×3, Arbeitnow, RemoteOK)
  → Merge → Normalize → Pre-Filter (remote + PM titles, exclude senior)
  → Load existing rows → Deduplicate
  → Batch (jobs + CV) → AI Agent (filter, score, rank, top 5–10)
  → Save to Google Sheets
  → Build HTML Digest → Send Email
```

## Files
- `AI_Remote_PM_Job_Agent.json` — importable n8n workflow.

## Setup
1. In n8n: **Workflows → Import from File** and select the JSON.
2. Open **User CV (edit me)** node and paste your real CV text into `USER_CV`.
3. Replace placeholders:
   - `YOUR_GOOGLE_SHEET_ID` (read + append nodes)
   - `YOUR_OPENAI_CREDENTIAL_ID`, `YOUR_GOOGLE_CREDENTIAL_ID`, `YOUR_SMTP_ID`
   - `your@email.com` (from / to)
4. Create a Google Sheet tab named `Jobs` with headers:
   `Date | Title | Company | Location | Score | Link | Status | Source | Summary | Reason | SkillsMatch | SkillsMissing`
5. Activate the workflow.

## Sources used (free, no key required)
- `https://remotive.com/api/remote-jobs?search=project+manager`
- `https://remotive.com/api/remote-jobs?search=product+manager`
- `https://remotive.com/api/remote-jobs?search=scrum+master`
- `https://www.arbeitnow.com/api/job-board-api`
- `https://remoteok.com/api`

## Filtering rules
- Title must match: Project / Product / Program Manager, Associate/Junior PM, APM, Scrum Master, Product Owner, AI Project Manager.
- Excludes: Senior, Sr., Staff, Principal, Lead, Director, Head of, VP, Chief.
- Location must contain: remote / worldwide / anywhere / distributed.

## AI Agent output (per job)
```json
{
  "title": "",
  "company": "",
  "location": "",
  "source": "",
  "summary": "",
  "score": 0,
  "reason": "",
  "skills_match": [],
  "skills_missing": [],
  "apply_link": ""
}
```
Scoring weights: CV relevance (highest), entry-level friendliness, role clarity, remote flexibility.

## Dashboard
The Google Sheet acts as the dashboard. Recommended: filter view sorted by `Score desc` and a `Status` dropdown (`New / Applied / Interviewing / Rejected / Offer`).
