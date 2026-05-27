const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const ALLOWED_EMOJIS = ['🎉','😭','🤡','🔥','😤','🏆','💀','🤣','😮','👏','🐐','💔'];

router.get('/:matchId', (req, res) => {
  const db = getDb();
  const reactions = db.prepare(`
    SELECT r.*, p.name as player_name
    FROM reactions r
    JOIN players p ON r.player_id = p.id
    WHERE r.match_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.matchId);
  res.json(reactions);
});

router.post('/', (req, res) => {
  const { playerId, matchId, emoji } = req.body;
  if (!playerId || !matchId || !emoji) {
    return res.status(400).json({ error: 'playerId, matchId, emoji required' });
  }

  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Upsert: one reaction per player per match
  const existing = db.prepare(
    'SELECT * FROM reactions WHERE player_id = ? AND match_id = ?'
  ).get(playerId, matchId);

  if (existing) {
    db.prepare('UPDATE reactions SET emoji = ?, created_at = datetime("now") WHERE id = ?')
      .run(emoji, existing.id);
  } else {
    db.prepare('INSERT INTO reactions (player_id, match_id, emoji) VALUES (?, ?, ?)')
      .run(playerId, matchId, emoji);
  }

  const saved = db.prepare(
    'SELECT r.*, p.name as player_name FROM reactions r JOIN players p ON r.player_id = p.id WHERE r.player_id = ? AND r.match_id = ?'
  ).get(playerId, matchId);

  res.json(saved);
});

module.exports = router;
