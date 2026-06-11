const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { updateScoresForMatch } = require('../scoring');
const { syncMatchResults, syncByDate, getRequestCount } = require('../apiSync');

const ADMIN_PIN = process.env.ADMIN_PIN || '2026';

function requirePin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.body?.pin;
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  next();
}

// Manually set/override match result
router.post('/result', requirePin, (req, res) => {
  const { matchId, result, scoreA, scoreB } = req.body;
  if (!matchId || !result) {
    return res.status(400).json({ error: 'matchId and result required' });
  }
  if (!['team_a', 'draw', 'team_b'].includes(result)) {
    return res.status(400).json({ error: 'Invalid result' });
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  db.prepare(`
    UPDATE matches SET result = ?, score_a = ?, score_b = ?, status = 'finished' WHERE id = ?
  `).run(result, scoreA ?? null, scoreB ?? null, matchId);

  updateScoresForMatch(matchId);

  res.json({ ok: true, matchId, result });
});

// Trigger API sync
router.post('/sync', requirePin, async (req, res) => {
  const result = await syncMatchResults();
  res.json(result);
});

// Get full audit trail
router.get('/audit', requirePin, (req, res) => {
  const db = getDb();
  const audit = db.prepare(`
    SELECT pa.*, p.name as player_name, m.team_a, m.team_b, m.round, m.kickoff_time
    FROM prediction_audit pa
    JOIN players p ON pa.player_id = p.id
    JOIN matches m ON pa.match_id = m.id
    ORDER BY pa.recorded_at DESC
    LIMIT 1000
  `).all();
  res.json(audit);
});

// API usage stats
router.get('/api-usage', requirePin, (req, res) => {
  const db = getDb();
  const total = getRequestCount();
  const recent = db.prepare(
    'SELECT endpoint, called_at, result FROM api_log ORDER BY called_at DESC LIMIT 50'
  ).all();
  res.json({ total, budget: 1500, remaining: 1500 - total, recent });
});

// Create a player (admin bypass — no cap, no self-registration flow)
router.post('/players', requirePin, (req, res) => {
  const { name, pin: playerPin } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const trimmed = String(name).trim();
  if (!/^\d{4}$/.test(String(playerPin || ''))) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(trimmed);
  if (existing) return res.status(400).json({ error: 'Name already taken' });
  const result = db.prepare('INSERT INTO players (name, pin) VALUES (?, ?)').run(trimmed, String(playerPin));
  const player = db.prepare('SELECT id, name, created_at FROM players WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(player);
});

// Set a prediction on behalf of a player (admin override — ignores kickoff lock)
router.post('/predictions', requirePin, (req, res) => {
  const { playerId, matchId, prediction } = req.body;
  if (!playerId || !matchId || !prediction) {
    return res.status(400).json({ error: 'playerId, matchId, and prediction are required' });
  }
  if (!['team_a', 'draw', 'team_b'].includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction' });
  }
  const db = getDb();
  if (!db.prepare('SELECT id FROM players WHERE id = ?').get(playerId)) {
    return res.status(404).json({ error: 'Player not found' });
  }
  if (!db.prepare('SELECT id FROM matches WHERE id = ?').get(matchId)) {
    return res.status(404).json({ error: 'Match not found' });
  }
  const now = new Date().toISOString();
  db.transaction(() => {
    const existing = db.prepare('SELECT id FROM predictions WHERE player_id = ? AND match_id = ?').get(playerId, matchId);
    if (existing) {
      db.prepare('UPDATE predictions SET prediction = ?, updated_at = ?, is_correct = NULL WHERE id = ?').run(prediction, now, existing.id);
    } else {
      db.prepare('INSERT INTO predictions (player_id, match_id, prediction, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(playerId, matchId, prediction, now, now);
    }
    db.prepare('INSERT INTO prediction_audit (player_id, match_id, prediction, recorded_at) VALUES (?, ?, ?, ?)').run(playerId, matchId, prediction, now);
  })();
  res.json({ ok: true });
});

router.patch('/players/:id/pin', requirePin, (req, res) => {
  const { newPin } = req.body;
  if (!newPin || !/^\d{4}$/.test(String(newPin))) {
    return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });
  }
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(String(newPin), req.params.id);
  res.json({ ok: true });
});

// Remove a player
router.delete('/players/:id', requirePin, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.transaction(() => {
    db.prepare('DELETE FROM prediction_audit WHERE player_id = ?').run(req.params.id);
    db.prepare('DELETE FROM reactions WHERE player_id = ?').run(req.params.id);
    db.prepare('DELETE FROM predictions WHERE player_id = ?').run(req.params.id);
    db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  })();

  res.json({ ok: true });
});

// Reset game (nuclear)
router.post('/reset', requirePin, (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET_CONFIRMED') {
    return res.status(400).json({ error: 'Send confirm: "RESET_CONFIRMED" to proceed' });
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM prediction_audit').run();
    db.prepare('DELETE FROM reactions').run();
    db.prepare('DELETE FROM predictions').run();
    db.prepare('DELETE FROM players').run();
    db.prepare("UPDATE matches SET status='upcoming', result=NULL, score_a=NULL, score_b=NULL").run();
  })();

  res.json({ ok: true, message: 'Game reset complete' });
});

// Update match kickoff or team names
router.patch('/matches/:id', requirePin, (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { team_a, team_b, team_a_code, team_b_code, kickoff_time, status } = req.body;
  const updates = {};
  if (team_a) updates.team_a = team_a;
  if (team_b) updates.team_b = team_b;
  if (team_a_code) updates.team_a_code = team_a_code;
  if (team_b_code) updates.team_b_code = team_b_code;
  if (kickoff_time) updates.kickoff_time = kickoff_time;
  if (status) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE matches SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);

  const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Get all matches for admin view
router.get('/matches', requirePin, (req, res) => {
  const db = getDb();
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_time ASC').all();
  res.json(matches);
});

module.exports = router;
