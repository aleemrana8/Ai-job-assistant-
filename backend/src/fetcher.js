/**
 * Job Fetcher — pulls ONLY Project Manager & Product Manager remote jobs
 * Sources: LinkedIn (guest API) + Indeed (RSS) + RapidAPI backup
 * Runs every 5 minutes via scheduler
 */

// STRICT: Only Project Manager and Product Manager roles
const TITLE_MATCH = /(project\s*manag|product\s*manag|associate\s*product|associate\s*project|junior\s*product|junior\s*project|ai\s*project\s*manag|technical\s*project\s*manag|digital\s*project\s*manag|it\s*project\s*manag)/i;
const SENIOR_EXCLUDE = /(senior|sr\.|staff|principal|director|head\s+of|vp|chief|c-suite|executive)/i;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY || 'cb6a8d4281msh6df82a284793a19p1a12dajsnef423f03bab2';

// ─── LinkedIn (Guest API - free, no auth) ─────────────────────────
async function fetchLinkedIn() {
  const jobs = [];
  const queries = [
    'remote project manager',
    'remote product manager',
    'project manager work from home',
    'product manager remote',
  ];

  for (const query of queries) {
    try {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=Worldwide&f_WT=2&start=0&sortBy=DD`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        }
      });
      if (!res.ok) {
        console.error(`[LinkedIn] ${query}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      const cardRegex = /<li[\s\S]*?<\/li>/g;
      const titleRegex = /<h3[^>]*base-search-card__title[^>]*>([^<]+)<\/h3>/;
      const companyRegex = /<h4[^>]*base-search-card__subtitle[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/;
      const locationRegex = /<span[^>]*job-search-card__location[^>]*>([^<]+)<\/span>/;
      const linkRegex = /<a[^>]*base-card__full-link[^>]*href="([^"]+)"/;
      const dateRegex = /<time[^>]*datetime="([^"]+)"/;

      const cards = html.match(cardRegex) || [];
      for (const card of cards) {
        const titleMatch = card.match(titleRegex);
        const companyMatch = card.match(companyRegex);
        const locationMatch = card.match(locationRegex);
        const linkMatch = card.match(linkRegex);
        const dateMatch = card.match(dateRegex);

        if (!titleMatch) continue;
        const title = titleMatch[1].trim();
        const link = linkMatch ? linkMatch[1].split('?')[0] : '';
        const jobId = link ? link.match(/(\d+)$/)?.[1] || '' : '';

        jobs.push({
          id: jobId ? `linkedin-${jobId}` : `linkedin-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
          title,
          company: companyMatch ? companyMatch[1].trim() : '',
          location: locationMatch ? locationMatch[1].trim() : 'Remote',
          source: 'LinkedIn',
          link: link || '',
          posted_at: dateMatch ? dateMatch[1] : '',
          description: '',
          remote_type: 'Remote',
        });
      }
      console.log(`[LinkedIn] "${query}": ${cards.length} cards`);
    } catch (e) {
      console.error(`[LinkedIn] fetch error (${query}):`, e.message);
    }
  }
  return jobs;
}

// ─── Indeed (RSS feed - free) ─────────────────────────────────────
async function fetchIndeed() {
  const jobs = [];
  const queries = [
    'remote+project+manager',
    'remote+product+manager',
    'project+manager+work+from+home',
    'product+manager+remote',
  ];

  for (const query of queries) {
    try {
      const url = `https://www.indeed.com/rss?q=${query}&l=Remote&sort=date&limit=50&fromage=7`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        }
      });
      if (!res.ok) {
        console.error(`[Indeed] ${query}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();

      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1];
        const getTag = (tag) => {
          const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`));
          return m ? m[1].trim() : '';
        };

        const rawTitle = getTag('title');
        const link = getTag('link');
        const pubDate = getTag('pubDate');
        const description = getTag('description').replace(/<[^>]+>/g, '').slice(0, 500);

        const parts = rawTitle.split(' - ');
        const jobTitle = parts[0] || rawTitle;
        const company = parts.length > 1 ? parts[parts.length - 1] : '';

        const jkMatch = link.match(/jk=([^&]+)/);
        const jobKey = jkMatch ? jkMatch[1] : '';

        jobs.push({
          id: jobKey ? `indeed-${jobKey}` : `indeed-${rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
          title: jobTitle.trim(),
          company: company.trim(),
          location: 'Remote',
          source: 'Indeed',
          link: link || '',
          posted_at: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
          description,
          remote_type: 'Remote',
        });
      }
      console.log(`[Indeed RSS] "${query}": found ${jobs.length} total`);
    } catch (e) {
      console.error(`[Indeed RSS] fetch error (${query}):`, e.message);
    }
  }
  return jobs;
}

// ─── RapidAPI Indeed Scraper (paid backup) ────────────────────────
async function fetchIndeedAPI() {
  if (!RAPIDAPI_KEY) return [];
  const jobs = [];
  const searches = [
    { query: 'remote project manager', country: 'us' },
    { query: 'remote product manager', country: 'us' },
    { query: 'project manager', country: 'us' },
    { query: 'product manager', country: 'us' },
  ];

  for (const search of searches) {
    try {
      const res = await fetch('https://indeed-scraper-api.p.rapidapi.com/api/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'indeed-scraper-api.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        body: JSON.stringify({
          scraper: {
            maxRows: 25,
            query: search.query,
            location: 'Remote',
            jobType: 'fulltime',
            radius: '50',
            sort: 'date',
            fromDays: '7',
            country: search.country,
          }
        }),
      });
      if (!res.ok) {
        console.error(`[Indeed API] ${search.query}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const results = Array.isArray(data) ? data : (data.jobs || data.data || []);
      for (const j of results) {
        jobs.push({
          id: j.id ? `indeed-api-${j.id}` : `indeed-api-${(j.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`,
          title: j.title || j.jobTitle || '',
          company: j.company || j.companyName || '',
          location: j.location || j.formattedLocation || 'Remote',
          source: 'Indeed',
          link: j.url || j.link || j.applyLink || '',
          posted_at: j.date || j.postedAt || '',
          description: (j.description || j.snippet || '').slice(0, 500),
          remote_type: 'Remote',
        });
      }
      console.log(`[Indeed API] "${search.query}": ${results.length} results`);
    } catch (e) {
      console.error(`[Indeed API] fetch error (${search.query}):`, e.message);
    }
  }
  return jobs;
}

