const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1;   // FIFA World Cup on api-football.com
const WC_SEASON    = 2026;

// api-football round names → our DB round names
const ROUND_MAP = {
  'Round of 32':    'Round of 32',
  'Round of 16':    'Round of 16',
  'Quarter-finals': 'Quarterfinals',
  'Semi-finals':    'Semifinals',
  '3rd Place Final':'Third Place',
  'Final':          'Final',
};

// Fixes for codes that differ between api-football and our flag map
const CODE_FIXES = {
  'USA': 'USA', 'United States': 'USA',
  'South Korea': 'KOR', 'Korea Republic': 'KOR',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
  'Iran': 'IRN',
};

function toCode(team) {
  if (CODE_FIXES[team.name]) return CODE_FIXES[team.name];
  if (team.code && team.code.length === 3) return team.code.toUpperCase();
  return team.name.slice(0, 3).toUpperCase();
}

function apiStatusToDb(short) {
  if (['1H','2H','HT','ET','BT','P','SUSP','INT','LIVE'].includes(short)) return 'live';
  if (['FT','AET','PEN'].includes(short)) return 'finished';
  return 'upcoming';
}

async function syncKnockoutBracket(apiKey) {
  if (!apiKey) throw new Error('API_FOOTBALL_KEY is not set in environment variables');

  console.log('[syncKnockout] Fetching World Cup fixtures from api-football.com...');

  const res = await fetch(
    `${BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
    { headers: { 'x-apisports-key': apiKey, 'x-rapidapi-host': 'v3.football.api-sports.io' } }
  );

  if (!res.ok) throw new Error(`api-football returned HTTP ${res.status} — check your API_FOOTBALL_KEY`);

  const data = await res.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }

  const all = data.response || [];
  console.log(`[syncKnockout] Got ${all.length} total fixtures`);

  // Keep only knockout rounds
  const knockoutFixtures = all.filter(f => ROUND_MAP[f.league?.round]);
  console.log(`[syncKnockout] ${knockoutFixtures.length} knockout fixtures found`);

  if (knockoutFixtures.length === 0) {
    throw new Error('No knockout fixtures available yet — the bracket may not be drawn on api-football yet. Try again in a few hours.');
  }

  const db = getDb();
  let updated = 0;

  for (const [apiRound, dbRound] of Object.entries(ROUND_MAP)) {
    const apiMatches = knockoutFixtures
      .filter(f => f.league?.round === apiRound)
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (apiMatches.length === 0) continue;

    const dbMatches = db.prepare(
      'SELECT * FROM matches WHERE round = ? ORDER BY kickoff_time ASC'
    ).all(dbRound);

    const count = Math.min(apiMatches.length, dbMatches.length);
    console.log(`[syncKnockout] ${dbRound}: updating ${count} matches`);

    for (let i = 0; i < count; i++) {
      const api  = apiMatches[i];
      const dbm  = dbMatches[i];
      const home = api.teams.home;
      const away = api.teams.away;

      const status  = apiStatusToDb(api.fixture.status?.short || 'NS');
      const score_a = api.goals?.home ?? null;
      const score_b = api.goals?.away ?? null;

      let result = null;
      if (status === 'finished' && score_a !== null && score_b !== null) {
        result = score_a > score_b ? 'team_a' : score_b > score_a ? 'team_b' : 'draw';
      }

      db.prepare(`
        UPDATE matches SET
          external_id  = ?,
          team_a       = ?, team_b       = ?,
          team_a_code  = ?, team_b_code  = ?,
          kickoff_time = ?,
          status       = ?,
          result       = ?,
          score_a      = ?, score_b      = ?
        WHERE id = ?
      `).run(
        String(api.fixture.id),
        home.name, away.name,
        toCode(home), toCode(away),
        api.fixture.date,   // ISO 8601 with offset
        status, result, score_a, score_b,
        dbm.id
      );

      if (status === 'finished' && result) updateScoresForMatch(dbm.id);
      updated++;
    }
  }

  console.log(`[syncKnockout] Done — ${updated} matches updated`);
  return { updated, knockoutFixturesFound: knockoutFixtures.length };
}

module.exports = { syncKnockoutBracket };
