const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

const API_KEY = process.env.WORLDCUP_API_KEY || '';
const BASE_URL = 'https://api.worldcupapi.com';

function logRequest(endpoint, result) {
  try {
    const db = getDb();
    db.prepare('INSERT INTO api_log (endpoint, result) VALUES (?, ?)').run(endpoint, result);
  } catch {}
}

function getRequestCount() {
  try {
    return getDb().prepare('SELECT COUNT(*) as cnt FROM api_log').get().cnt;
  } catch { return 0; }
}

// Update DB from an array of fixture objects returned by the API
function applyFixtures(fixtures) {
  const db = getDb();
  let updated = 0;

  for (const m of fixtures) {
    const existing = db.prepare('SELECT * FROM matches WHERE external_id = ?').get(String(m.id));
    if (!existing) continue;

    const raw = (m.status || m.match_status || '').toLowerCase();
    let status = 'upcoming';
    if (['live','in_play','inprogress','halftime','ht','paused'].includes(raw)) status = 'live';
    else if (['finished','ft','aet','pen','awarded','complete','ended'].includes(raw)) status = 'finished';

    // Score fields vary — try every known shape
    const scoreA =
      m.score?.home ?? m.score?.ft?.home ??
      m.score_home  ?? m.goals_home      ?? null;
    const scoreB =
      m.score?.away ?? m.score?.ft?.away ??
      m.score_away  ?? m.goals_away      ?? null;

    let result = null;
    if (status === 'finished' && scoreA !== null && scoreB !== null) {
      if (scoreA > scoreB)      result = 'team_a';
      else if (scoreB > scoreA) result = 'team_b';
      else                      result = 'draw';
    }

    db.prepare(
      'UPDATE matches SET status = ?, result = ?, score_a = ?, score_b = ? WHERE id = ?'
    ).run(status, result, scoreA, scoreB, existing.id);

    if (status === 'finished' && result) updateScoresForMatch(existing.id);
    updated++;
  }
  return updated;
}

// Called during live match windows — polls /livescores
async function syncMatchResults() {
  if (!API_KEY) {
    console.log('[apiSync] No WORLDCUP_API_KEY configured, skipping.');
    return { synced: 0, error: 'No API key' };
  }

  const used = getRequestCount();
  if (used >= 1450) {
    console.warn(`[apiSync] API budget nearly exhausted (${used} calls used). Skipping.`);
    return { synced: 0, error: 'Budget limit reached' };
  }

  try {
    const res = await fetch(`${BASE_URL}/livescores?key=${API_KEY}`);
    const resultTag = res.ok ? 'ok' : `error:${res.status}`;
    logRequest('livescores', resultTag);

    if (!res.ok) return { synced: 0, error: `HTTP ${res.status}` };

    const data = await res.json();
    const fixtures = Array.isArray(data) ? data : (data.data || data.matches || []);
    const synced = applyFixtures(fixtures);
    return { synced, requestsUsed: used + 1 };
  } catch (err) {
    logRequest('livescores', `error:${err.message}`);
    return { synced: 0, error: err.message };
  }
}

// Called once per day — fetches a specific date's fixtures to catch missed results
async function syncByDate(date) {
  if (!API_KEY) return { synced: 0, error: 'No API key' };

  const used = getRequestCount();
  if (used >= 1450) {
    console.warn(`[apiSync] Budget exhausted (${used}). Skipping daily sync.`);
    return { synced: 0, error: 'Budget limit reached' };
  }

  try {
    const res = await fetch(`${BASE_URL}/fixtures?key=${API_KEY}&date=${date}`);
    logRequest(`fixtures?date=${date}`, res.ok ? 'ok' : `error:${res.status}`);

    if (!res.ok) return { synced: 0, error: `HTTP ${res.status}` };

    const data = await res.json();
    const fixtures = Array.isArray(data) ? data : (data.data || data.fixtures || []);
    const synced = applyFixtures(fixtures);
    return { synced, requestsUsed: used + 1 };
  } catch (err) {
    logRequest(`fixtures?date=${date}`, `error:${err.message}`);
    return { synced: 0, error: err.message };
  }
}

module.exports = { syncMatchResults, syncByDate, getRequestCount };