// ─── RapidAPI LinkedIn Data API (paid backup) ─────────────────────
async function fetchLinkedInAPI() {
  if (!RAPIDAPI_KEY) return [];
  const jobs = [];
  const queries = [
    'remote project manager',
    'remote product manager',
  ];

  for (const query of queries) {
    try {
      const res = await fetch(`https://linkedin-data-api.p.rapidapi.com/search-jobs?keywords=${encodeURIComponent(query)}&locationId=92000000&datePosted=pastWeek&sort=mostRecent`, {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        }
      });
      if (!res.ok) {
        console.error(`[LinkedIn API] ${query}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!data.success) continue;
      const results = data.data || [];
      for (const j of results) {
        jobs.push({
          id: j.id ? `linkedin-api-${j.id}` : `linkedin-api-${(j.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`,
          title: j.title || '',
          company: j.companyName || j.company || '',
          location: j.location || 'Remote',
          source: 'LinkedIn',
          link: j.url || j.jobUrl || '',
          posted_at: j.postedAt || j.publishedAt || '',
          description: (j.description || '').slice(0, 500),
          remote_type: 'Remote',
        });
      }
      console.log(`[LinkedIn API] "${query}": ${results.length} results`);
    } catch (e) {
      console.error(`[LinkedIn API] fetch error (${query}):`, e.message);
    }
  }
  return jobs;
}

// ─── STRICT FILTERS ──────────────────────────────────────────────

function filterJobs(jobs) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const counts = { not_remote: 0, wrong_source: 0, missing_link: 0, older_than_7_days: 0, irrelevant_role: 0 };

  const valid = jobs.filter(j => {
    const src = (j.source || '').toLowerCase();
    if (src !== 'linkedin' && src !== 'indeed') { counts.wrong_source++; return false; }
    if (!j.link) { counts.missing_link++; return false; }

    const loc = (j.location || '').toLowerCase();
    const title = (j.title || '').toLowerCase();
    const isRemote = /remote|worldwide|anywhere|distributed|wfh|work.from.home|home/i.test(loc + ' ' + title + ' ' + (j.remote_type || ''));
    if (!isRemote) { counts.not_remote++; return false; }

    if (j.posted_at) {
      const postedDate = new Date(j.posted_at);
      if (!isNaN(postedDate.getTime()) && postedDate < sevenDaysAgo) {
        counts.older_than_7_days++;
        return false;
      }
    }

    if (!TITLE_MATCH.test(j.title || '')) { counts.irrelevant_role++; return false; }
    if (SENIOR_EXCLUDE.test(j.title || '')) { counts.irrelevant_role++; return false; }

    return true;
  });

  console.log(`[fetcher] Filter stats:`, counts);
  return valid;
}

function deduplicateJobs(jobs) {
  const seenLinks = new Set();
  const seenKeys = new Set();
  const unique = [];

  for (const job of jobs) {
    if (job.link && seenLinks.has(job.link)) continue;
    const key = `${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}|${(job.source || '').toLowerCase()}`;
    if (seenKeys.has(key)) continue;

    if (job.link) seenLinks.add(job.link);
    seenKeys.add(key);
    unique.push(job);
  }

  console.log(`[fetcher] Dedup: ${jobs.length} → ${unique.length} (removed ${jobs.length - unique.length} duplicates)`);
  return unique;
}

function scoreJob(j) {
  const title = (j.title || '').toLowerCase();
  let score = 4;

  if (/product\s*manager/i.test(title)) score += 3;
  else if (/project\s*manager/i.test(title)) score += 3;

  if (/remote/i.test(title) || /remote/i.test(j.location || '')) score += 1;
  if (/entry|junior|associate|jr|mid/i.test(title)) score += 1;
  if (j.description && j.description.length > 100) score += 1;

  // Source bonus
  if ((j.source || '').toLowerCase() === 'linkedin') score += 0;
  if ((j.source || '').toLowerCase() === 'indeed') score += 0;

  return Math.min(Math.max(score, 1), 10);
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────

export async function fetchAllJobs() {
  console.log(`[fetcher] 🔄 Fetching Project Manager & Product Manager jobs from LinkedIn & Indeed...`);
  console.log(`[fetcher] RapidAPI key: ${RAPIDAPI_KEY ? 'configured' : 'NOT SET'}`);

  const [linkedin, indeed, indeedAPI, linkedinAPI] = await Promise.all([
    fetchLinkedIn(),
    fetchIndeed(),
    fetchIndeedAPI(),
    fetchLinkedInAPI(),
  ]);

  const totalInput = linkedin.length + indeed.length + indeedAPI.length + linkedinAPI.length;
  console.log(`[fetcher] Raw totals: LinkedIn=${linkedin.length}, Indeed RSS=${indeed.length}, Indeed API=${indeedAPI.length}, LinkedIn API=${linkedinAPI.length} (total: ${totalInput})`);

  const allRaw = [...linkedin, ...indeed, ...indeedAPI, ...linkedinAPI];

  const filtered = filterJobs(allRaw);
  console.log(`[fetcher] After validity filter: ${filtered.length} jobs`);

  const unique = deduplicateJobs(filtered);

  const today = new Date().toISOString().slice(0, 10);
  const jobs = unique.map(j => ({
    id: j.id,
    date: today,
    title: j.title,
    company: j.company,
    location: j.location,
    remote_type: j.remote_type || 'Remote',
    posted_at: j.posted_at || today,
    score: scoreJob(j),
    link: j.link,
    source_url: j.link,
    status: 'New',
    source: j.source,
    summary: j.description ? j.description.slice(0, 200) : '',
    reason: '',
    skills_match: '',
    skills_missing: '',
  }));

  jobs.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.posted_at || '').localeCompare(a.posted_at || '');
  });

  console.log(`[fetcher] ✅ Final: ${jobs.length} valid Project/Product Manager jobs`);
  return jobs;
}
