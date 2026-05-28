const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const MAX_PLAYERS = 8;

// Never return pin in list responses
router.get('/', (req, res) => {
  const db = getDb();
  const players = db.prepare('SELECT id, name, created_at FROM players ORDER BY created_at ASC').all();
  res.json(players);
});

// Register a new player with a PIN
router.post('/', (req, res) => {
  const { name, pin } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!pin || String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
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

  const existing = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(trimmed);
  if (existing) {
    return res.status(400).json({ error: 'Name already taken' });
  }

  try {
    const result = db.prepare('INSERT INTO players (name, pin) VALUES (?, ?)').run(trimmed, String(pin));
    const player = db.prepare('SELECT id, name, created_at FROM players WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Verify a player's PIN — used on login
router.post('/verify', (req, res) => {
  const { playerId, pin } = req.body;
  if (!playerId || !pin) {
    return res.status(400).json({ error: 'playerId and pin required' });
  }

  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Players created before PINs were added have null pin — allow login once, prompt to set
  if (player.pin === null) {
    return res.json({ id: player.id, name: player.name, created_at: player.created_at, needsPin: true });
  }

  if (String(pin) !== String(player.pin)) {
    return res.status(401).json({ error: 'Wrong PIN' });
  }

  res.json({ id: player.id, name: player.name, created_at: player.created_at });
});

// Set or update a player's own PIN (requires current PIN or none if not yet set)
router.patch('/:id/pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!newPin || !/^\d{4}$/.test(String(newPin))) {
    return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });
  }

  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // If they already have a PIN, require the current one
  if (player.pin !== null && String(currentPin) !== String(player.pin)) {
    return res.status(401).json({ error: 'Current PIN is wrong' });
  }

  db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(String(newPin), req.params.id);
  res.json({ ok: true });
});

module.exports = router;
