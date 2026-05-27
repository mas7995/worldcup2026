const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const MAX_PLAYERS = 8;

router.get('/', (req, res) => {
  const db = getDb();
  const players = db.prepare('SELECT id, name, created_at FROM players ORDER BY created_at ASC').all();
  res.json(players);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const trimmed = name.trim();
  if (trimmed.length > 30) {
    return res.status(400).json({ error: 'Name too long (max 30 chars)' });
  }

  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as cnt FROM players').get();
  if (count.cnt >= MAX_PLAYERS) {
    return res.status(400).json({ error: 'Game is full (max 8 players)' });
  }

  const existing = db.prepare('SELECT * FROM players WHERE LOWER(name) = LOWER(?)').get(trimmed);
  if (existing) {
    return res.status(400).json({ error: 'Name already taken' });
  }

  try {
    const result = db.prepare('INSERT INTO players (name) VALUES (?)').run(trimmed);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
