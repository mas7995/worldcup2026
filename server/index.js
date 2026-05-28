const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { syncMatchResults, syncByDate, getRequestCount } = require('./apiSync');
require('./db'); // init schema on startup

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/admin', require('./routes/admin'));

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── CRON: Live score sync ───────────────────────────────────────────────────
// Runs every 15 minutes but only calls the API when a match is actively
// in play: kicked off 0–115 minutes ago (90 min match + 25 min buffer).
// ~8 calls per match × 104 matches = ~830 total. Well within the 1500 budget.
cron.schedule('*/15 * * * *', async () => {
  const { getDb } = require('./db');
  const db = getDb();

  const activeNow = db.prepare(`
    SELECT COUNT(*) as cnt FROM matches
    WHERE status = 'live'
    OR (
      status = 'upcoming'
      AND kickoff_time <= datetime('now')
      AND kickoff_time >= datetime('now', '-115 minutes')
    )
  `).get();

  if (activeNow.cnt > 0) {
    console.log(`[cron] ${activeNow.cnt} match(es) in play — syncing live scores...`);
    const result = await syncMatchResults();
    console.log(`[cron] Live sync done: ${JSON.stringify(result)}`);
  }
});

// ─── CRON: Daily catch-up ────────────────────────────────────────────────────
// Runs once per day at 4 AM CT (= 9 AM UTC). Fetches yesterday's fixtures
// to catch any results the live sync may have missed (e.g. server was down).
// Cost: 1 call/day × ~38 match days = ~38 total.
cron.schedule('0 9 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  console.log(`[cron] Daily catch-up for ${dateStr}...`);
  const result = await syncByDate(dateStr);
  console.log(`[cron] Daily catch-up done: ${JSON.stringify(result)}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API requests used so far: ${getRequestCount()}`);

  // Auto-seed on startup (no-op if already seeded)
  try {
    require('./seed');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
});
