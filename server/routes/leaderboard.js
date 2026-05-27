const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../scoring');
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const playerCount = db.prepare('SELECT COUNT(*) as cnt FROM players').get().cnt;
  const potValue = playerCount * 50;
  const board = getLeaderboard();
  res.json({ leaderboard: board, potValue, playerCount });
});

module.exports = router;
