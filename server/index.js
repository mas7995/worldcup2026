require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { getDb } = require('./db');
const { syncMatchResults, syncByDate, getRequestCount } = require('./apiSync');
const { reseed } = require('./reseed');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/admin', require('./routes/admin'));

const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── CRON: Live score sync ───────────────────────────────────────────────────
// Every 15 min, only fires when a match is actively in play (0–115 min after kickoff)
cron.schedule('*/15 * * * *', async () => {
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
    console.log(`[cron] ${activeNow.cnt} match(es) in play — syncing...`);
    const result = await syncMatchResults();
    console.log(`[cron] Sync done: ${JSON.stringify(result)}`);
  }
});

// ─── CRON: Daily catch-up ────────────────────────────────────────────────────
// 4 AM CT (9 AM UTC) — picks up any results missed while server was idle
cron.schedule('0 9 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const result = await syncByDate(yesterday.toISOString().slice(0, 10));
  console.log(`[cron] Daily catch-up: ${JSON.stringify(result)}`);
});

// ─── STARTUP ─────────────────────────────────────────────────────────────────
async function start() {
  const db = getDb();
  const matchCount = db.prepare('SELECT COUNT(*) as cnt FROM matches').get().cnt;

  if (matchCount === 0) {
    if (process.env.WORLDCUP_API_KEY) {
      console.log('[startup] Empty database — fetching real schedule from worldcupapi.com...');
      try {
        await reseed();
      } catch (err) {
        console.error('[startup] Reseed failed:', err.message);
        console.warn('[startup] Falling back to placeholder schedule.');
        require('./seed');
      }
    } else {
      console.warn('[startup] No WORLDCUP_API_KEY set — loaded placeholder schedule.');
      console.warn('[startup] Add WORLDCUP_API_KEY to server/.env and delete the DB to get real fixtures.');
      require('./seed');
    }
  } else {
    console.log(`[startup] Database has ${matchCount} matches — skipping seed.`);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API requests used: ${getRequestCount()}`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
