const fetch = require('node-fetch');
const { getDb } = require('./db');
const { updateScoresForMatch } = require('./scoring');

// openfootball: free, public-domain, no API key required.
// https://github.com/openfootball/worldcup.json
const SOURCE_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// openfootball round name → our DB round name
const KNOCKOUT_MAP = {
  'Round of 32':           'Round of 32',
  'Round of 16':           'Round of 16',
  'Quarter-final':         'Quarterfinals',
  'Semi-final':            'Semifinals',
  'Match for third place': 'Third Place',
  'Final':                 'Final',
};

// Full team name (as openfootball spells them) → 3-letter code for flags
const TEAM_CODES = {
  'Mexico': 'MEX', 'Canada': 'CAN', 'USA': 'USA', 'United States': 'USA',
  'Costa Rica': 'CRC', 'Panama': 'PAN', 'Honduras': 'HON', 'Jamaica': 'JAM',
  'Argentina': 'ARG', 'Brazil': 'BRA', 'Chile': 'CHI', 'Colombia': 'COL',
  'Ecuador': 'ECU', 'Paraguay': 'PAR', 'Peru': 'PER', 'Uruguay': 'URU',
  'Venezuela': 'VEN', 'Bolivia': 'BOL', 'Cape Verde': 'CPV',
  'Austria': 'AUT', 'Belgium': 'BEL', 'Croatia': 'CRO', 'Czech Republic': 'CZE',
  'Czechia': 'CZE', 'Denmark': 'DEN', 'England': 'ENG', 'France': 'FRA',
  'Germany': 'GER', 'Hungary': 'HUN', 'Italy': 'ITA', 'Netherlands': 'NED',
  'Norway': 'NOR', 'Poland': 'POL', 'Portugal': 'POR', 'Romania': 'ROU',
  'Scotland': 'SCO', 'Serbia': 'SRB', 'Slovakia': 'SVK', 'Slovenia': 'SVN',
  'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI', 'Turkey': 'TUR',
  'Türkiye': 'TUR', 'Ukraine': 'UKR', 'Wales': 'WAL',
  'Bosnia & Herzegovina': 'BIH', 'Bosnia and Herzegovina': 'BIH',
  'Algeria': 'ALG', 'Cameroon': 'CMR', 'Egypt': 'EGY', 'Ghana': 'GHA',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV', 'Morocco': 'MAR',
  'Nigeria': 'NGA', 'Senegal': 'SEN', 'South Africa': 'RSA', 'Tunisia': 'TUN',
  'DR Congo': 'COD', 'Congo DR': 'COD',
  'Australia': 'AUS', 'China': 'CHN', 'China PR': 'CHN', 'Indonesia': 'IDN',
  'Iran': 'IRN', 'IR Iran': 'IRN', 'Iraq': 'IRQ', 'Japan': 'JPN',
  'Jordan': 'JOR', 'New Zealand': 'NZL', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA',
  'South Korea': 'KOR', 'Korea Republic': 'KOR', 'Uzbekistan': 'UZB',
};

function toCode(name) {
  if (TEAM_CODES[name]) return TEAM_CODES[name];
  return name.slice(0, 3).toUpperCase();
}

// A team slot is still a placeholder if it looks like "W74", "L101", "1A", "Winner ..."
function isPlaceholder(name) {
  if (!name) return true;
  return /^[WL]\d+$/.test(name) || /^\d[A-L]$/.test(name) ||
         /winner|runner|loser|best|third/i.test(name);
}

