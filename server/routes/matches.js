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
