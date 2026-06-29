const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;
const DAILY_LIMIT = 90; // stay under 100/day free tier

// api-football.com name → our DB name
const NAME_MAP = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  "Côte d'Ivoire": 'Ivory Coast',
  'IR Iran': 'Iran',
  'China PR': 'China',
  'Indonesia': 'Indonesia',
};

function normalize(name) {
  return NAME_MAP[name] || name;
}

const CODE_FIXES = {
  'United States': 'USA', 'USA': 'USA',
  'Korea Republic': 'KOR', 'South Korea': 'KOR',
  "Côte d'Ivoire": 'CIV', 'Ivory Coast': 'CIV',
  'IR Iran': 'IRN', 'Iran': 'IRN',
};

function toCode(team) {
  if (CODE_FIXES[team.name]) return CODE_FIXES[team.name];
  if (team.code && team.code.length === 3) return team.code.toUpperCase();
  return team.name.slice(0, 3).toUpperCase();
}

function apiStatus(short) {
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(short)) return 'live';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  return 'upcoming';
}

const KNOCKOUT_ROUNDS = {
  'Round of 32':    'Round of 32',
  'Round of 16':    'Round of 16',
  'Quarter-finals': 'Quarterfinals',
  'Semi-finals':    'Semifinals',
  '3rd Place Final':'Third Place',
  'Final':          'Final',
};

function getApiFootballCallsToday() {
  const db = getDb();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  return db.prepare(
    "SELECT COUNT(*) as cnt FROM api_log WHERE endpoint LIKE 'apifootball:%' AND called_at >= ?"
  ).get(dayStart.toISOString()).cnt;
}

function logCall(result) {
  try {
    getDb().prepare("INSERT INTO api_log (endpoint, result) VALUES (?, ?)").run(
      'apifootball:fixtures', result
    );
  } catch {}
}

// Insert group stage matches that are missing from the DB.
// This fixes partial DB population (e.g., worldcupapi.com failed for some groups).
function ensureGroupStageComplete() {
  const { SEED_MATCHES } = require('./seed');
  const db = getDb();
  let added = 0;

  for (const m of SEED_MATCHES.filter(x => x.round && x.round.startsWith('Group '))) {
    const existing = db.prepare(`
      SELECT id FROM matches WHERE round = ? AND (
        (LOWER(team_a) = LOWER(?) AND LOWER(team_b) = LOWER(?))
        OR (LOWER(team_a) = LOWER(?) AND LOWER(team_b) = LOWER(?))
      )
    `).get(m.round, m.team_a, m.team_b, m.team_b, m.team_a);

    if (!existing) {
      db.prepare(`
        INSERT INTO matches (round, match_day, team_a, team_b, team_a_code, team_b_code, kickoff_time, status)
        VALUES (@round, @match_day, @team_a, @team_b, @team_a_code, @team_b_code, @kickoff_time, 'upcoming')
      `).run(m);
      added++;
    }
  }

  if (added > 0) console.log(`[ensureGroupStage] Inserted ${added} missing group stage matches`);
  return added;
}

// Full sync from api-football.com: group stage results + knockout bracket teams/results.
async function syncFromApiFootball(apiKey) {
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not set');

  const callsToday = getApiFootballCallsToday();
  if (callsToday >= DAILY_LIMIT) {
    console.log(`[syncAll] Daily limit reached (${callsToday}/${DAILY_LIMIT}). Skipping.`);
    return { skipped: true, reason: 'daily limit', callsToday };
  }

  console.log(`[syncAll] Fetching from api-football.com (call ${callsToday + 1}/${DAILY_LIMIT} today)...`);

  const res = await fetch(
    `${BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
    { headers: { 'x-apisports-key': apiKey, 'x-rapidapi-host': 'v3.football.api-sports.io' } }
  );

  if (!res.ok) {
    logCall(`error:${res.status}`);
    throw new Error(`api-football returned HTTP ${res.status} — check your API_FOOTBALL_KEY`);
  }

  const data = await res.json();
  logCall('ok');

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }

  const all = data.response || [];
  const db = getDb();
  let groupUpdated = 0, knockoutUpdated = 0;

  // === Group stage: match by team names, update results + kickoff times ===
  for (const fixture of all) {
    if (KNOCKOUT_ROUNDS[fixture.league?.round]) continue;

    const homeTeam = fixture.teams?.home;
    const awayTeam = fixture.teams?.away;
    if (!homeTeam || !awayTeam) continue;

    const homeN = normalize(homeTeam.name);
    const awayN = normalize(awayTeam.name);

    const dbMatch = db.prepare(`
      SELECT * FROM matches WHERE
        (LOWER(team_a) = LOWER(?) AND LOWER(team_b) = LOWER(?))
        OR (LOWER(team_a) = LOWER(?) AND LOWER(team_b) = LOWER(?))
    `).get(homeN, awayN, awayN, homeN);

    if (!dbMatch) continue;

    const status = apiStatus(fixture.fixture?.status?.short || 'NS');
    const homeGoals = fixture.goals?.home ?? null;
    const awayGoals = fixture.goals?.away ?? null;

    const teamAIsHome = dbMatch.team_a.toLowerCase() === homeN.toLowerCase();
    const score_a = teamAIsHome ? homeGoals : awayGoals;
    const score_b = teamAIsHome ? awayGoals : homeGoals;

    let result = null;
    if (status === 'finished' && score_a !== null && score_b !== null) {
      result = score_a > score_b ? 'team_a' : score_b > score_a ? 'team_b' : 'draw';
    }

    db.prepare(`
      UPDATE matches SET
        external_id  = ?,
        kickoff_time = ?,
        status       = ?,
        result       = ?,
        score_a      = ?,
        score_b      = ?
      WHERE id = ?
    `).run(String(fixture.fixture.id), fixture.fixture.date, status, result, score_a, score_b, dbMatch.id);

    if (status === 'finished' && result) updateScoresForMatch(dbMatch.id);
    groupUpdated++;
  }

  // === Knockout: positional match — update teams + results ===
  const knockoutFixtures = all.filter(f => KNOCKOUT_ROUNDS[f.league?.round]);

  for (const [apiRound, dbRound] of Object.entries(KNOCKOUT_ROUNDS)) {
    const roundFixtures = knockoutFixtures
      .filter(f => f.league?.round === apiRound)
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (roundFixtures.length === 0) continue;

    const dbMatches = db.prepare(
      'SELECT * FROM matches WHERE round = ? ORDER BY kickoff_time ASC'
    ).all(dbRound);

    const count = Math.min(roundFixtures.length, dbMatches.length);

    for (let i = 0; i < count; i++) {
      const api = roundFixtures[i];
      const dbm = dbMatches[i];
      const home = api.teams.home;
      const away = api.teams.away;
      const status = apiStatus(api.fixture?.status?.short || 'NS');
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
        api.fixture.date,
        status, result, score_a, score_b,
        dbm.id
      );

      if (status === 'finished' && result) updateScoresForMatch(dbm.id);
      knockoutUpdated++;
    }
  }

  console.log(`[syncAll] Done — group: ${groupUpdated}, knockout: ${knockoutUpdated}, total fixtures: ${all.length}`);
  return {
    groupUpdated,
    knockoutUpdated,
    totalFixtures: all.length,
    callsToday: callsToday + 1,
    dailyLimit: DAILY_LIMIT,
  };
}

module.exports = { ensureGroupStageComplete, syncFromApiFootball, getApiFootballCallsToday };
