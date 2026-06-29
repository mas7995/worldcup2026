const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const VALID_PREDICTIONS = ['team_a', 'draw', 'team_b'];
const KNOCKOUT_ROUNDS = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Third Place', 'Final'];

router.get('/:playerId', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const predictions = db.prepare(`
    SELECT pr.*, m.team_a, m.team_b, m.team_a_code, m.team_b_code,
           m.kickoff_time, m.status, m.result, m.score_a, m.score_b, m.round, m.match_day
    FROM predictions pr
    JOIN matches m ON pr.match_id = m.id
    WHERE pr.player_id = ?
    ORDER BY m.kickoff_time ASC
  `).all(req.params.playerId);

  res.json(predictions);
});

router.post('/', (req, res) => {
  const { playerId, matchId, prediction } = req.body;

  if (!playerId || !matchId || !prediction) {
    return res.status(400).json({ error: 'playerId, matchId, and prediction are required' });
  }
  if (!VALID_PREDICTIONS.includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction. Must be team_a, draw, or team_b' });
  }

  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Can't pick a knockout slot whose teams aren't decided yet
  if (match.team_a_code === 'TBD' || match.team_b_code === 'TBD') {
    return res.status(400).json({ error: 'Teams for this match are not decided yet' });
  }
  // Knockout games can't end in a draw
  if (prediction === 'draw' && KNOCKOUT_ROUNDS.includes(match.round)) {
    return res.status(400).json({ error: 'Knockout games cannot be a draw — pick a team' });
  }

  // Check lock: predictions locked once match kicks off
  const now = new Date();
  const kickoff = new Date(match.kickoff_time);
  if (now >= kickoff) {
    return res.status(400).json({ error: 'Predictions are locked — match has already kicked off' });
  }

  const now_iso = now.toISOString();

  db.transaction(() => {
    const existing = db.prepare(
      'SELECT * FROM predictions WHERE player_id = ? AND match_id = ?'
    ).get(playerId, matchId);

    if (existing) {
      db.prepare(
        'UPDATE predictions SET prediction = ?, updated_at = ?, is_correct = NULL WHERE id = ?'
      ).run(prediction, now_iso, existing.id);
    } else {
      db.prepare(
        'INSERT INTO predictions (player_id, match_id, prediction, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(playerId, matchId, prediction, now_iso, now_iso);
    }

    db.prepare(
      'INSERT INTO prediction_audit (player_id, match_id, prediction, recorded_at) VALUES (?, ?, ?, ?)'
    ).run(playerId, matchId, prediction, now_iso);
  })();

  const saved = db.prepare(
    'SELECT * FROM predictions WHERE player_id = ? AND match_id = ?'
  ).get(playerId, matchId);

  res.json(saved);
});

module.exports = router;
