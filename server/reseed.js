require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fetch = require('node-fetch');
const { getDb } = require('./db');

const BASE_URL = 'https://api.worldcupapi.com';
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const TEAM_CODES = {
  'Canada': 'CAN', 'Mexico': 'MEX', 'United States': 'USA', 'USA': 'USA',
  'Costa Rica': 'CRC', 'Cuba': 'CUB', 'Guatemala': 'GUA', 'Haiti': 'HAI',
  'Honduras': 'HON', 'Jamaica': 'JAM', 'Panama': 'PAN', 'Trinidad and Tobago': 'TRI',
  'Curacao': 'CUW',
  'Argentina': 'ARG', 'Bolivia': 'BOL', 'Brazil': 'BRA', 'Chile': 'CHI',
  'Colombia': 'COL', 'Ecuador': 'ECU', 'Paraguay': 'PAR', 'Peru': 'PER',
  'Uruguay': 'URU', 'Venezuela': 'VEN',
  'Austria': 'AUT', 'Belgium': 'BEL', 'Croatia': 'CRO', 'Czech Republic': 'CZE',
  'Denmark': 'DEN', 'England': 'ENG', 'France': 'FRA', 'Germany': 'GER',
  'Hungary': 'HUN', 'Italy': 'ITA', 'Netherlands': 'NED', 'Norway': 'NOR',
  'Poland': 'POL', 'Portugal': 'POR', 'Romania': 'ROU', 'Scotland': 'SCO',
  'Serbia': 'SRB', 'Slovakia': 'SVK', 'Slovenia': 'SVN', 'Spain': 'ESP',
  'Sweden': 'SWE', 'Switzerland': 'SUI', 'Turkey': 'TUR', 'Ukraine': 'UKR',
  'Wales': 'WAL',
  'Algeria': 'ALG', 'Cameroon': 'CMR', 'Cape Verde': 'CPV', 'Egypt': 'EGY',
  'Ghana': 'GHA', 'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
  'Morocco': 'MAR', 'Nigeria': 'NGA', 'Senegal': 'SEN', 'South Africa': 'RSA',
  'Tunisia': 'TUN',
  'Australia': 'AUS', 'China': 'CHN', 'Indonesia': 'IDN', 'Iran': 'IRN',
  'Iraq': 'IRQ', 'Japan': 'JPN', 'Jordan': 'JOR', 'New Zealand': 'NZL',
  'Qatar': 'QAT', 'Saudi Arabia': 'KSA', 'South Korea': 'KOR',
  'Uzbekistan': 'UZB',
};

function toCode(name) {
  return TEAM_CODES[name] || name.slice(0, 3).toUpperCase();
}

function logApiCall(endpoint, result) {
  try {
    getDb().prepare('INSERT INTO api_log (endpoint, result) VALUES (?, ?)').run(endpoint, result);
  } catch {}
}

async function fetchGroup(apiKey, group) {
  const res = await fetch(`${BASE_URL}/fixtures?key=${apiKey}&group=${group}`);
  logApiCall(`fixtures?group=${group}`, res.ok ? 'ok' : `error:${res.status}`);
  if (!res.ok) throw new Error(`Group ${group}: HTTP ${res.status}`);
  const data = await res.json();
  const fixtures = Array.isArray(data) ? data : (data.data || data.fixtures || []);

  return fixtures.map(m => ({
    external_id: String(m.id),
    round: `Group ${group}`,
    match_day: `MD${m.round}`,
    team_a: m.home.name,
    team_b: m.away.name,
    team_a_code: toCode(m.home.name),
    team_b_code: toCode(m.away.name),
    kickoff_time: `${m.date}T${m.time}Z`,
    status: 'upcoming',
  }));
}

const KNOCKOUT_PLACEHOLDERS = [
  ...Array.from({ length: 16 }, (_, i) => ({
    external_id: null, round: 'Round of 32', match_day: null,
    team_a: `R32-${i+1}A`, team_b: `R32-${i+1}B`,
    team_a_code: 'TBD', team_b_code: 'TBD',
    kickoff_time: `2026-07-0${4 + Math.floor(i/2)}T22:00:00Z`, status: 'upcoming',
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    external_id: null, round: 'Round of 16', match_day: null,
    team_a: `R16-${i+1}A`, team_b: `R16-${i+1}B`,
    team_a_code: 'TBD', team_b_code: 'TBD',
    kickoff_time: `2026-07-${13 + Math.floor(i/2)}T22:00:00Z`, status: 'upcoming',
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    external_id: null, round: 'Quarterfinals', match_day: null,
    team_a: `QF-${i+1}A`, team_b: `QF-${i+1}B`,
    team_a_code: 'TBD', team_b_code: 'TBD',
    kickoff_time: `2026-07-${18 + Math.floor(i/2)}T22:00:00Z`, status: 'upcoming',
  })),
  { external_id: null, round: 'Semifinals', match_day: null, team_a: 'SF-1A', team_b: 'SF-1B', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-14T22:00:00Z', status: 'upcoming' },
  { external_id: null, round: 'Semifinals', match_day: null, team_a: 'SF-2A', team_b: 'SF-2B', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-15T22:00:00Z', status: 'upcoming' },
  { external_id: null, round: 'Third Place', match_day: null, team_a: 'TBD', team_b: 'TBD', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-18T22:00:00Z', status: 'upcoming' },
  { external_id: null, round: 'Final', match_day: null, team_a: 'TBD', team_b: 'TBD', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-19T22:00:00Z', status: 'upcoming' },
];

async function reseed(apiKey) {
  const key = apiKey || process.env.WORLDCUP_API_KEY;
  if (!key) throw new Error('WORLDCUP_API_KEY not set');

  console.log('[reseed] Fetching real fixtures from worldcupapi.com...');
  const allGroupMatches = [];

  for (const group of GROUPS) {
    try {
      const matches = await fetchGroup(key, group);
      console.log(`[reseed]   Group ${group}: ${matches.length} matches`);
      allGroupMatches.push(...matches);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[reseed]   Group ${group} FAILED: ${err.message}`);
    }
  }

  if (allGroupMatches.length === 0) {
    throw new Error('No group matches fetched — check your API key');
  }

  const allMatches = [...allGroupMatches, ...KNOCKOUT_PLACEHOLDERS];
  const db = getDb();

  db.transaction(() => {
    const predCount = db.prepare('SELECT COUNT(*) as cnt FROM predictions').get().cnt;
    if (predCount > 0) {
      console.log(`[reseed] Clearing ${predCount} existing predictions (match IDs are changing)`);
      db.prepare('DELETE FROM prediction_audit').run();
      db.prepare('DELETE FROM reactions').run();
      db.prepare('DELETE FROM predictions').run();
    }
    db.prepare('DELETE FROM matches').run();

    const insert = db.prepare(`
      INSERT INTO matches (external_id, round, match_day, team_a, team_b, team_a_code, team_b_code, kickoff_time, status)
      VALUES (@external_id, @round, @match_day, @team_a, @team_b, @team_a_code, @team_b_code, @kickoff_time, @status)
    `);
    for (const m of allMatches) insert.run(m);
  })();

  console.log(`[reseed] Done — ${allGroupMatches.length} group matches + ${KNOCKOUT_PLACEHOLDERS.length} knockout placeholders`);
  return allMatches.length;
}

// Allow running directly: node server/reseed.js
if (require.main === module) {
  reseed().then(count => {
    console.log(`Inserted ${count} matches.`);
    process.exit(0);
  }).catch(err => {
    console.error('Reseed failed:', err.message);
    process.exit(1);
  });
}

module.exports = { reseed };
