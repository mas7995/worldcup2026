const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const { round, status } = req.query;

  let query = 'SELECT * FROM matches WHERE 1=1';
  const params = [];

  if (round) {
    query += ' AND round = ?';
    params.push(round);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY kickoff_time ASC';
  const matches = db.prepare(query).all(...params);
  res.json(matches);
});

router.get('/bracket', (req, res) => {
  const db = getDb();
  const all = db.prepare('SELECT * FROM matches ORDER BY kickoff_time ASC').all();

  const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const KNOCKOUT_ROUNDS = ['Round of 32','Round of 16','Quarterfinals','Semifinals','Third Place','Final'];

  // Build group standings
  const groups = {};
  for (const g of GROUPS) {
    const label = `Group ${g}`;
    const matches = all.filter(m => m.round === label);
    const teams = {};

    for (const m of matches) {
      for (const side of ['a','b']) {
        const name = m[`team_${side}`];
        const code = m[`team_${side}_code`];
        if (!teams[name]) teams[name] = { team: name, code, p:0, w:0, d:0, l:0, gf:0, ga:0 };
      }
      if (m.result && m.status === 'finished') {
        const ta = teams[m.team_a], tb = teams[m.team_b];
        ta.p++; tb.p++;
        if (m.score_a !== null) { ta.gf += m.score_a; ta.ga += m.score_b; tb.gf += m.score_b; tb.ga += m.score_a; }
        if (m.result === 'team_a') { ta.w++; tb.l++; }
        else if (m.result === 'team_b') { tb.w++; ta.l++; }
        else { ta.d++; tb.d++; }
      }
    }

    const standings = Object.values(teams).map(t => ({
      ...t, gd: t.gf - t.ga, pts: t.w * 3 + t.d
    })).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    groups[g] = { matches, standings };
  }

  // Knockout rounds — with projected opponents for undecided slots.
  // Each knockout match stores its bracket_num and the source refs (e.g. "W74"
  // = winner of match 74). For a slot whose team isn't known yet, look up the
  // feeder match and project its two teams so the UI can show "Winner of X/Y".
  const byNum = {};
  for (const m of all) if (m.bracket_num != null) byNum[m.bracket_num] = m;

  function sideProjection(srcRef) {
    const mm = /^([WL])(\d+)$/.exec(srcRef || '');
    if (!mm) return null;
    const type = mm[1] === 'W' ? 'Winner' : 'Loser';
    const feeder = byNum[Number(mm[2])];
    if (!feeder) return { type, a: null, b: null };
    const a = feeder.team_a_code && feeder.team_a_code !== 'TBD'
      ? { name: feeder.team_a, code: feeder.team_a_code } : null;
    const b = feeder.team_b_code && feeder.team_b_code !== 'TBD'
      ? { name: feeder.team_b, code: feeder.team_b_code } : null;
    return { type, a, b };
  }

  const knockout = {};
  for (const r of KNOCKOUT_ROUNDS) {
    knockout[r] = all.filter(m => m.round === r).map(m => {
      const out = { ...m };
      if ((!m.team_a_code || m.team_a_code === 'TBD') && m.src_a) out.proj_a = sideProjection(m.src_a);
      if ((!m.team_b_code || m.team_b_code === 'TBD') && m.src_b) out.proj_b = sideProjection(m.src_b);
      return out;
    });
  }

  res.json({ groups, knockout });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const reactions = db.prepare(`
    SELECT r.*, p.name as player_name
    FROM reactions r
    JOIN players p ON r.player_id = p.id
    WHERE r.match_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  res.json({ ...match, reactions });
});

module.exports = router;
