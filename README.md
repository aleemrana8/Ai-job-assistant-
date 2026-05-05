# AI Remote PM Job Agent (n8n)

Automated daily pipeline that finds remote Project / Product / Scrum jobs (0–3 yrs), scores them with an LLM, stores them, and emails a digest.

## Flow
```
Cron (daily 9AM)
  → Multi Job Sources (Remotive ×3, Arbeitnow, RemoteOK)
  → Merge → Normalize → Pre-Filter (remote + PM titles, exclude senior)
  → Load existing rows → Deduplicate
  → Batch → AI Filter + Score (top 10)
  → Save to Google Sheets
  → Build HTML Digest → Send Email
```

## Files
- `AI_Remote_PM_Job_Agent.json` — importable n8n workflow.

## Setup
1. In n8n: **Workflows → Import from File** and select the JSON.
2. Replace placeholders:
   - `YOUR_GOOGLE_SHEET_ID` (read + append nodes)
   - `YOUR_OPENAI_CREDENTIAL_ID`, `YOUR_GOOGLE_CREDENTIAL_ID`, `YOUR_SMTP_ID`
   - `your@email.com` (from / to)
3. Create a Google Sheet tab named `Jobs` with headers:
   `Date | Title | Company | Location | Score | Link | Status | Source | Summary | Experience`
4. Activate the workflow.

## Sources used (free, no key required)
- `https://remotive.com/api/remote-jobs?search=project+manager`
- `https://remotive.com/api/remote-jobs?search=product+manager`
- `https://remotive.com/api/remote-jobs?search=scrum+master`
- `https://www.arbeitnow.com/api/job-board-api`
- `https://remoteok.com/api`

## Filtering rules
- Title must match: Project / Product / Program Manager, Associate/Junior PM, APM, Scrum Master, Product Owner.
- Excludes: Senior, Sr., Staff, Principal, Lead, Director, Head of, VP, Chief.
- Location must contain: remote / worldwide / anywhere / distributed.

## Scoring (1–10)
LLM scores on entry-level friendliness, role clarity, and remote flexibility.

## Dashboard
The Google Sheet acts as the dashboard. Recommended: add a filter view sorted by `Score desc` and a `Status` dropdown (`New / Applied / Interviewing / Rejected / Offer`).
