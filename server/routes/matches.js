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

  // Knockout rounds
  const knockout = {};
  for (const r of KNOCKOUT_ROUNDS) {
    knockout[r] = all.filter(m => m.round === r);
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
