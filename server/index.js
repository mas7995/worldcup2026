require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { getDb } = require('./db');
const { reseed } = require('./reseed');
const { syncFromApiFootball } = require('./syncAll');

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

// ─── CRON: Auto-sync from api-football.com every 20 min ─────────────────────
// 72 calls/day max — well within the 100/day free tier
cron.schedule('*/20 * * * *', async () => {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return; // no key configured, skip silently
  try {
    const result = await syncFromApiFootball(apiKey);
    if (!result.skipped) {
      console.log(`[cron] api-football sync: group=${result.groupUpdated}, knockout=${result.knockoutUpdated}, calls today=${result.callsToday}`);
    }
  } catch (err) {
    console.error('[cron] api-football sync error:', err.message);
  }
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
        require('./seed').seed();
      }
    } else {
      console.warn('[startup] No WORLDCUP_API_KEY set — loading placeholder schedule.');
      require('./seed').seed();
    }
  } else {
    console.log(`[startup] Database has ${matchCount} matches — skipping seed.`);
  }

  // Kick off an api-football.com sync shortly after startup
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (apiKey) {
    setTimeout(async () => {
      try {
        console.log('[startup] Running initial api-football.com sync...');
        const result = await syncFromApiFootball(apiKey);
        if (!result.skipped) {
          console.log(`[startup] Initial sync done: group=${result.groupUpdated}, knockout=${result.knockoutUpdated}`);
        }
      } catch (err) {
        console.error('[startup] Initial sync error:', err.message);
      }
    }, 5000);
  } else {
    console.warn('[startup] API_FOOTBALL_KEY not set — auto-sync disabled. Add it to env vars to enable.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
