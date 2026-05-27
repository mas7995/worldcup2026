const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'WC'; // FIFA World Cup

async function syncMatchResults() {
  if (!API_KEY) {
    console.log('[apiSync] No API key configured, skipping sync.');
    return { synced: 0, error: 'No API key configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/competitions/${COMPETITION_CODE}/matches?season=2026`, {
      headers: { 'X-Auth-Token': API_KEY },
    });

    if (!res.ok) {
      console.error('[apiSync] API error:', res.status, res.statusText);
      return { synced: 0, error: `API error ${res.status}` };
    }

    const data = await res.json();
    const db = getDb();
    let synced = 0;

    for (const apiMatch of data.matches || []) {
      const existing = db.prepare('SELECT * FROM matches WHERE external_id = ?').get(String(apiMatch.id));
      if (!existing) continue;

      let status = 'upcoming';
      if (['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(apiMatch.status)) status = 'live';
      else if (['FINISHED', 'AWARDED'].includes(apiMatch.status)) status = 'finished';

      let result = null;
      let scoreA = null;
      let scoreB = null;

      if (apiMatch.score && apiMatch.score.fullTime) {
        scoreA = apiMatch.score.fullTime.home;
        scoreB = apiMatch.score.fullTime.away;
        if (scoreA !== null && scoreB !== null && status === 'finished') {
          if (scoreA > scoreB) result = 'team_a';
          else if (scoreB > scoreA) result = 'team_b';
          else result = 'draw';
        }
      }

      db.prepare(`
        UPDATE matches SET status = ?, result = ?, score_a = ?, score_b = ?
        WHERE id = ?
      `).run(status, result, scoreA, scoreB, existing.id);

      if (status === 'finished' && result) {
        updateScoresForMatch(existing.id);
      }
      synced++;
    }

    return { synced };
  } catch (err) {
    console.error('[apiSync] Error:', err.message);
    return { synced: 0, error: err.message };
  }
}

module.exports = { syncMatchResults };
