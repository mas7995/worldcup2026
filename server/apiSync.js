const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

const API_KEY = process.env.WORLDCUP_API_KEY || '';
const BASE_URL = 'https://api.worldcupapi.com';

async function syncMatchResults() {
  if (!API_KEY) {
    console.log('[apiSync] No WORLDCUP_API_KEY configured, skipping sync.');
    return { synced: 0, error: 'No API key configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/livescores?key=${API_KEY}`);

    if (!res.ok) {
      console.error('[apiSync] API error:', res.status, res.statusText);
      return { synced: 0, error: `API error ${res.status}` };
    }

    const data = await res.json();
    const matches = Array.isArray(data) ? data : (data.data || data.matches || []);
    const db = getDb();
    let synced = 0;

    for (const m of matches) {
      const existing = db.prepare('SELECT * FROM matches WHERE external_id = ?').get(String(m.id));
      if (!existing) continue;

      // Normalise status — worldcupapi uses various strings
      const raw = (m.status || m.match_status || '').toLowerCase();
      let status = 'upcoming';
      if (['live', 'in_play', 'inprogress', 'halftime', 'ht', 'paused'].includes(raw)) status = 'live';
      else if (['finished', 'ft', 'aet', 'pen', 'awarded', 'complete', 'ended'].includes(raw)) status = 'finished';

      // Score — API may use score.home/away, score_home/score_away, or goals_home/goals_away
      const scoreA =
        m.score?.home  ?? m.score?.ft?.home  ??
        m.score_home   ?? m.goals_home       ?? null;
      const scoreB =
        m.score?.away  ?? m.score?.ft?.away  ??
        m.score_away   ?? m.goals_away       ?? null;

      let result = null;
      if (status === 'finished' && scoreA !== null && scoreB !== null) {
        if (scoreA > scoreB) result = 'team_a';
        else if (scoreB > scoreA) result = 'team_b';
        else result = 'draw';
      }

      db.prepare(
        'UPDATE matches SET status = ?, result = ?, score_a = ?, score_b = ? WHERE id = ?'
      ).run(status, result, scoreA, scoreB, existing.id);

      if (status === 'finished' && result) updateScoresForMatch(existing.id);
      synced++;
    }

    return { synced };
  } catch (err) {
    console.error('[apiSync] Error:', err.message);
    return { synced: 0, error: err.message };
  }
}

module.exports = { syncMatchResults };