// openfootball time is local with offset, e.g. "12:00 UTC-7" → build a proper ISO UTC string
function toIsoUtc(date, time) {
  if (!time) return `${date}T12:00:00Z`;
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/i);
  if (!m) return `${date}T12:00:00Z`;
  const [, hh, mm, off] = m;
  const sign = off[0];
  const offHours = String(Math.abs(parseInt(off, 10))).padStart(2, '0');
  const iso = `${date}T${hh.padStart(2, '0')}:${mm}:00${sign}${offHours}:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return `${date}T12:00:00Z`;
  return d.toISOString();
}

// Update knockout bracket (Round of 32 → Final) from openfootball.
// Group stage is intentionally left untouched to preserve existing predictions/history.
async function syncKnockoutFromOpenFootball() {
  console.log('[openfootball] Fetching real World Cup schedule...');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`openfootball returned HTTP ${res.status}`);

  const data = await res.json();
  const all = data.matches || [];
  const knockout = all.filter(m => KNOCKOUT_MAP[m.round]);

  if (knockout.length === 0) {
    throw new Error('No knockout matches found in openfootball data yet.');
  }

  const db = getDb();
  let updated = 0;

  // ── Resolve the bracket forward ──────────────────────────────────────────
  // Each knockout match has a `num` (73–104). Later rounds reference earlier
  // matches as "W74" (winner of match 74) or "L101" (loser of match 101).
  // openfootball does NOT substitute team names into these slots, so we do it
  // here: process matches in num order, compute each winner/loser, and feed
  // them into the slots of subsequent rounds.
  const byNum = {};
  for (const m of knockout) {
    byNum[m.num] = { ...m, _iso: toIsoUtc(m.date, m.time) };
  }

  function resolveRef(ref) {
    const w = /^W(\d+)$/.exec(ref);
    if (w && byNum[w[1]] && byNum[w[1]]._winner) return byNum[w[1]]._winner;
    const l = /^L(\d+)$/.exec(ref);
    if (l && byNum[l[1]] && byNum[l[1]]._loser) return byNum[l[1]]._loser;
    return ref; // a real team name, or a slot we can't resolve yet
  }

  // Winner from a score, deciding ties via extra time (et) then penalties (p).
  function decide(score) {
    if (!score || !Array.isArray(score.ft)) return null;
    const d = score.p || score.et || score.ft;
    if (d[0] > d[1]) return 1;
    if (d[1] > d[0]) return 2;
    return 0; // tie with no decider — knockout shouldn't end here
  }

  const numsAsc = Object.keys(byNum).map(Number).sort((a, b) => a - b);
  for (const num of numsAsc) {
    const m = byNum[num];
    m._t1 = resolveRef(m.team1);
    m._t2 = resolveRef(m.team2);
    const w = decide(m.score);
    if (w === 1)      { m._winner = m._t1; m._loser = m._t2; }
    else if (w === 2) { m._winner = m._t2; m._loser = m._t1; }
  }

  // ── Write resolved data into the DB (positionally, per round) ─────────────
  for (const [ofRound, dbRound] of Object.entries(KNOCKOUT_MAP)) {
    const ofMatches = knockout
      .map(m => byNum[m.num])
      .filter(m => m.round === ofRound)
      .sort((a, b) => new Date(a._iso) - new Date(b._iso));

    if (ofMatches.length === 0) continue;

    const dbMatches = db.prepare(
      'SELECT * FROM matches WHERE round = ? ORDER BY kickoff_time ASC'
    ).all(dbRound);

    const count = Math.min(ofMatches.length, dbMatches.length);

    for (let i = 0; i < count; i++) {
      const of = ofMatches[i];
      const dbm = dbMatches[i];

      // Use resolved team names; only overwrite when a real team is known,
      // otherwise keep the existing label but still correct the kickoff date.
      const team1Real = !isPlaceholder(of._t1);
      const team2Real = !isPlaceholder(of._t2);

      const team_a = team1Real ? of._t1 : dbm.team_a;
      const team_b = team2Real ? of._t2 : dbm.team_b;
      const team_a_code = team1Real ? toCode(of._t1) : dbm.team_a_code;
      const team_b_code = team2Real ? toCode(of._t2) : dbm.team_b_code;

      // Score / result
      let status, score_a, score_b, result;
      const w = decide(of.score);
      if (of.score && Array.isArray(of.score.ft) && w !== null && w !== 0) {
        // Final score with a decisive winner — display regulation (ft) score
        score_a = of.score.ft[0];
        score_b = of.score.ft[1];
        result = w === 1 ? 'team_a' : 'team_b';
        status = 'finished';
      } else if (dbm.result) {
        // A result was already set (e.g. entered manually, or a tie openfootball
        // hasn't resolved yet) — preserve it, never clobber.
        status = dbm.status;
        result = dbm.result;
        score_a = dbm.score_a;
        score_b = dbm.score_b;
      } else if (new Date(of._iso) <= new Date() && new Date(of._iso) >= new Date(Date.now() - 4 * 3600 * 1000)) {
        status = 'live';
        score_a = null; score_b = null; result = null;
      } else {
        status = 'upcoming';
        score_a = null; score_b = null; result = null;
      }

      db.prepare(`
        UPDATE matches SET
          team_a = ?, team_b = ?,
          team_a_code = ?, team_b_code = ?,
          kickoff_time = ?,
          status = ?,
          result = ?,
          score_a = ?, score_b = ?
        WHERE id = ?
      `).run(team_a, team_b, team_a_code, team_b_code, of._iso, status, result, score_a, score_b, dbm.id);

      if (status === 'finished' && result) updateScoresForMatch(dbm.id);
      updated++;
    }
  }

  console.log(`[openfootball] Done — ${updated} knockout matches updated`);
  return { updated, source: 'openfootball/worldcup.json' };
}

module.exports = { syncKnockoutFromOpenFootball };
